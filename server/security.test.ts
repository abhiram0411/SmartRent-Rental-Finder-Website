import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { validate } from "class-validator";
import { requireOwner, authenticatedUser, validateImageUrls } from "./security";
import { PropertyInput, SearchInput } from "./dto";
import type { Request } from "express";
test("another owner cannot modify a property", () => {
  assert.throws(() => requireOwner("owner-a", "owner-b"));
  assert.doesNotThrow(() => requireOwner("owner-a", "owner-a"));
});
test("missing or forged authentication is denied", async () => {
  await assert.rejects(() => authenticatedUser({ headers: {} } as Request));
  await assert.rejects(() =>
    authenticatedUser({
      headers: { authorization: "Bearer forged" },
    } as Request),
  );
});
test("negative rent and script URLs fail validation", async () => {
  const input = Object.assign(new PropertyInput(), {
    title: "A test home",
    city: "Pune",
    locality: "Baner",
    rent: -1,
    bedrooms: 2,
    area: 1000,
    furnishing: "Furnished",
    description: "A deliberately valid description with enough characters.",
    images: [],
  });
  assert.ok((await validate(input)).some((error) => error.property === "rent"));
  process.env.SUPABASE_URL = "https://example.supabase.co";
  assert.throws(() => validateImageUrls(["javascript:alert(1)"]));
  assert.throws(() => validateImageUrls(["https://evil.example/photo.jpg"]));
});
test("search page sizes cannot be expanded and invalid filters are rejected", async () => {
  const query = Object.assign(new SearchInput(), { page: 0, bedrooms: 999 });
  assert.equal((await validate(query)).length, 2);
});
