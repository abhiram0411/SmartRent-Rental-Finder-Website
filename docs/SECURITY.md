# Security requirements and evidence

Security reduces specific risks; no web app can be called hacker-proof. This is a portfolio implementation, not an independently audited production housing service.

## Implemented controls

| Risk | Implementation | Verification |
| --- | --- | --- |
| Forged identity | jose verifies Supabase JWT signatures through JWKS, issuer, audience, allowed algorithm and expiry when present | Missing/forged-token tests; live signing configuration pending |
| Editing other users' data | Owner ID derived from verified subject; owner checks before update/delete; user-scoped favourites and enquiries | Ownership unit test; two live users still needed |
| Mass assignment | DTO whitelist and rejection of unknown fields | HTTP test rejects supplied ownerId |
| Invalid/injection input | Length/type/range checks, Prisma parameterized operations, parameterized SQL for counters | DTO and HTTP tests |
| Exhaustion | Page size 12; message/file/body limits; 120 reads and 20 writes per IP/minute | HTTP limiter test; shared PostgreSQL counter path requires database test |
| Cross-instance rate-limit bypass | PostgreSQL atomic counter in live mode | Implemented, not yet integration-verified |
| Unsafe uploads | 2 MB limit, JPEG/PNG/WebP magic-byte checks, UUID object names, per-user paths, storage RLS | Implementation review; full storage integration pending |
| Browser script injection | React text escaping, no HTML rendering of descriptions, production CSP | Build verified; hosted header test pending |
| Secret disclosure | Ignored .env, explicit public fields, generic server errors, logs exclude bodies/tokens | Source review |
| Direct database access | Table RLS and revoke script for Supabase browser roles | Script prepared; execution pending |
| Dependency vulnerabilities | Lockfile and patched dependency overrides | npm audit reported zero at verification time |
| API inventory | Generated OpenAPI document and learning-guide endpoint table | HTTP test checks docs paths |

## Important boundaries

- CORS is a browser policy, not authentication. Attackers can send requests outside a browser.
- HTTPS protects data in transit, not an exposed password in source code. Production HTTPS is supplied by hosting and must be verified after deployment. Loopback HTTP is for local development only.
- JWTs are signed, not necessarily encrypted. Never put secrets in a JWT payload. Current backend accepts ES256/RS256 only.
- Supabase's browser key is public by design. RLS, grants and backend checks are the security boundary. Database passwords and service-role keys are secret.
- Prisma database connections do not automatically inherit the caller's Supabase identity. A privileged connection can bypass RLS; API ownership checks remain mandatory. Configure a dedicated least-privilege database login before real use.
- API requests use bearer headers rather than implicit authentication cookies. If converted to cookie authentication, add a CSRF design, Secure/HttpOnly/SameSite cookies and origin validation.
- In demo mode the rate limiter is in-memory and per process. It is not a global production traffic cap. PostgreSQL counters are used only when the database is connected.
- The current upload check identifies allowed file signatures but is not malware scanning or full image re-encoding. Public photo URLs are public; never upload identity documents or private records. Orphaned upload cleanup and per-user storage quotas must be added before open public use.
- Logs are structured and redacted, but no paid monitoring or always-on incident-response system is configured. An operator must review logs and configure available alerts.
- Auth provider rate limits, breached-password policies, MFA and email verification must be configured and tested in the dedicated project. They are not automatically enabled by this repository.

## Release checks

1. Run production build, API tests and npm audit.
2. Apply schema/security scripts to the dedicated project only.
3. Test signup, confirmation, login, logout and expired tokens. Verify failure paths without revealing whether an account exists.
4. User A creates a listing; user B cannot edit/delete it or read private enquiries not addressed to them.
5. Direct anonymous Supabase queries cannot read application tables.
6. Invalid/oversized uploads fail; users cannot overwrite another user's objects.
7. Verify HTTPS redirect, CSP, CORS and non-sensitive errors on the deployed URL.
8. Document account deletion, photo cleanup and retention before allowing real users.
9. Check free-plan limits and retain a restorable database export.

## References

- https://docs.nestjs.com/techniques/validation
- https://supabase.com/docs/guides/auth/jwts
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://vercel.com/docs/functions/runtimes/node-js

The user's API and web security checklists informed these requirements. They are requirements to implement and verify, not proof of safety by themselves.
