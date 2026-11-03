# CLAUDE.md — PoolMate project context

## Mission
Build PoolMate as a polished intra-city, instant-first carpooling web prototype. The current milestone is **frontend only**: UI, interactive map, rider/driver flows, deterministic demo data, and API-ready TypeScript service interfaces.

## Read before changing code
- Read `POOLMATE_FRONTEND_SPEC.md` for the detailed frontend PRD, flows, UI requirements, types, mock rules and acceptance criteria.
- Treat `POOLMATE_PRD.docx` as the product-readable PRD.
- Inspect the repository and `package.json` before assuming the stack or creating files. Preserve existing working code and conventions.

## Product truths
- Instant-first: a rider can proceed as a normal ride; no compulsory group-forming wait.
- Pooling is optional. A compatible rider may be inserted into the remaining route of a moving vehicle.
- Vehicle-centric route insertion is the future backend model; do not implement real matching in React components.
- Product geography is intra-city; seed Jaipur demo locations.
- Women-Only is a strict user-selected requirement. Never silently remove it or fallback to an ineligible/mixed ride.
- Show moving pool, waiting pool and empty vehicle result sections.
- Exclude subscriptions/Professional Mode, Convo/social mode, food ordering and rewards from this milestone.

## Frontend-only boundary
- Do not build FastAPI, database, Redis, real dispatch, payments, KYC, production SOS, ML, or background mobile GPS in this milestone.
- Use typed mock services behind interfaces so a backend can replace them later.
- Clearly label simulated drivers, locations, trip offers, route calculations, verification and fares as demo/sample where needed.
- Never imply the app is connected to real nearby drivers or emergency services unless actually configured and verified.

## UI direction — strict
- Calm, minimal, premium mobility UI with clear hierarchy inspired by the usability of Uber, not a copy.
- White, off-white, light/mid grey, charcoal and black only.
- No purple/violet, neon, saturated accent colours or punchy gradients.
- Use subtle borders, restrained shadows, whitespace and consistent typography.
- Use high-contrast, clearly labelled SOS controls; do not rely on colour alone.
- Responsive: map + panel on desktop; map + bottom sheet/search panel on mobile.
- Keep map accessible through search/list alternatives.

## Map and location rules
- Inspect existing map library first. Reuse Leaflet if already present and working; do not change map libraries without explaining why and asking first.
- Use real map tiles with required attribution and provider-policy compliance; use deterministic Jaipur route/vehicle fixtures for demo overlays.
- Use browser geolocation only after user action/permission. Manual pickup selection must work if permission is denied.
- Show a DEMO label/legend on simulated vehicles and moving markers.
- Do not use random real-looking drivers or hardcoded private addresses.
- Keep mapping/geocoding/routing behind provider interfaces. Do not expose secret API keys in browser code.

## Engineering rules
- First run a read-only audit. Report current framework, routes, dependencies, reusable components, mock data, gaps and proposed file changes.
- Do not start coding until the user approves the audit plan.
- Do not replace Next.js/Vite or other framework, router, styling system or state manager without explicit approval.
- Do not add dependencies unless necessary; explain the reason first.
- Keep business logic out of React components. Use domain types, service adapters and reusable components.
- Never label mock responses as real backend results.
- Handle loading, empty, validation, error, denied-permission and stale-demo-location states.
- Use accessible labels, keyboard focus, contrast, reduced-motion support and mobile-friendly controls.
- Do not add subscriptions or unrelated features.

## Local VS Code workflow — no Git required
- The user works directly in VS Code with Claude Code authenticated through their Claude Pro account. Assume a local-folder workflow.
- Do not ask the user to install Git, run Git commands, create branches, commit, push, open pull requests, or configure GitHub. None of these are required for this milestone.
- Make changes directly in the currently opened project folder, after auditing it.
- Before a risky multi-file refactor, deletion, or overwrite, create a local backup folder such as `backups/pre-change-YYYYMMDD-HHMM/` and copy the affected files there. Do not back up `node_modules`, build output, caches, or secrets.
- Never delete an existing working screen or replace the app framework without explicit approval. Prefer small, reversible edits.
- The user can keep an extra manual copy of the whole project folder in Windows File Explorer as a simple backup.

## Working protocol
1. Work in one chunk at a time, as defined in `POOLMATE_FRONTEND_SPEC.md`.
2. For changes spanning more than 2–3 files, first present a plan and exact files to touch.
3. Wait for approval before broad refactors or dependency changes.
4. Implement only the requested chunk; do not opportunistically rewrite unrelated code.
5. Run relevant lint, type-check, tests and build commands available in `package.json`. It is okay to use the VS Code integrated terminal for normal project commands such as `npm install`, `npm run dev`, `npm run build` and test commands when needed and approved.
6. Summarise files changed, behaviours implemented, commands run, failures and manual QA steps. Do not mention Git workflows.
7. Do not claim completion when tests/build fail.

## First action
Perform a read-only audit of the currently opened local project folder and compare it with `POOLMATE_FRONTEND_SPEC.md`. If the folder is empty, stop and tell the user how to place the existing frontend source files in it. The user may open the correct existing folder in VS Code, copy the existing project files using Windows File Explorer, or download the repository ZIP in a browser and extract it into this folder. Do not require Git or a Git command. Do not scaffold a second app without approval.
