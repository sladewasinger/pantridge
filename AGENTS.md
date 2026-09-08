# Pantridge development

Preserve the approved warm SVG kitchen design, fast fridge animation, opposing pantry doors, and prominent shopping quantity badges. Existing-stock quantities belong on a separate secondary line. Honor reduced motion and maintain keyboard/touch access.

Keep interface copy sparse. Empty shelves say "Empty"; do not add a kitchen tagline. The fridge has its handle on the left and hinges on the right, so its door swings open from the left edge.

This app is hosted on the owner's AWS account using Terraform. Do not use Sites. Domain, account, and sign-in preference remain configurable; do not invent credentials or deploy a stack without the owner's deployment instructions.

## Product boundaries

- Local/offline use must remain available.
- Google sign-in is optional for cross-device sync and open to any Google user. Keep anonymous device-only use open and isolate each signed-in kitchen by the verified token's subject. Do not add an email allowlist.
- Inventory and shopping edits commit to IndexedDB before success is reported.
- Purchases do not increase inventory until the put-away action.
- Keep generic food identities separate from stock lots and shopping entries.
- Zero stock hides a food from shelves while preserving search and shopping history.
- One-time shopping entries need no permanent food identity.
- Frozen food appears within the fridge. Shelf names are fixed.
- Walmart receipt import, commonly used shelves, automatic restocking, and bulk management are future features. Do not silently expand scope into them.

## Implementation and checks

Keep domain transitions pure and shared with the API. UI modules must not import server code. Keep the persistent outbox and snapshot transactional; retry mutation IDs unchanged. Preserve unacknowledged edits during sync and never replace a newer local revision with an older server response.

Use small feature folders and the existing validation limits. Do not disable complexity, nesting, file-size, or folder-count checks to fit a change; extract a cohesive module instead. Keep test exceptions limited to test files.

Run `pnpm check`. For changes to persistence, shopping, animation, or app navigation, also run `pnpm test:e2e` against the production build. For infrastructure, run Terraform format, validate, and mocked tests. Live AWS integration cannot be claimed from mocked tests.

Keep secrets, generated bundles, Terraform state, dependency caches, and browser test output out of Git. Document any material limitations and future API changes in `docs/`.
