import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Request } from "express";

export async function uploadPhoto(
  request: Request,
  userId: string,
  base64: string,
) {
  const bytes = Buffer.from(base64, "base64");
  if (!bytes.length || bytes.length > 2 * 1024 * 1024)
    throw new BadRequestException("Choose an image smaller than 2 MB.");
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp =
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP";
  if (!jpeg && !png && !webp)
    throw new BadRequestException(
      "Only JPEG, PNG, and WebP images are allowed.",
    );
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new ServiceUnavailableException("Photo storage is not connected.");
  const storage = createClient(url, key, {
    global: { headers: { Authorization: request.headers.authorization! } },
    auth: { persistSession: false },
  });
  const file = `${userId}/${randomUUID()}.${jpeg ? "jpg" : png ? "png" : "webp"}`;
  const { error } = await storage.storage
    .from("property-images")
    .upload(file, bytes, {
      contentType: jpeg ? "image/jpeg" : png ? "image/png" : "image/webp",
      upsert: false,
    });
  if (error)
    throw new BadRequestException(
      "The photo could not be uploaded. Check the file or try again later.",
    );
  return {
    url: storage.storage.from("property-images").getPublicUrl(file).data
      .publicUrl,
  };
}
