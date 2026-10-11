# SmartRent: from your first request to a full-stack application

## 1. What you are building

SmartRent helps people discover rental homes by city, neighbourhood, price, bedrooms and furnishing. Visitors browse and inspect listings. Signed-in users can save homes, contact owners and publish their own properties when the live services are configured.

This is a portfolio and learning application. The six seed listings are fictional. There are no payments, tenancy contracts, verified landlords or guaranteed availability. The map opens a locality search, not a verified street address.

The project was created with AI assistance. Use this guide to understand, reproduce and extend it. In an interview, explain what you personally implemented or changed, demonstrate the request flow, and accurately acknowledge assistance if asked. Understanding and evidence are more valuable than claiming sole authorship of code you cannot explain.

## 2. Start with six words

Frontend: the interface running in a user's browser. Backend: code running on a server that enforces rules. Database: persistent structured storage. API: an agreed way for programs to exchange requests and responses. Authentication: proving who the user is. Authorization: deciding what that user can do.

React is not a replacement for HTML. JSX describes UI structure, CSS controls appearance, and JavaScript/TypeScript controls behaviour. React turns components into browser DOM elements and updates the DOM when state changes.

TypeScript checks code before deployment. It helps catch a string being used as a number, for example. TypeScript types disappear at runtime, so the backend still validates untrusted requests.

## 3. The architecture

```text
User's browser
  React UI + Motion + Radix Dialog
    | HTTPS JSON requests with bearer access token
    v
Vercel function -> NestJS API
  request limits -> validation -> identity -> ownership -> database
    | Prisma parameterized queries
    v
PostgreSQL (dedicated Supabase project)

Browser <-> Supabase Auth: identity and session lifecycle
NestJS -> Supabase Storage: authenticated photo upload
Browser -> image URLs: property photos
Browser -> OpenStreetMap: optional neighbourhood search
```

Vite compiles the frontend into static files in dist. Vercel serves those files. API requests are routed to api/index.js, which loads the compiled Nest server. The server is initialized once per warm instance. Prisma is also reused instead of opening a brand-new client for every request.

Locally, Vite runs on port 5173 and proxies /api requests to Nest on port 3001. This lets frontend code use the same /api paths locally and in deployment. A port identifies a process listening for network connections on the same machine.

Serverless does not mean there is no server. The hosting provider starts and runs server instances for you. Instances can restart and multiple instances can serve requests, so memory is not a reliable shared database.

## 4. Two operating modes

Without DATABASE_URL, the backend serves six read-only demo properties. It does not pretend that saved homes or enquiries were persisted. Account UI explains that live services are not connected. This allows you to practise search and request handling without paying for a database.

With a dedicated database and Supabase environment variables, the API reads and writes real records. Auth and storage additionally need provider settings and SQL policies. Writing code is not proof of a working integration: live accounts, ownership isolation, uploads and deployment must be tested after setup.

At the time this guide was first written, the user's Supabase organization contained two unrelated projects and the user explicitly requested that both remain untouched. A separate SmartRent project must fit the provider's free allowance. No paid plan or AWS resource is authorized.

## 5. The file-by-file reading path

| File | Read it to understand |
| --- | --- |
| src/main.tsx | How React starts and mounts into the HTML root |
| src/App.tsx | Application state, navigation, filters, result rendering and detail view |
| src/components/Modal.tsx | Accessible modal foundation with focus management |
| src/components/Auth.tsx | Login/signup requests and feedback |
| src/components/Editor.tsx | Property form inputs and create/update calls |
| src/components/PhotoUpload.tsx | File checks, encoding, upload progress and photo previews |
| src/lib/api.ts | Shared fetch helper, access-token header and error handling |
| src/types.ts | Frontend Property shape |
| src/style.css | Layout, typography, responsive rules and reduced-motion support |
| server/main.ts | API routes, query logic and app configuration |
| server/dto.ts | Runtime input validation rules |
| server/security.ts | Token verification, ownership and image URL checks |
| server/http-security.ts | Rate limits and safe server error responses |
| server/uploads.ts | File signature checks and Supabase Storage upload |
| prisma/schema.prisma | Database models, relationships and indexes |
| supabase/01-schema.sql | SQL creating application tables |
| supabase/02-security.sql | Browser-role restrictions and photo storage policies |
| api/index.js | Vercel-to-Nest request adapter |
| vercel.json | Build command, function routing and browser security headers |

Read one route at a time. You do not need to memorize the entire application before running it.

## 6. Follow a search request

Imagine the visitor selects Pune and a maximum rent of INR 20,000.

1. An input event updates React state. State is the current data a component uses to render.
2. Submitting the search copies the input into the active search state and resets the page number.
3. A React effect observes search/filter changes and builds URLSearchParams.
4. The shared API helper sends GET /api/properties?q=Pune&maxRent=20000.
5. The server applies rate limits and validates SearchInput. A negative page or unknown query field is rejected.
6. Demo mode filters sample data. Live mode asks PostgreSQL for matching properties through Prisma.
7. The response contains items, total and demo. It contains no database password or owner account metadata.
8. React sets the results state. It shows a loading placeholder while waiting, cards after success, or a retry message after failure.

The effect has an ignore flag so an old response does not overwrite newer results after filters change. It does not cancel the old network request; an AbortController would be a useful improvement exercise.

```json
{
  "items": [{
    "id": "demo-6",
    "title": "A fresh start, with a view",
    "city": "Pune",
    "locality": "Kharadi",
    "rent": 18000,
    "bedrooms": 1,
    "area": 680
  }],
  "total": 1,
  "demo": true
}
```

This example omits image and description fields to keep the response readable. JSON is a text format with objects, arrays, strings, numbers, booleans and null. It is not JavaScript code to execute.

## 7. API inventory: input, output and permissions

| Method and path | Input | Output | Access |
| --- | --- | --- | --- |
| GET /api/health | None | Status and demo/live mode | Public |
| GET /api/properties | q, maxRent, bedrooms, furnishing, sort, page | Up to 12 properties and total | Public |
| GET /api/properties/:id | Property ID | One public property | Public |
| GET /api/my/properties | Access token | Current user's listings | Signed in |
| POST /api/properties | PropertyInput JSON | Created property | Signed in; owner ID set by server |
| PUT /api/properties/:id | Complete PropertyInput JSON | Updated property | Listing owner |
| DELETE /api/properties/:id | Property ID | deleted: true | Listing owner |
| GET /api/favourites | Access token | Saved property list | Current user only |
| PUT /api/favourites/:id | Property ID | saved: true | Current user only |
| DELETE /api/favourites/:id | Property ID | saved: false | Current user only |
| POST /api/properties/:id/enquiries | Message, 10-1000 characters | Enquiry ID and creation time | Signed in |
| GET /api/enquiries | Access token | Up to 100 related enquiries | Sender or property owner |
| POST /api/uploads | Base64-encoded allowed image | Public photo URL | Signed in |
| GET /api/docs-json | None | Generated OpenAPI inventory | Public |

PUT replaces the submitted editable property fields; it is not PATCH. Favourites use an upsert so saving an already-saved home does not create duplicate rows. DELETE removes the chosen record. Removing a property cascades to its favourites and enquiries; the confirmation must explain this consequence.

Common status codes: 200 means success, 201 commonly means a record was created, 400 means invalid input, 401 means missing/invalid authentication, 403 means the user is authenticated but lacks permission, 404 means not found, 429 means too many requests, and 503 means a required service is unavailable.

## 8. Follow a property creation request

The form collects title, city, locality, rent, bedroom count, floor area, furnishing, description and photo URLs. Numeric inputs are converted to numbers before sending. Browser validation provides quick feedback; the backend repeats all important checks because a caller can bypass the browser form.

The frontend retrieves the current Supabase access token and sends Authorization: Bearer followed by the token. Never paste a real token into a README, screenshot or public bug report.

Nest validates the DTO. The backend verifies the token and extracts its subject as userId. It builds the database record using that verified ID. The request cannot supply ownerId: unknown fields are rejected. Prisma creates the property and returns only the explicitly selected public fields.

```json
{
  "title": "A bright two-bedroom apartment",
  "city": "Pune",
  "locality": "Baner",
  "rent": 24000,
  "bedrooms": 2,
  "area": 1050,
  "furnishing": "Semi-furnished",
  "description": "A sunny apartment with a comfortable living area.",
  "images": []
}
```

To update a property the API first fetches it and compares its stored ownerId with the verified userId. The server never trusts a hidden frontend edit button as a security boundary.

## 9. Authentication, tokens and authorization

Supabase Auth manages credentials and sessions. SmartRent does not maintain its own password table or implement password hashing. A successful login yields a session containing an access token. The client library manages session persistence and refresh.

A JWT normally consists of a header, a payload and a signature. Anyone holding it can read its ordinary payload; signing is not encryption. The backend uses jose and the provider's public signing keys (JWKS) to verify the signature, checks issuer and audience, and restricts the signing algorithm to ES256 or RS256. jwtVerify checks expiration when present. A malformed, untrusted or expired token fails.

The issuer identifies the expected Supabase project. Audience identifies the intended token audience. Subject identifies the user. Checking only that a token looks like a JWT would let an attacker manufacture identities.

Authentication and authorization are separate. All signed-in users may create listings; whoever creates a listing owns that record. The app does not have a separately managed landlord certification role. Permissions are based on ownership and relationship to the data.

Supabase configuration still matters: email confirmation, deliverability, password policy, MFA, redirect URLs and account deletion are not magically solved by writing a login form. Public registration must remain restricted until these flows are configured and tested. Password reset is a planned follow-up feature, not an implemented endpoint in this version.

## 10. Database design

Property contains the listing and its owner ID. Favourite connects a user to a property. Its composite primary key (userId, propertyId) prevents duplicate favourites. Enquiry connects a sender and a property with a message. RateLimit stores short-lived request counters.

```text
Property 1 ----- many Favourite
Property 1 ----- many Enquiry
Supabase Auth user ID ---> Property.ownerId
Supabase Auth user ID ---> Favourite.userId / Enquiry.userId
```

An index helps the database find matching rows without inspecting every row. The city/rent index supports relevant filtering patterns, and ownerId supports a user's listing dashboard. Case-insensitive contains searches can still become expensive at scale; this is not a full-text search engine. A future production version could add PostgreSQL full-text or trigram indexes after measuring actual query plans.

Prisma turns typed operations into SQL. It protects query values through parameterization, but it does not decide which user should access which record. That responsibility remains in the API.

Supabase exposes a separate Data API. Our browser roles receive no grants on application tables and RLS is enabled. Prisma uses its own connection, which may bypass RLS if privileged. This is why backend authorization must be tested independently of Supabase policies.

## 11. Photo uploads and maps

The browser checks image size for fast feedback, then reads the file as base64 text. Base64 increases size by roughly one third, so the API accepts a bounded 3 MB JSON body for a maximum 2 MB photo. The server verifies file bytes for JPEG, PNG or WebP, chooses its own random filename, and uploads under the verified user's folder. It forwards the user's token to Supabase Storage so the storage policy also checks folder ownership.

The response contains a public URL that the property form can include in its images array. The backend permits only this project's public property-image URLs, within the current user's folder. External arbitrary URLs are rejected. File signature checks are not malware scanning; full image decoding and re-encoding would be a further hardening step.

The current UI opens OpenStreetMap with an encoded locality and city search. It does not call a paid map API, track GPS or claim the exact property location. An embedded map, geocoding and distance search are future features with their own provider limits and privacy decisions.

## 12. Why security controls exist

Input validation: prevents impossible values, unexpected fields and excessive lengths from reaching business logic. Parameterized queries: keep user strings separate from SQL syntax. React escaping: renders descriptions as text instead of executing inserted HTML. CSP: restricts where scripts and other resources may load in deployment.

Ownership checks prevent an attacker changing an ID in the URL to edit another person's property, a common broken-object-authorization problem. CORS only controls browser access to cross-origin responses; a command-line attacker is not stopped by CORS.

Rate limits reduce repeated work and abuse. Demo mode uses an in-memory map; live mode atomically increments PostgreSQL counters shared across instances. Database-backed limiting adds a query per API request and is not a substitute for a provider's network-level DDoS protection. If live counters fail, requests are denied with 503 instead of bypassing protection.

The error filter returns generic internal failures and a request ID. Logs do not include passwords, bearer headers, request bodies or database strings. That limits accidental disclosure while allowing failures to be correlated.

TLS/HTTPS encrypts traffic between browser and host. Local loopback development uses HTTP. Production HTTPS, redirects and headers must be checked on the actual deployment. Never claim a site is secure merely because it has a padlock.

## 13. Test what an attacker could change

Existing automated tests cover foreign-owner denial, missing/forged token rejection, negative rent, invalid image URLs, malformed filters, rejection of unknown fields, missing resources, private endpoints, generated API inventory and request throttling.

The HTTP integration test starts a real local Nest server on a temporary port. It exercises the compiled DTO metadata, sends fetch requests, checks statuses and closes the server. A unit test checking a helper is useful but does not prove the HTTP framework actually invokes it.

After connecting the database, create two test users. Let A create a property and then let B attempt to edit or delete it. Confirm B receives a denial and the record remains unchanged. Repeat for favourites, enquiries and photo storage. Test expired and wrong-project tokens. Do not test attacks against systems you do not own or have permission to assess.

## 14. Running, configuration and deployment

Install dependencies with npm ci, generate the Prisma client, and start npm run dev. Open the frontend and API docs. Run npm run build before npm test. In development the frontend hot reloads; restart the backend after server changes.

Environment variables configure values that differ across machines. VITE_ variables are embedded in the browser build and are public. DATABASE_URL and DIRECT_URL must stay on the server. .env is ignored by Git. Commit only .env.example with empty values.

Build failures should be read from the first relevant error. A TypeScript error means the compiler found incompatible code. A network DNS error may mean the package registry is unreachable from the environment, not that the package is broken. An authentication failure may mean an expired token, wrong issuer or signing configuration; never fix it by disabling verification.

Vercel routes API requests to the compiled Nest adapter and serves dist as the frontend. Supabase handles database, identity and storage. Free services have quotas, possible inactivity pauses, and changing terms. A cloud deployment can be a portfolio skill without AWS.

## 15. A slow practice plan

Day 1: Build a property card from a plain object. Explain every JSX element and CSS rule. Change the price and photo, then inspect the DOM.

Day 2: Create a small array of properties. Filter it by city with Array.filter, then sort by rent. Write down the input array and expected output before running it.

Day 3: Add React state for a search box. Explain why changing state re-renders a component. Compare typing into an uncontrolled input with a controlled one.

Day 4: Call GET /api/properties using fetch. Inspect the network panel: method, URL, status, request headers, response JSON and duration. Add an empty and an error state.

Day 5: Write a small Nest controller returning JSON. Add a validated query parameter and deliberately send invalid input. Explain the difference between TypeScript and runtime validation.

Day 6: Create a PostgreSQL table and run SELECT, INSERT, UPDATE and DELETE on disposable local practice data. Reproduce a Prisma query as SQL.

Day 7: Trace login without copying secrets. Explain signature, issuer, audience, subject and expiry. Write a test that rejects a wrong user ID.

Day 8: Rebuild the owner form in a separate practice file. Add one useful field through the form, DTO, schema and response. Follow the whole change end to end.

Day 9: Add a meaningful security test. For example, prove an unknown ownerId field is rejected, rather than only testing that the UI hides a button.

Day 10: Explain the project aloud in five minutes and demonstrate a feature you changed yourself. Review anything you could not explain without reading.

## 16. Small code exercises

Exercise A: implement a pure filter without React.

```ts
function affordableHomes(homes: { rent: number }[], budget: number) {
  return homes.filter(home => home.rent <= budget);
}
```

Input: rents 18000, 24000, 35000 and budget 25000. Expected output: the first two homes. Add a test for an empty array and for a budget of zero.

Exercise B: prove ownership independently of the UI.

```ts
function canEdit(ownerId: string, currentUserId: string) {
  return ownerId === currentUserId;
}
```

Then explain why currentUserId must come from a verified session instead of a request body. Connect this exercise to requireOwner in the backend.

Exercise C: add a clear-search button. It should clear the text, active search and page number together. Explain how partial state updates can otherwise produce confusing results.

Exercise D: add request cancellation to the search effect with AbortController. Preserve error handling for real errors while ignoring an intentional abort.

Exercise E: add password reset using the provider's supported flow. Include redirect validation, email delivery setup and a generic confirmation message. Do not invent a reset-token format.

## 17. Questions you should be able to answer

Why are backend validation and frontend validation both needed? Why is ownerId derived from the token? Why is a database connection string different from a public browser key? Why can CORS not stop curl? Why is a JWT not a password database? What happens if Supabase is unavailable? What happens if two users save the same home? Why is pagination bounded? What is the difference between a unit test and a live integration test? What exactly is deployed on Vercel?

A useful resume statement after live verification: Built a responsive rental finder using React, TypeScript and NestJS, with PostgreSQL persistence, authenticated APIs, property ownership checks and automated API tests. Add deployment and live auth claims only after you verify them yourself. Do not claim maps, MFA, real-time chat or production security audits that the project does not implement.

## 18. Known limits and next improvements

The initial live Supabase integration is pending a separate free project. Password reset, account deletion, per-user storage quotas, orphan-photo cleanup, admin moderation, reporting, email delivery configuration and two-user database integration tests remain release work. There is no payments system or real-time messaging.

The client currently uses in-memory navigation rather than full URL routes, so refreshing returns to browsing. A router with shareable property URLs is a useful next exercise. Enquiries are capped at 100 and would need pagination for larger use. Search uses contains matching, not a dedicated search engine. Simple accessible feedback is preferred over decorative animation.

Zero known dependency advisories at a moment in time is not proof of permanent safety. Recheck dependencies, configuration and threat assumptions when changing the app. Read SECURITY.md for the exact control boundaries and release checklist.

## 19. Primary references

- React learning: https://react.dev/learn
- NestJS: https://docs.nestjs.com/
- Validation: https://docs.nestjs.com/techniques/validation
- Prisma: https://www.prisma.io/docs/
- Supabase Auth: https://supabase.com/docs/guides/auth
- JWT verification: https://supabase.com/docs/guides/auth/jwts
- RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Vercel Node functions: https://vercel.com/docs/functions/runtimes/node-js
- Free-plan terms: https://supabase.com/pricing and https://vercel.com/docs/plans/hobby

These references explain the tools. The source code and test results describe what SmartRent actually implements.
