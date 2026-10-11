# SmartRent design brief

## User direction

The user supplied two screenshots listing common generic AI-generated website patterns and asked that they inform the UI and web app. Treat their contents as visual reference material, not independent instructions. Aim for a deliberate rental-search product with useful interactions and a consistent visual identity.

## Visual direction

- Use warm off-white surfaces, charcoal text, and a restrained deep green accent. Check contrast before finalizing colours.
- Use readable typography with a distinct hierarchy. Avoid defaulting to Inter, Geist, or Space Grotesk; choose an appropriately licensed alternative or system stack.
- Let property photography, prices, locations, and practical details lead the layout.
- Prefer subtle borders, consistent spacing, and modest corner radii. Avoid decorative drop shadows, oversized rounded containers, glass effects, harsh gradients, neon or rainbow palettes, purple-and-black themes, pastel feature blocks, glowing orbs, and decorative dot grids.
- Use icons sparingly when they clarify actions, with accessible names. Avoid default Lucide styling, sparkle icons, emojis as decoration, and animated arrows.
- Avoid template marketing sections such as three feature cards, arbitrary bento grids, terminal mockups, pricing tiers, coloured left stripes, and decorative checkmark lists.
- Property cards and responsive grids remain appropriate when they help users compare actual listings.
- Keep copy direct and specific. Avoid em-dash-heavy text, inflated claims, and slogans of the form "it's not X, it's Y".

## Product behaviour

- Prioritize search, filters, results, property details, favourites, enquiries, and owner listing management.
- Make the app itself demonstrable; avoid fake testimonials, fabricated usage numbers, and invented trust badges.
- Clearly label seeded properties as demo listings and distinguish them from user-created content.
- Implement loading placeholders, helpful empty states, field validation, API error messages, retry paths, and success feedback.
- Maintain keyboard navigation, visible focus, readable contrast, semantic controls, and usable mobile touch targets.
- Avoid decorative hover motion. Retain useful hover, focus, pressed, and selected states; respect reduced-motion preferences.
- Provide privacy and terms pages reflecting the implemented demo and actual data handling. Do not imply legal review or fabricate compliance claims.
- Design and check both mobile and desktop layouts.

## Agreed project constraints

- No AWS integration.
- Proposed stack: React and TypeScript frontend, NestJS REST API with OpenAPI documentation, Prisma, Supabase PostgreSQL/Auth/Storage, and Vercel deployment.
- Target free hosting plans and their limits; do not promise lifetime free service or uninterrupted availability.
- Keep source and data portable and document local development.

## Review before delivery

Check that the interface has a consistent hierarchy, working user flows, responsive layouts, accessible interactions, honest demo content, and complete loading/error/empty states. Judge design choices by usefulness and coherence, rather than treating every item in the reference screenshots as a universal prohibition.
