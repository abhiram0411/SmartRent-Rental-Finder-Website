# SmartRent

A rental-finder learning project with React, TypeScript, NestJS, Prisma and PostgreSQL. Supabase supplies hosted authentication and image storage when configured. The project targets Vercel Hobby and Supabase Free allowances; there is no AWS integration.

## Current modes

- Without database credentials: honest read-only demo with six fictional listings, server-side filters, sorting, pagination, property details, neighbourhood map links, responsive UI and loading/error states.
- With a dedicated database and Supabase project: code supports authentication, owner listing CRUD, favourites, enquiries and photo uploads. These require live integration verification before real users are admitted.

No account credentials are included in this repository. Existing unrelated Supabase projects must remain untouched.

## Run locally

Requires Node.js 22 or 24 and npm.

```sh
npm ci
npm run db:generate
npm run dev
```

Open http://127.0.0.1:5173. Backend: http://127.0.0.1:3001/api. Swagger: http://127.0.0.1:3001/api/docs. Backend changes require restarting `npm run dev`; frontend changes hot reload.

```sh
npm run build
npm test
npm audit
```

Run the build before tests: HTTP tests deliberately exercise compiled decorator metadata. Dependency overrides pin patched transitive versions; recheck compatibility on upgrades.

## Connect a separate Supabase project

1. Use a dedicated free project. Supabase permits two active free projects across organizations; do not delete or pause unrelated projects without the owner's instruction.
2. Create `.env` from `.env.example`. Fill the server database URLs using the project's connection dialog. Use the transaction pooler for Vercel (`pgbouncer=true` where instructed by Supabase) and the direct/session connection for schema changes. Require TLS.
3. Run `supabase/01-schema.sql` then `supabase/02-security.sql` in that dedicated project's SQL editor. The security script is a one-time setup, not an idempotent migration manager.
4. Configure asymmetric JWT signing in Supabase (ES256 or RS256); the backend rejects legacy HS256 secrets intentionally.
5. Set the matching public URL and anon/publishable key on client and server. Never expose database credentials or service-role keys in `VITE_` variables.
6. Review Auth site URL, redirect allowlist, email confirmation, SMTP delivery limits, and signup restrictions. Start with controlled test accounts.
7. Test two separate users, uploads, owner isolation, enquiries and deletion before enabling public registration.

## Deploy

`vercel.json` builds the frontend and compiled Nest server. `api/index.js` adapts the initialized Nest Express application to a Vercel function. Configure the environment in Vercel, set `APP_ORIGIN` to the exact deployed origin, and redeploy after changing client variables. The runtime reuses the Prisma client and Nest app between warm requests.

Keep Vercel on Hobby, Supabase on Free, and use provider subdomains. Both plans have limits and policies that may change. This repository does not promise lifetime free hosting.

## Study

Start with [the learning guide](docs/LEARNING_GUIDE.md), then [security requirements and verification](docs/SECURITY.md). See [progress](PROGRESS.md) for verified status and remaining deployment work.

## Credits

React, NestJS, Prisma, Supabase, Motion and Radix Dialog provide the core tools. DM Sans and Instrument Serif are served through Google Fonts. Demo interior images are served from Unsplash and are illustrative, not photos of real advertised properties. Map links use OpenStreetMap. There is no React Bits component copied into this build; Motion provides the required restrained animation without an additional animation engine.
