# Architecture

## Boundaries

| Folder              | Responsibility                                                           |
| ------------------- | ------------------------------------------------------------------------ |
| `src/domain`        | Validated food, stock, shopping, commands, and pure state transitions    |
| `src/data`          | IndexedDB transactions, persistent outbox, backup, and sync              |
| `src/auth`          | Optional OIDC session adapter; no authentication code in inventory rules |
| `src/features`      | Small components grouped by kitchen, food, shopping, and settings        |
| `src/app`, `src/ui` | Navigation, accessible dialogs, and shared controls                      |
| `api`               | JWT-authenticated Lambda adapter and DynamoDB persistence                |
| `infra`             | AWS provisioning, HTTPS, DNS, access controls, and mocked plan tests     |

Generic food identities hold names, units, category art, optional package details, and storage location. Stock lots hold quantity and optional expiration, so cartons with different dates combine on a shelf. Shopping entries optionally link to food; a one-time item stays outside the catalog until explicitly put away. Zero quantity hides a food from shelves without deleting its identity.

## Offline and sync

Each edit commits the updated snapshot and a UUID-bearing mutation together in one IndexedDB read/write transaction. Multiple tabs share that transaction boundary and notify one another with BroadcastChannel. Batch actions and restores are atomic locally. A failed write is reported without claiming success.

The service worker precaches the application shell and illustration assets. It does not cache authentication or API responses. The app works offline after its first successful load. Reconnection, focus, edits, and a 30-second foreground timer attempt sync. Background browser execution is not required or promised.

The server applies each mutation and its permanent idempotency receipt in one DynamoDB transaction, conditional on the snapshot revision. Concurrent writers retry against fresh state. A lost response can be retried with the same mutation UUID without doubling quantities. Client reconciliation preserves edits added during sync and rejects responses older than the revision another tab already saved.

Quantity adjustments are deltas; ordinary metadata edits follow server arrival order. Put-away rejects stale purchased quantities rather than silently consuming a changed shopping item. Such conflicts stop sync and preserve the local outbox. Export a local backup before resolving a conflict; Settings offers an explicitly confirmed **Use cloud copy** recovery action that discards the captured unsynced changes while preserving newer edits. The API never silently discards pending changes.

Local-only and signed-in kitchens use separate IndexedDB keys. Signing in does not silently upload an existing local kitchen. Export/restore into the empty signed-in kitchen is the explicit migration path. Sign-out removes session tokens but retains the account’s local kitchen for a later sign-in on this device.

## Code quality

- Strict TypeScript, indexed access checks, unused code checks, and type-only imports.
- ESLint cyclomatic complexity ≤15 (modified switch counting), cognitive complexity ≤15, nesting depth ≤3, and parameters ≤4.
- TypeScript files ≤250 nonblank/noncomment lines; tests ≤300.
- Structural checks: ≤20 files in a folder; ≤300 nonempty source/Terraform lines and ≤350 CSS lines.
- Domain code cannot import React, UI, persistence, or browser APIs. The frontend cannot import server modules.
- Prettier and a locked dependency graph. Changes must pass CI; configure the Git host’s branch protection to require `Quality / app` before merging.
- Tests target inventory math, duplicate requests, interrupted sync, multi-tab persistence, real offline reloads, accessibility, and infrastructure security.

## Limits and future features

This personal release stores one bounded snapshot per account: at most 600 food identities, 1,500 lots, 500 shopping entries, and 280 KB serialized. Validation stops further additions before DynamoDB’s item limit. Long-lived or larger inventories can move to per-entity records behind the repository adapter; the client command contract stays independent of DynamoDB. Old zero-quantity lots currently remain for their history; archiving is a follow-up.

The commonly used shelf should query remembered food identities (including zero stock), using explicitly pinned favorites initially or consumption history later. It should offer manual additions to shopping. Automatic restocking belongs in a separate suggestion feature, not in quantity arithmetic.

Receipt import will normalize retailer lines into food/package matches and purchased shopping entries, with stable receipt/line identifiers and an explicit review step for uncertain matches. Do not call Walmart endpoints or store retailer credentials in this web app before that integration is designed.

Category SVGs are the approved local artwork. Animation is isolated in CSS, uses transform/opacity, and honors reduced-motion preferences. A native dialog supplies focus containment, Escape dismissal, and focus restoration. Food movement is available through an accessible location/shelf selector.

## References

- [MDN: service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
- [Cognito authorization code and PKCE](https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html)
- [Vite runtime requirements](https://vite.dev/guide/)
