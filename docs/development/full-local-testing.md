# Full local integration

Use Node 22.12+ and pinned pnpm 10.32.1. Start Docker Desktop, then:

```sh
pnpm install --frozen-lockfile
pnpm dev:full
```

Open device A at `http://127.0.0.1:5176/` and device B at
`http://127.0.0.1:5177/`. Settings has Alice/Bob test accounts and collapsible
controls for failing sync, failing/delaying classification, and running due work.
Google login is simulated only in this development bundle. Both origins use the
actual frontend sync/outbox, API admission, transactions, quotas and classification
worker, with DynamoDB Local on loopback port 8006 and an API on 4176.

The default provider is an explicitly labeled fixture: it recognizes the test
name `Brown Rice (microwaveable)` and returns unknown for other names. This is a
repeatable failure/race test, not classification-quality evidence. Other AI features
require real mode:

```sh
pnpm dev:full --real-ai --model=gpt-6-luna
```

Real mode reads deployed configuration through the owner's AWS profile (default
`terraform`) and reuses the authorized SSM SecureString key only in server memory.
It contacts OpenAI and the existing product lookup provider. It never reads or
writes production kitchen/catalog tables. Use `--model=gpt-6.1-sol` for an explicit
comparison. Classification uses the separate deployed reasoning override, defaulting
to medium locally; interactive requests retain the deployed classifier effort.
No keys belong in Vite variables, command lines, Terraform variables or Git.

Fixture and real data use separate table and browser-storage namespaces. The
database volume survives server restarts; caches and daily counters are not cleared
by startup. Each local mode has a hard 50 AI attempts/account/day and 50 total/day.
Real model evaluations share the real preview's global budget. Production retains
its existing separate budgets and admission gates. The server owns a one-minute
worker interval, so closing every browser does not stop queued work. Stopping the
launcher stops the local worker; restarting resumes persisted due jobs.

Host, Origin, fetch-site and opaque local session checks reject foreign browser
callers. The database client pins its endpoint and dummy credentials. Only two
fixed local subjects exist. Test authentication adapters are excluded from frontend
production builds and Lambda bundles, with bundle checks enforcing that exclusion.
Do not expose these ports over a LAN or tunnel. This setup does not validate Google
OAuth, API Gateway, IAM, EventBridge delivery, or physical phone camera behavior.
Those still need production/staging or signed-in device verification.

## Repeatable checks

```sh
pnpm test:full
node scripts/full/evaluate.mjs gpt-6-luna low
node scripts/full/evaluate.mjs gpt-6-luna medium
node scripts/full/smoke.mjs
```

`test:full` needs Docker but no AWS credentials or paid calls. It starts isolated
fixture-test tables, API 4178 and devices 5178/5179, leaving manual kitchens alone.
It covers real writes, idempotency, account isolation, delayed manual corrections,
cache reuse, failures, browser reloads and offline outbox recovery. It runs in the
full main-branch quality workflow alongside the production-build E2E suites.

Each model evaluation makes six uncached provider requests: the same 40 authored
hard cases, shuffled three times and split into 25+15. It uses the production
classifier, 2,048-output-token cap, schema and 15-second deadline. The smoke command
requires an already-running real preview and sends three recipe requests through
its actual API; repeating it checks persisted cache reuse. Reports under
`artifacts/local/` are ignored. See [model evaluation](../experiments/models-2026-10-07.md).

Manually verify both widths too: add groceries, inspect synced versus awaiting
recognition counts, choose Process now, close both devices, reopen and inspect the
recognized food. Switch Alice/Bob and compare device A/B. Use test controls to
exercise errors without changing production authentication or inventory.

Manual verification also reproduced a stale Settings error display: the global sync
badge updated but the open dialog did not. Settings and recovery controls now share
the indicator's live status subscription, covered by a real API failure/recovery
browser test. Phone (390×844) and desktop (1280×900) click-throughs verified local
controls, recognition, unchanged package quantities, account switching and recovery.
