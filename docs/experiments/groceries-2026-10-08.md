# Automatic grocery recognition evaluation

The 341-identity catalog adds 104 general grocery identities, including berries,
crackers, cereals, granola, sauces, seafood and plant milks. Brand names remain
product evidence, not one-off aliases. Identity and preparation remain separate;
quantity conversions, yields and dietary safety are outside this classification.

The production classifier ran locally with GPT-6 Luna medium, the existing
server-managed key and isolated DynamoDB Local tables. The unchanged limits were
25 items per request, 2,048 output tokens and a 15-second deadline. The persistent
50-call real-local daily budget remained enforced. No production kitchens were
read or changed.

Three shuffled repetitions of the same 25 authored grocery cases completed in
9.204, 8.779 and 7.037 seconds. Each scored 25/25 expected identity/status outcomes
and 18/18 specified preparations, with no false recognized identities or failed
requests. These are 25 distinct cases, not 75 independent products. Negative
controls included a rice-and-beans meal, imitation chicken, a meal replacement,
cleaner, an unidentified mix and instruction-like text. The conflicting name
“Beef Chuck Brisket” stayed uncertain instead of guessing a cut.

A fourth provider call through the real resolver completed in 7.171 seconds
(7.524 seconds including local persistence). Repeating the same resolver request
reused all 25 saved results in 15 milliseconds with zero additional provider calls.
The cache lives in DynamoDB Local, independently of the experiment process.

A fifth call tested 12 names with all extra descriptions removed, completing in
6.412 seconds. It recognized 11 identities: raspberries, branded raspberries,
frozen raspberries, black beans, Tabasco, chipotle pepper sauce, tomato/basil wheat
crackers, protein granola, microwave brown rice, sardines in olive oil and cinnamon
breakfast cereal. The conflicting beef-cut name stayed uncertain. Black beans
correctly retained unknown preparation when the title did not establish canning;
local matching separately uses explicit can units without inventing drained mass.

This small targeted sample supports the change but is not an accuracy or latency
guarantee. Unresolved foods remain usable inventory, with optional corrections
inside item editing and conservative recipe compatibility. Catalog gaps are still
possible; automatic creation/merging of canonical identities is not implemented.

Reproduce the batch/cache experiment with:

```sh
node scripts/full/evaluate.mjs gpt-6-luna medium groceries
node scripts/full/evaluate.mjs gpt-6-luna medium groceries names-only
```

The first command normally needs four provider calls on a cold cache; reruns may
reuse its resolver results. The second needs one call. Detailed synthetic reports
are ignored under `artifacts/local/grocery-recognition-*.jsonl`. No budget reset is
part of either procedure.

Release validation for this change: pinned pnpm 10.32.1 frozen installation;
`pnpm check` with 555 unit tests and production builds; 83 Chromium and 69 WebKit
tests (one existing camera/platform skip each); and eight full local integration
tests. Independent review covered stale classification responses, negative-result
matching, old-client response projection and pending mutation replay after an
update. Concurrent browser runs initially collided while cleaning their shared
trace directory; unchanged suites passed using separate output directories.

Manual browser interactions used the isolated full local frontend/API at desktop
width and a same-origin 390 × 844 iframe for phone layout. Adding a six-ounce pack
of raspberries, automatic identity selection, normal shopping-list addition,
collapsed correction controls, saved preparation correction, reload persistence,
restoring automatic matching and the simplified settings status were exercised.
The phone-width iframe is layout evidence, not a claim of testing a physical
phone or live Google authentication. Automated WebKit checks are additional
evidence. The real provider experiments above are separate from the deterministic
fixture provider used for UI and failure/retry integration checks.
