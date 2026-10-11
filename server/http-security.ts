import {
  Catch,
  HttpException,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import type { PrismaClient } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";

@Catch()
export class SafeErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const content = error instanceof HttpException ? error.getResponse() : null;
    const requestId = randomUUID();
    // Never log headers, access tokens, passwords, request bodies, or connection strings.
    if (status >= 500)
      console.error(
        JSON.stringify({ event: "request_failed", status, requestId }),
      );
    response
      .status(status)
      .json({
        ...(typeof content === "object" ? content : {}),
        message:
          typeof content === "string"
            ? content
            : typeof content === "object" && content && "message" in content
              ? content.message
              : "We could not complete this request. Please try again.",
        requestId,
      });
  }
}

// Database-backed limits survive restarts and are shared by Vercel instances.
export function rateLimiter(database: PrismaClient | null) {
  const local = new Map<string, { count: number; expires: number }>();
  return async (request: Request, response: Response, next: NextFunction) => {
    if (!request.path.startsWith("/api/")) return next();
    const write = !["GET", "HEAD", "OPTIONS"].includes(request.method);
    const maximum = write ? 20 : 120;
    const address = process.env.VERCEL
      ? String(
          request.headers["x-vercel-forwarded-for"] ||
            request.socket.remoteAddress,
        )
      : String(request.socket.remoteAddress);
    const now = Date.now(),
      bucket = Math.floor(now / 60000);
    const key = createHash("sha256")
      .update(`${address}:${write}:${bucket}`)
      .digest("hex");
    try {
      let count: number;
      if (database) {
        const result = await database.$queryRaw<
          Array<{ count: number }>
        >`INSERT INTO "RateLimit" ("key", "count", "expiresAt") VALUES (${key}, 1, ${new Date(now + 120000)}) ON CONFLICT ("key") DO UPDATE SET "count" = "RateLimit"."count" + 1 RETURNING "count"`;
        count = result[0].count;
        // Indexed cleanup bounds storage; not a recurring paid job.
        if (count === 1)
          await database.rateLimit.deleteMany({
            where: { expiresAt: { lt: new Date(now) } },
          });
      } else {
        for (const [id, entry] of local)
          if (entry.expires < now) local.delete(id);
        const entry = local.get(key) || { count: 0, expires: now + 60000 };
        count = ++entry.count;
        local.set(key, entry);
      }
      if (count > maximum) {
        response.setHeader("Retry-After", "60");
        return response
          .status(429)
          .json({
            message: "Too many requests. Please try again in a minute.",
          });
      }
      next();
    } catch {
      response
        .status(503)
        .json({
          message:
            "Request protection is temporarily unavailable. Please try again.",
        });
    }
  };
}
