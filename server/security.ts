import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Request } from "express";

// The verifier never accepts a token merely because it can be decoded.
let keySet: ReturnType<typeof createRemoteJWKSet> | undefined;
export async function authenticatedUser(request: Request): Promise<string> {
  const url = process.env.SUPABASE_URL;
  const token = request.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!url || !token)
    throw new UnauthorizedException("Please sign in to continue.");
  try {
    keySet ??= createRemoteJWKSet(
      new URL(`${url}/auth/v1/.well-known/jwks.json`),
    );
    const { payload } = await jwtVerify(token, keySet, {
      issuer: `${url}/auth/v1`,
      audience: "authenticated",
      algorithms: ["ES256", "RS256"],
    });
    if (!payload.sub) throw new Error("Missing subject");
    return payload.sub;
  } catch {
    throw new UnauthorizedException(
      "Your session is invalid or expired. Please sign in again.",
    );
  }
}
export function requireOwner(ownerId: string, userId: string) {
  if (ownerId !== userId)
    throw new ForbiddenException("You can only change your own listings.");
}
export function validateImageUrls(images: string[], userId?: string) {
  const project = process.env.SUPABASE_URL;
  if (
    !project ||
    images.some((image) => {
      try {
        const url = new URL(image);
        return (
          url.origin !== new URL(project).origin ||
          !url.pathname.startsWith(
            `/storage/v1/object/public/property-images/${userId ? `${userId}/` : ""}`,
          )
        );
      } catch {
        return true;
      }
    })
  )
    throw new BadRequestException("Use photos uploaded to this project.");
}
