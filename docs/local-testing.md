# Local API testing

Install the repository's pinned pnpm dependencies with `pnpm install --frozen-lockfile`, run `pnpm check`, then `pnpm dev:connected`. Open the exact printed Local URL: **http://127.0.0.1:5175/**. The fixed frontend port and backend port 4175 must be free. Ordinary `pnpm dev` remains available for offline use.

This runs the app and current recipe, barcode and nutrition API code locally. Google sign-in and cloud sync are disabled in this development mode. No Cognito callback, CORS, IAM or infrastructure change is required. Production builds cannot activate local testing, and retain their existing sign-in and API validation.

For a larger test kitchen, open **Settings → Load 200 sample foods** in this mode. It adds missing foods from a fixed, recognized 200-name set with varied artwork, storage and synthetic package sizes and quantities. Existing food names, stock, recipes, plans, shopping and outbox entries are preserved. Repeating the load neither duplicates food nor replenishes consumed stock. Extra existing foods can make the total exceed 200. The addition commits in one IndexedDB transaction; exceeding snapshot capacity rejects the whole addition. The control and sample modules are removed from production builds and are unavailable in ordinary offline `pnpm dev` mode. Each browser has its own local kitchen, so load it in the browser you want to test.

The launcher reads the existing deployed model settings and SSM parameter name using the owner's AWS profile (`AWS_PROFILE`, default `terraform`), with public resource settings from `config/production.json` (`PANTRIDGE_DEPLOY_CONFIG` overrides it). The backend reads the existing OpenAI key into server memory from SSM only when a request needs it. It never writes the key to a file or sends it to the browser. The local runtime needs only SSM read access after configuration discovery; it does not provision or expand permissions.

Inventory, shopping, recipes, plans and cooking history use a separate IndexedDB database, cross-tab channel and authentication-storage prefix. Cloud synchronization is disabled. API caches and counters are under ignored `artifacts/local/cache`, with atomic writes and serialized quotas. The development bundler replaces the cloud cache module and refuses a bundle containing production database/access modules. The server rejects production table configuration. Test requests never read or write production kitchen, access or product tables.

Both servers bind to loopback. The API checks Host and Origin, requires JSON POST requests and a random per-process bearer nonce, and provides that nonce only to a same-origin browser fetch. Foreign websites, cross-origin preflights, missing nonces and DNS-rebinding Host headers are rejected before any provider call. Restarting the backend invalidates its nonce; reload the preview afterwards. The nonce is not a Google identity or an OpenAI key. Other processes already running on the owner's machine remain inside the local development trust boundary.

Local testing permits at most 20 paid AI attempts per UTC day, shared by recipe, nutrition and barcode refinement, with structured validation. Recipes request up to three concise, distinct ideas, constrain ingredient names in the generated schema, and cap output at 2048 tokens. Recipe provider calls have a fifteen-second timeout; other provider calls retain eight seconds. Limits persist across restarts. Local request counters also cap 60 requests per minute and 240 per UTC day. These local budgets are separate from production's AWS counters; calls still bill the existing OpenAI account. Never increase limits or reset counters to bypass the test budget. Open Food Facts remains an external service for barcode lookup.

Manually test the real app at desktop and phone widths, including recipe suggestions, review/save, missing shopping ingredients, planning and explicit cooking review. Opening, suggesting, saving and planning recipes never deduct stock. Inspect persisted changes after reload and offline. Automated tests are additional evidence. Local developer access does not verify the real Google sign-in, cross-device sync or deployed AWS integration; verify those separately before release when affected.

## Verification on October 6, 2026

The actual local browser was manually operated at 1280×900 and 390×844. A live recipe was reviewed, saved, reopened after reload, checked for substitutions, added to shopping and planned. A cancelled half-package cooking review left stock at one; explicit confirmation deducted exactly 0.5 and persisted after reload. Phone and desktop layouts were visually inspected separately from automated tests.

The original multi-recipe request hit the eight-second provider cutoff. A diagnostic response received with a temporarily extended deadline took 8.981 seconds and failed recipe validation. A subsequent single-recipe experiment constrained ingredient names in its schema while retaining validation. Three fresh validated provider responses took 4.217, 5.670 and 3.757 seconds, using 369, 436 and 359 output tokens respectively. The last request included 40 ingredient entries in one AI request, not an inventory storage limit; the complete local HTTP request took 3.808 seconds, and its cached repeat took 7 milliseconds. The owner subsequently requested up to three recipes with a fifteen-second provider deadline; the recipe client remains bounded at 20 seconds. The single-recipe samples do not establish performance of the restored multi-recipe configuration or a latency guarantee. The subsequent grouped request implementation removes the alphabetical cutoff; the original timings do not describe that grouped behavior.

After restoring up to three recipes, a fresh real request returned three validated recipes in 9.039 seconds, using 683 input tokens and 798 output tokens (including 150 reasoning tokens). The actual browser was used to generate them, open ingredient and method review, and cancel without saving. The three-result list was inspected at 1280×900 and scrolled through at 390×844. `pnpm check` passed again with 283 unit tests. This is one multi-recipe timing sample, not a performance guarantee; no new grouped-ingredient behavior is claimed.

A real nutrition estimate returned in 2.974 seconds and was reviewed before saving. A real Open Food Facts lookup of a test barcode showed its 400 g package, brand and package nutrition before an explicit pantry addition. Camera capture was not manually tested; barcode entry was used. No live Google sign-in or cross-device cloud synchronization is claimed.

`pnpm check` passed with 283 unit tests. The production-build Chromium suite passed 58 tests with one intentional skip. The dependency audit reported no known vulnerabilities. Local security tests reject foreign origins, preflights, missing/wrong/stale nonces, non-JSON requests, oversized bodies and DNS-rebinding Host headers; quota tests cover concurrent requests and restart persistence. Database tests prove namespace isolation and prohibit production activation. No AWS configuration was applied and no application was deployed.

## Grouped recipe tests on October 6, 2026

The local grouping scans every eligible food record. Compatible rice and bean varieties and pasta shapes share names, with cooking details retained. Preparation and dietary distinctions remain separate. No amounts are summed or sent; exact quantities stay in local matching and explicit cooking review. Unknown names and supplies remain excluded. The request keeps the existing 16,384-byte bound, with a readable error for an oversized list; there is no silent truncation. Original snapshot food/stock capacity is unchanged. Older quantity/unit requests remain accepted during rollout.

Three fresh, sequential real requests used synthetic valid snapshots with exactly 10, 40 and 200 distinct recognized names, one positive stock lot per food. All used the deployed model setting (`gpt-5.6-luna`, low reasoning), existing SSM key, three-recipe prompt, 2048 output-token cap and fifteen-second provider deadline. Each returned HTTP 200 and three recipes passing existing structural, food-name, amount and relevance checks. No caches or quota counters were reset. One sample per size does not establish typical or worst-case latency.

| Distinct inventory foods | Groups sent | Request bytes | Complete local HTTP time | OpenAI round trip | Input / output tokens |
| ------------------------ | ----------- | ------------- | ------------------------ | ----------------- | --------------------- |
| 10                       | 6           | 229           | 9.422 s                  | 9.132 s           | 713 / 926             |
| 40                       | 28          | 722           | 9.837 s                  | 9.815 s           | 886 / 989             |
| 200                      | 177         | 3838          | 9.745 s                  | 9.689 s           | 2184 / 1043           |

Output tokens include 74, 118 and 168 reasoning tokens respectively. Provider timings include transport and generation; queue, prefill and generation were not measured separately. The first complete request also includes cold server credential/cache work. Run `node scripts/local/benchmark.mjs --dry` for fixture counts only, or omit `--dry` to make quota-controlled calls with the local preview running. Identical repeats may use the private local cache.

Separately, the actual browser was manually operated at 390×844 and 1280×900. The compact All recipes index included four authored built-in starters and saved AI recipes; title search opened Tomato pasta. A real grouped request returned three validated ideas. A generic Beans ingredient required an explicit choice; cancelled review left the saved recipe count and stock unchanged. After adding an isolated test pinto-bean package, a cached suggestion offered both black beans and pinto beans. Selecting pinto beans, reviewing and saving persisted the exact name after reload. Cooking review included pinto beans rather than black beans. Cancel kept pinto beans at one package; explicit confirmation of a 0.25 deduction left 0.75, while black beans remained one and rice remained 0.5. Reload preserved these results. Desktop and phone layouts were inspected in addition to these manual actions.

The grouped version passed `pnpm check` with 286 unit tests and the production-build Chromium suite with 60 passed and one intentional skip. No infrastructure, auth callback, production CORS or deployment changed. Google sign-in and live AWS sync remain unverified by this isolated local mode.

## Larger local kitchen verification on October 6, 2026

The sample loader passed `pnpm check` with 289 unit tests and the production-build Chromium suite with 60 passed and one intentional skip. The browser suite checks that production Settings has no sample loader; the generated production assets contain neither its control text nor sample IDs. Unit coverage checks 200 distinct recognized names, varied artwork and storage, retained existing data, repeat loading after stock consumption and capacity rejection.

Manual browser clicks loaded 193 missing foods alongside eight existing foods, yielding 201 stocked items. A repeated click added none; reload preserved the 201-item kitchen. Pantry layout was visually inspected at 1280×900 and 390×844, and search found a sample Cumin package. Existing recipes, six shopping rows and previously reviewed quantities remained visible. The cookbook recalculated availability, and a real local API suggestion request using 177 eligible food groups returned Lemon Salmon with Vegetable Rice, Red Lentil Tomato Soup and Creamy Spinach Mushroom Pasta. Closing the suggestions and reloading saved no recipe and deducted no inventory. These are synthetic test packages, not package-label or nutrition measurements.

The earlier size experiment tested grouped requests only: even 200 source foods still sent 177 groups. Similar provider round-trip times do not establish a latency improvement from grouping or identify a particular generation phase as the bottleneck. A direct grouped/ungrouped comparison with repeated samples remains necessary to measure its speed or suggestion-quality benefit.

## Cookbook browsing and sourced collection verification on October 6, 2026

The new cookbook has 104 built-ins (100 attributed published-recipe adaptations plus the four
original starters). Local checks passed 294 unit tests; the production-build Chromium suite
passed 61 tests with one intentional skip. The dependency audit reported no known vulnerabilities.
Tests cover catalog identities, rating thresholds, source container quantities, optional metadata,
edited-estimate removal, upcoming-date ordering, ingredient search, quick filtering, saved-only
preference persistence, attribution, per-portion nutrition and cooking cancellation.

The real local browser was operated at 390×844 and 1280×900 using the existing 201-food sample
kitchen. Manual actions hid/re-enabled the built-in collection, reloaded the saved-only view,
changed sorting, filtered to thirty-minute recipes, searched and opened Hearty Black Bean
Quesadillas, reviewed its original source/rating and nutrition, saved it, changed servings and
opened its missing-ingredient shopping review. Cooking review showed unknown-size packages at
zero use and required explicit confirmation; Cancel without changes returned to the recipe.
The existing six shopping rows remained because the shopping-add button was not submitted.
The quieter View control also opened the import dialog, which was cancelled without saving.

A synthetic October 9 date was entered on the local eggs package and visibly persisted. Egg
recipes then led the list with Use soon badges. The recipe intro stayed visible for every view.
The AI entry point still opened the existing reviewable suggestion dialog with 177 eligible food
groups; this UI/catalog change made no additional paid request and changed no grouping or timeout.
Earlier real OpenAI timings and requests above remain the live-call evidence. Screenshots in
ignored `artifacts/review/` supplement these manual actions; screenshots alone are not a usability
test. This isolated mode does not verify Google sign-in or live AWS kitchen synchronization.

Publisher nutrition has incomplete coverage: one new chicken recipe omits carbohydrate, and the
four original authored starters have no publisher nutrition. Unknown values are not invented.
The bundled catalog adds client code/data and triggers Vite's existing 500 kB chunk-size warning;
the limit was not raised. No application deployment or infrastructure change was performed.
