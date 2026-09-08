# Pantridge

A warm, illustrated kitchen for your fridge, pantry, and grocery list. Built for one person and designed for a phone. Your changes save to IndexedDB before the interface reports success; an installed service worker keeps the app available offline.

## Run locally

Requires Node 22.12+ (Node 24 recommended) and pnpm 10.32.1.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The kitchen starts empty. Use **+** to add food or shopping items. Local use needs no AWS account, credentials, or sign-in. For the installable/offline version:

```sh
pnpm build
pnpm preview
```

Open the preview once with internet before using it offline. Installation is available through the browser’s install/Add to Home Screen menu. Updates are offered explicitly so an app update does not interrupt an edit.

## Included

- SVG kitchen art, a snappy fridge door, and opposing pantry doors.
- Scannable shelves, category art, and a secondary **Move or edit item** action.
- Fridge and pantry storage; frozen food stays in the fridge’s Frozen section.
- Counts and units, optional expiration dates per stock lot, brand and package details.
- Search across stocked and depleted foods. Empty items leave the shelves but remain remembered.
- Manual shopping with prominent quantity badges and separate at-home counts.
- One-time shopping items without catalog entries.
- Purchase checkoff followed by a put-away review; quantities, location, and expiration are confirmed before stocking.
- Offline edits, multi-tab persistence, queued cloud changes, backup export/restore.
- Private versioned API and configurable AWS Terraform. Cloud sign-in is prepared with Cognito/OIDC; the final sign-in choice remains open.

## Checks

```sh
pnpm check
pnpm exec playwright install chromium
pnpm test:e2e
terraform -chdir=infra init -backend=false
terraform -chdir=infra fmt -check -recursive
terraform -chdir=infra validate
terraform -chdir=infra test
```

`pnpm check` runs strict TypeScript, ESLint, formatting, folder/file limits, unit tests, and the production build. CI runs those checks plus browser accessibility/offline tests and Terraform’s mocked security plan. On Windows, `PLAYWRIGHT_CHANNEL=msedge` can use an installed Edge browser.

## Deploy and extend

- [AWS deployment](docs/deployment.md): domain, account, region, state, and publishing.
- [Architecture and quality rules](docs/architecture.md): boundaries, offline behavior, conflict semantics, and extension points.
- [API contract](docs/api.md): future phone client and purchase-import integration.

Walmart receipt import, commonly used shelves, automatic restock suggestions, custom shelf names, and a bulk list view are intentionally deferred. The current app uses shelf selectors for moving food; drag-and-drop can be added without changing the inventory model.
