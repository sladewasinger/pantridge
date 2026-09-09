# Pantridge development

Preserve the approved warm SVG kitchen design, fast fridge animation, opposing pantry doors, and prominent shopping quantity badges. Existing-stock quantities belong on a separate secondary line. Honor reduced motion and maintain keyboard/touch access.

Keep interface copy sparse. Empty shelves say "Empty"; do not add a kitchen tagline. The fridge has its handle on the left and hinges on the right, so its door swings open from the left edge.

This app is hosted on the owner's AWS account using Terraform. Do not use Sites. Domain, account, and sign-in preference remain configurable; do not invent credentials or deploy a stack without the owner's deployment instructions.

Use `develop` for local development and merge tested changes into `main` for GitHub Actions application deployments. Terraform applies remain manual. The workflow deploys application code with a role scoped to Pantridge; never expand it to infrastructure administration.

## Product boundaries

- Local/offline use must remain available.
- Google sign-in is optional for cross-device sync and open to Google users within the configurable admission cap (100 initially). Keep anonymous device-only use open and isolate each signed-in kitchen by the verified token's subject. Do not add an email allowlist. Preserve atomic admission, suspension checks, and generous abuse limits that accommodate normal cart entry.
- Inventory and shopping edits commit to IndexedDB before success is reported.
- Purchases do not increase inventory until the put-away action.
- Shopping's badge counts unchecked rows. Discarding checked rows does not change inventory and supports Undo.
- Keep generic food identities separate from stock lots and shopping entries.
- Zero stock hides a food from shelves while preserving search and shopping history.
- One-time shopping entries need no permanent food identity.
- The top green door opens a separate freezer page with icicles; the bottom opens the fridge. Preserve the existing frozen flag in storage for compatibility. Shelf names are fixed.
- Empty new kitchens start with one package each of eggs, milk, butter, black beans, rice, and pasta. Initialization happens once; deleted defaults must never reappear. Existing nonempty kitchens are preserved.
- Food units and artwork are editable. Unit edits retain numeric quantities and update linked shopping labels. Deleting food removes its inventory and leaves linked groceries as one-time shopping entries.
- Barcode scanning requires Google sign-in and confirmation on every scan. Same generic food, unit and package size share a shelf tile across brands; different sizes have separate labeled tiles grouped in search. Preserve branded product metadata on stock lots and explicit unknown-size confirmation. Never infer expiration dates.
- The product proxy uses cached Open Food Facts data and free rules by default. Optional AI has server-enforced quotas, bounded structured output and a dedicated SSM SecureString key outside Terraform state. Keep private kitchen corrections separate from the shared ODbL catalog.
- Walmart receipt import, commonly used shelves, automatic restocking, and bulk management are future features. Do not silently expand scope into them.

## Implementation and checks

Keep domain transitions pure and shared with the API. UI modules must not import server code. Keep the persistent outbox and snapshot transactional; retry mutation IDs unchanged. Preserve unacknowledged edits during sync and never replace a newer local revision with an older server response.

Bind tokens to the active kitchen subject before and after refresh. Validate snapshot ID uniqueness and food references. Put-away must update placement, stock and shopping atomically. Preserve visual artwork selection, 44px shopping check targets, deletion Undo, and quantity fields that can be cleared before typing. Pin third-party GitHub Actions to verified commits.

Use small feature folders and the existing validation limits. Do not disable complexity, nesting, file-size, or folder-count checks to fit a change; extract a cohesive module instead. Keep test exceptions limited to test files.

Run `pnpm check`. For changes to persistence, shopping, animation, or app navigation, also run `pnpm test:e2e` against the production build. For infrastructure, run Terraform format, validate, and mocked tests. Live AWS integration cannot be claimed from mocked tests.

Keep secrets, generated bundles, Terraform state, dependency caches, and browser test output out of Git. Document any material limitations and future API changes in `docs/`.
