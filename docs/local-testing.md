# Local API testing

For the complete sync/database/worker setup without Google login, use
[full local integration](development/full-local-testing.md). It supersedes `dev:connected` for
testing background work, cross-device persistence and account boundaries.

## Actual batch-size comparisons

The later [October 7 batch experiment](experiments/batching-2026-10-07.md) tests 10, 40, 100 and
200 items per provider request, with paired formats, repeats, quality scores, token usage and
bounded concurrency. It supersedes interpreting the earlier twenty-ten-item-call timing as a
200-item single-request result. The experiment launcher permits an explicitly bounded local-only
allowance of 100 calls/day while retaining counters; ordinary connected development remains at
50 and production budgets are unchanged.

## AI standardization verification on October 7, 2026 (not deployed)

Release preparation subsequently passed 412 unit tests, 73 Chromium tests and 59 WebKit tests
(one existing skip in each browser suite), plus twelve mocked Terraform tests. WebKit first
exposed a shopping artwork test race: the saved row became visible before the dialog's history
transition finished, and immediate reload restored that dialog. The test now waits for closure
before reload; its artwork and persistence assertions and timeouts remain intact. API, auth and
disabled classification worker bundles are imported in a fresh Node process during the build.

After the owner selected a 25-item limit, a fresh 25-product request through the isolated API
completed in 9.114 seconds (25 unique inputs, zero reused, zero failures). Repeating the same
request reused all 25 results in 21 milliseconds. Reproduce with
`node scripts/local/standardization-benchmark.mjs 25 --verify-25`; its stable evaluation source ID
preserves cache reuse on repeat. The first response is saved separately under ignored
`artifacts/local/standardization-25-first.json`. No counters or caches were cleared.
This used the remaining previously authorized 100-call local allowance, not increased production
budgets. It is one practical full-format run under the unchanged 2,048-token/15-second limits.

Manual desktop testing at 1280×900 clicked the updated classification button: the isolated
kitchen went from 77 to 52 pending items. At 390×844, a reload retained 52 pending; expanding
and scrolling the recognition section kept its list and button usable. Screenshot:
`artifacts/review/batch25-phone.png`. These actions exercised the local client and IndexedDB,
not the AWS worker. Unit coverage verifies the worker processes 26 targets as 25 then one,
and that long UTF-8 metadata leaves an intact remainder under the request byte limit.

The isolated connected frontend/API use the existing server-managed SSM key in memory. Production
authentication, budgets and tables remain unchanged. Settings → Food recognition has a local-only
25-item test button (fewer for large metadata). It exercises the real provider and persists annotations in isolated IndexedDB;
it does not simulate the AWS scheduler. Local AI allowance remains at least 50 attempts/day, with
the existing persistent counters intact. No cache or quota counter was reset for these experiments.

`node scripts/local/standardization-benchmark.mjs 10|25|40|200` uses 25 ordinary/branded fixtures,
repeating them for larger batches. `--distinct` instead uses up to 200 distinct registry identities
with synthetic package names and explicit preparation evidence. This second set tests bounded
throughput and consistency, not recognition of 200 independent real-world brands. Requests are
sequential batches of at most 25. Reports stay under ignored `artifacts/local/`.
The earlier measurements below used the then-current ten-item implementation and twenty fixtures.

| Run                                                      | HTTP batches / provider calls | Total HTTP time | Reused items | Failed batches |
| -------------------------------------------------------- | ----------------------------- | --------------- | ------------ | -------------- |
| 10 ordinary/branded, initial prompt                      | 1 / 1                         | 6.704 s         | 0            | 0              |
| 40 entries, 20 distinct ordinary/branded, revised prompt | 4 / 2                         | 11.368 s        | 10           | 2              |
| 200 entries, same 20 products, subsequent retry/reuse    | 20 / 1                        | 5.344 s         | 190          | 0              |
| 200 distinct synthetic packages, first pass              | 20 / 20                       | 61.808 s        | 0            | 1              |
| 200 distinct, final schema retry/reuse                   | 20 / 1                        | 3.891 s         | 190          | 0              |
| 10 distinct, warm after backend restart                  | 1 / 0                         | 0.019 s         | 10           | 0              |
| 40 distinct, warm after backend restart                  | 4 / 0                         | 0.113 s         | 40           | 0              |

The 40-entry run rejected one inconsistent provider batch (502); its immediate duplicate encountered
the sixty-second cache lease (409). The later 200-entry run successfully retried it. The first distinct
run likewise rejected one inconsistent batch; all 190 accepted IDs matched expected fixture IDs.
An intermediate stricter schema used unsupported `oneOf` and received provider HTTP 400 (local 503).
The final schema uses supported nested `anyOf`, enforces status/identity consistency and disallows
`any` product preparation. Its retry completed the remaining ten; all 200 final fixture IDs matched.
Rejected output was not saved. This small fixed evaluation does not establish production accuracy
or a latency SLA. Observed first-pass distinct batches took 2.585–4.526 seconds each, including the
rejected batch; the existing fifteen-second provider deadline was not increased.

Ordinary fixtures recognized microwave brown rice as cooked brown rice, unsalted canned beans as
canned black beans, penne as penne, and frozen broccoli as broccoli/frozen. An earlier prompt had
wrongly reported frozen broccoli as a taxonomy gap; removing default preparation from candidate
identities and explicitly separating the two axes corrected it without a product-specific rule.
Rice-and-pasta mixes and burritos remained composite. Cereal/crackers did not become cinnamon,
tomato or basil. Wipes were nonfood, vague pouches unknown. Oats, almond milk and teff exposed real
registry gaps. Curry roux received an explicit gap rather than being forced to curry powder.

Required checks: pinned pnpm 10.32.1 frozen install; `pnpm check` with 401 unit tests; production-build
Chromium 73 passed/one existing skip; WebKit 59 passed/one existing skip. The WebKit configuration
excludes simulated offline tests; Chromium covers new offline recognition persistence and zero
matching API requests. Terraform fmt/validate and twelve mocked tests passed, with existing
provider deprecation warnings. No blanket artwork decoding or timeout increases were introduced.

Manual browser work at 1280×900 and 390×844 added an unfamiliar food to the existing isolated
sample kitchen, opened the pending list, ran a real ten-item classification, inspected a saved
taxonomy-gap explanation, saved an exact-name correction and verified it after reload. Cookbook
ingredient amounts and the explicit cooking review were opened; cancellation retained quantities.
The phone recognition panel and correction controls were visually inspected. Existing sample data
was preserved; the manual test added one food and corrected the local hazelnut spread identity.

Unit tests cover semantic edits during requests, manual descriptors/measurement edits, unchanged
quantity preservation, recipe-editor stale saves, generation-aware completion/failure, durable
lease recovery, quota retry, suspension and verified owner cache isolation. Actual storage-command
tests assert revision/account/identity conditions in one transaction and no unconditional fallback
after rejection. Public catalog tests cover reverse completion and source metadata changes during
publication, preventing an older result from replacing newer barcode evidence. These are local/mocked
checks: live AWS closed-app processing, real Google account
switching and cross-device cloud sync remain rollout verification requirements after manual
infrastructure deployment. An additional public barcode→classification→name-catalog live probe
stopped at the existing local daily quota (HTTP 429) before classification; that extra end-to-end
probe is not claimed as verified. No quota was raised or reset. The independent reviewer confirmed
the final pointer-race fix and reported no remaining blocker in the focused review. No production
application or infrastructure was deployed.

Install the repository's pinned pnpm dependencies with `pnpm install --frozen-lockfile`, run `pnpm check`, then `pnpm dev:connected`. Open the exact printed Local URL: **http://127.0.0.1:5175/**. The fixed frontend port and backend port 4175 must be free. Ordinary `pnpm dev` remains available for offline use.

This runs the app and current recipe, barcode and nutrition API code locally. Google sign-in and cloud sync are disabled in this development mode. No Cognito callback, CORS, IAM or infrastructure change is required. Production builds cannot activate local testing, and retain their existing sign-in and API validation.

For a larger test kitchen, open **Settings → Load 200 sample foods** in this mode. It adds missing foods from a fixed, recognized 200-name set with varied artwork, storage and synthetic package sizes and quantities. Existing food names, stock, recipes, plans, shopping and outbox entries are preserved. Repeating the load neither duplicates food nor replenishes consumed stock. Extra existing foods can make the total exceed 200. The addition commits in one IndexedDB transaction; exceeding snapshot capacity rejects the whole addition. The control and sample modules are removed from production builds and are unavailable in ordinary offline `pnpm dev` mode. Each browser has its own local kitchen, so load it in the browser you want to test.

The launcher reads the existing deployed model settings and SSM parameter name using the owner's AWS profile (`AWS_PROFILE`, default `terraform`), with public resource settings from `config/production.json` (`PANTRIDGE_DEPLOY_CONFIG` overrides it). The backend reads the existing OpenAI key into server memory from SSM only when a request needs it. It never writes the key to a file or sends it to the browser. The local runtime needs only SSM read access after configuration discovery; it does not provision or expand permissions.

Inventory, shopping, recipes, plans and cooking history use a separate IndexedDB database, cross-tab channel and authentication-storage prefix. Cloud synchronization is disabled. API caches and counters are under ignored `artifacts/local/cache`, with atomic writes and serialized quotas. The development bundler replaces the cloud cache module and refuses a bundle containing production database/access modules. The server rejects production table configuration. Test requests never read or write production kitchen, access or product tables.

Both servers bind to loopback. The API checks Host and Origin, requires JSON POST requests and a random per-process bearer nonce, and provides that nonce only to a same-origin browser fetch. Foreign websites, cross-origin preflights, missing nonces and DNS-rebinding Host headers are rejected before any provider call. Restarting the backend invalidates its nonce; reload the preview afterwards. The nonce is not a Google identity or an OpenAI key. Other processes already running on the owner's machine remain inside the local development trust boundary.

Local testing permits at least 50 paid AI attempts per UTC day, shared by recipe, nutrition and barcode refinement, with structured validation. Recipes request up to three concise, distinct ideas, constrain ingredient names in the generated schema, and cap output at 2048 tokens. Recipe provider calls have a fifteen-second timeout; other provider calls retain eight seconds. Limits persist across restarts. Local request counters also cap 60 requests per minute and 240 per UTC day. These local budgets are separate from production's AWS counters; calls still bill the existing OpenAI account. The owner authorized the local minimum of 50; existing counters remain intact. Production per-account quotas are unchanged. Cookbook matching is local and consumes no AI quota. Open Food Facts remains an external service for barcode lookup.

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

## AI recipe preview verification on October 6, 2026

AI ideas now open as a read-only recipe instead of an editor or initial ingredient chooser.
The preview has compact ingredients and preparation notes, numbered steps, a collapsed kitchen
match/substitution section, and a fixed Save/Edit footer. Required generic-food choices occur
when saving. Optional editing retains that choice validation and returns to view mode.

`pnpm check` passed with 294 unit tests; the production-build Chromium suite passed 62 tests with
one intentional skip. Updated browser assertions cover no visible input controls on initial
preview, accessible disclosure, saving without editing, later editing, generic choice validation
through either save path, unchanged stock, and two delayed-save/draft-preservation cases.

A real request through the isolated local API returned Spinach, Mushroom, and Feta Frittata;
Tomato, Bean, and Egg Skillet; and Lemon Salmon with Couscous and Asparagus. At 390×844, manual
clicks opened the salmon recipe in the new view, expanded/collapsed kitchen matches, saved
directly, then explicitly edited its title to Weeknight lemon salmon and returned to view.
Displayed salmon and couscous stock remained 750 g, and asparagus remained 1,000 g.
At 1280×900, the frittata opened in view mode before its Eggs/Egg choice appeared on Save;
selecting Eggs saved it and returned to the read-only recipe. Existing shopping still had six
unchecked rows. No cooking deduction or shopping addition was submitted. Grouping, request
limits, timeout, authentication, credentials and deployment settings are unchanged.
Reload preserved both newly saved recipes; search opened Weeknight lemon salmon in the normal
saved-recipe view. Screenshots supplement these manual interactions rather than replacing them.

## Recipe customization verification on October 6, 2026

Optional meal directions, device-scoped dietary preferences, exact-food family members,
compatible cookbook foundations, measured variations and calculated nutrition are implemented.
See [recipe customization](recipe-generation-ideas.md) for behavior, assumptions and API fields.

`pnpm check` passed with 311 unit tests in 56 files. The production-build Chromium suite passed
65 tests with one intentional skip. The high-severity dependency audit found no known
vulnerabilities. No assertion, timeout, paid quota or security gate was weakened.

The additional local Windows WebKit run passed 52 tests with one intentional skip and two
failures. All cookbook cases, including the three new customization cases, passed. The
fridge-animation case received equal original/transformed door heights instead of the asserted
perspective expansion. The nutrition sign-in/package-label case did not receive its mocked
Ground beef stock after anonymous-to-signed-in navigation. Both failures repeated in a focused
rerun and in an isolated archive of the unchanged `17df489` committed baseline using the same
pinned dependencies. They predate these customization changes on this local WebKit runtime.
Their causes remain unresolved; this is not a claim that the entire WebKit suite passed
or that the change was release-ready at that point. Chromium passed both assertions. That run
blocked release verification; the follow-up below records the causes and resolution.

Four real requests used the loopback API and existing server-managed key with synthetic foods
and preferences. Every request retained 200 eligible exact names inside 177 compatible groups:

| Request                                                      | Provider time | Input tokens | Output tokens | Ideas |
| ------------------------------------------------------------ | ------------- | ------------ | ------------- | ----- |
| Quick/high protein; synthetic celiac exclusion and equipment | 13.328 s      | 3,783        | 1,095         | 3     |
| Quick; before legacy foundation eligibility was tightened    | 10.007 s      | 4,023        | 973           | 3     |
| Quick; curated-food whitelist and foundation eligibility     | 12.060 s      | 4,042        | 1,034         | 3     |
| Quick; restarted final API validation                        | 11.640 s      | 4,190        | 1,122         | 3     |

The last result selected the saved Simple scrambled eggs variation as a cookbook foundation,
retaining its four-step method and 4 eggs/0.75 tbsp olive oil ratio. The other ideas were tomato
and pepper eggs and sesame egg fried rice. This verifies live saved-recipe grounding; it does
not claim that a curated publisher foundation was selected in these requests. Provider timings
are individual samples, not guarantees; the existing 15-second provider deadline remains.
The first batch included 25-minute ideas despite Quick's 20-minute target and incomplete protein
coverage. Fit details expose misses/unverified targets instead of asserting the goals were met.

Manual clicks at 390×844 and 1280×900 exercised directions, advanced preference disclosures,
diet choices, real generation, read-only preview, stock selection on Save, subsequent editing,
substitution Apply/Undo, Spice it up, nutrition-before-Apply, explicit saving, shopping review,
meal planning, cancellation and confirmation of a fractional cooking review. Reload preserved
saved changes, shopping, plans and the exact deduction. Screenshots in ignored
`artifacts/review/` supplement these interactions; screenshot inspection alone is not a manual
usability test.

The saved fried rice variation added 0.125 tsp cayenne and 100 g canned chickpeas explicitly.
Its measured known nutrition subtotal was 494.8 kcal, 20.2 g protein, 66.4 g carbohydrate,
16.1 g fat, 304.6 mg sodium and 6.9 g fiber per serving. Green onions had no supported count
weight and remained missing; the UI marks these values partial and macro targets unverified.
Previewing the chickpea addition and applying it produced the same subtotal. A cooked-rice
swap initially inherited dry brown rice's extra cooking time; manual testing caught it, and
the corrected cooked-grain rule adds no dry-rice cooking delay.

Opening, applying, saving and planning did not deduct stock. Explicit Add 8 shopping items
changed unchecked shopping rows from 6 to 14. A canceled 0.125-pack carrot deduction left its
1-pack stock intact. A later acknowledged confirmation changed only carrots to 0.875 packs;
all other reviewed lots were zero. Reopening after reload retained 0.875 and left Eggs at
1 carton. No new deduction occurred on reopening. A synthetic milk exclusion prevented
cooking and saving scrambled eggs with butter. Applying 0.75 tbsp olive oil removed the known
conflict; saving still required explicit label/preparation acknowledgement.

The 102 bundled USDA profiles and package labels calculate estimates; unknown foods or
portions remain incomplete. No model-generated numeric nutrition is accepted, no real recipe
was taste-tested, and ingredient-name screening cannot certify allergy/celiac safety. The main
bundle is about 734 kB minified / 192 kB gzip and retains Vite's existing chunk-size warning.
No Google sign-in, live account synchronization, application deployment or Terraform apply was
performed by this isolated local test. Preferences do not sync to cloud kitchens.

## WebKit failure investigation and resolution on October 6, 2026

Both failures came from the test environment. The app's door CSS, optional Google sign-in,
nutrition logic and production service worker were not changed.

Native Windows WebKit is launched with `--disable-accelerated-compositing` by Playwright's
[default argument handling](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/webkit/webkit.ts).
A minimal page independent of Pantridge reproduced the missing parent perspective and reported
`(-webkit-transform-3d)` false, despite parsing the perspective property. The app's paused door
had a 137 px height instead of the projected 193.104 px height. Removing that graphics flag
restored actual perspective and backface rendering and passed the unchanged geometry,
viewport-width, animation-duration and reduced-motion assertions.

The graphics override is limited to the storage-rendering test file on Windows. Enabling it
globally exposed an additional Windows WebKit keyboard interaction failure in the shopping test;
scoping it retains Playwright's default environment for other cases. macOS WebKit configuration
and the production browser gate remain unchanged. No geometry assertion was removed or skipped.

The nutrition case first visited anonymously, then navigated with a simulated signed-in session.
After the service worker claimed that page, WebKit bypassed its page-level kitchen mock and
attempted to resolve `api.pantridge.test`. Instrumentation recorded zero mock calls and
"Could not resolve hostname"; Chromium intercepted the same fixture successfully. This is a
[documented routing limitation](https://playwright.dev/docs/network#missing-network-events-and-service-workers).
Only this auth/package-label test now blocks service workers in its isolated context. Its
anonymous sign-in requirement and signed-in package-label precedence assertions are unchanged;
the separate offline/cache and origin-outage tests retain service workers and passed.

Final verification: `pnpm check` passed with 311 unit tests; the production-build WebKit suite
passed 54 tests with one intentional camera skip, and Chromium passed 65 with one intentional
origin-outage skip. The two identified failures are resolved. Manual local clicks additionally
opened the fridge using Enter, inspected the nutrition tab at phone width and navigated to the
separate freezer. These manual checks made no inventory write; no paid AI request was made in
this follow-up. Native
Windows WebKit testing is still not a claim of manual testing in actual Apple Safari.

The changes remain in draft PR #29. No merge, deployment or Terraform operation was performed.
