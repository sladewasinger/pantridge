# Cookbook quantities and storage

The cookbook works locally and uses the existing transactional snapshot/outbox and signed-in
kitchen isolation. Curated recipes are suggestions, separate from saved recipes and inventory.
Opening a recipe, viewing a substitution, or adding a dated meal never changes stock. No paid
AI/API call is required by these domain commands.

## Backward-compatible data

Snapshot version 1 now accepts optional `recipes` (100), `mealPlan` (180), and `cookingHistory`
(300) arrays. Their getters return empty arrays for older backups. Existing food/stock/shopping
fields remain compatible. Restoring a backup recreates recipes, plans, and historical cooking
records without replaying their deductions. Deleting a recipe removes its plans but retains
cooking history; historical records do not require the original recipe or stock lot to remain.

Stock quantities now accept up to six decimal places. Shopping quantities and normal +1/-1
adjustment deltas remain integers; put-away still requires the exact purchased integer quantity.
The existing 280,000-byte snapshot budget remains in force. Individual recipes are limited to
12,000 serialized UTF-8 bytes, cooking records to 14,000 bytes, and outgoing mutations to 16,000
bytes so accepted local changes fit the 16,384-byte API body limit.

Cooking history is intentionally capped at 300 records. The next new cooking action is rejected
before any stock change with a clear export-backup message. Records are not silently discarded:
retaining their IDs prevents a repeated cook from consuming inventory twice. Long-term archival
with durable idempotency receipts needs a future storage design; exporting alone does not remove
the cap. Snapshot capacity can be reached earlier with large records.

## Ingredient matching and measures

Matching trims whitespace, folds case, and uses a small explicit set of identity aliases, such as
`egg` / `eggs`. It never strips brand names, fuzzy-matches food names, substitutes one ingredient
for another, or treats supplies as food. Explicit `kind: supply` and legacy household artwork
are excluded via the shared supply classifier.

Declared structured package sizes or strictly parsed package labels permit same-dimension
conversions: mass to mass, volume to volume, and count to count. Cups, tablespoons, teaspoons,
fluid ounces, and gallons use US customary volume. There is no mass/volume conversion, assumed
density, carton contents, or inferred can size. A stock unit of `items` means one count; other
package-unit labels alone do not specify their contents. Imported `package` recipe amounts
always require review, preserving original container wording in the ingredient note.

Ingredient availability is `confirmed`, `missing`, or `needs-review`. Unknown package contents
produce unknown available/missing amounts rather than invented numbers. Repeated ingredients
share remaining inventory instead of each claiming the same lot. Optional ingredients cannot
mask required shortages. The seven-day urgency count excludes past dates, which are shown
separately; neither date classification is a food-safety guarantee.

## Reviewed cooking

The preview allocates known amounts from earlier-dated lots first. It proposes fractional
package use only when representable at six decimal places, without rounding an unrepresentable
fraction. Unknown sizes, missing amounts, and unrepresentable fractions require review. Optional
ingredients are not silently consumed. The user can deliberately record cooking with no tracked
stock deductions, or explicitly choose reviewed amounts.

Each submitted deduction includes the lot ID, food ID, used quantity, expected quantity,
remaining quantity, and a signature of the reviewed food/package metadata. Inside the IndexedDB
transaction and the shared API reducer, every deduction is validated before any is applied.
Changed quantities, units, package sizes, identity/classification, missing lots, duplicate lot
IDs, negative remainders, and supply deductions fail atomically. A stable cooking record ID is
idempotent across retries, even when mutation acknowledgement is lost. Different details with
an existing cook ID are rejected.

## Shopping and dated plans

Missing known amounts are converted to whole shopping packages, explicitly labeled as rounded
up. Unknown sizes become one-time rows with the recipe amount and a size/quantity review note.
Existing unpurchased rows are reused; repeated submissions do not accumulate duplicate demand.
Purchased rows do not count as inventory or as pending groceries.

Selected meal-plan shopping aggregates the scaled needs of up to 20 dated meals before
subtracting inventory or already-unpurchased groceries. This prevents two meals from each using
the same eggs, rice, or shopping row. Exact reviewed plan entries are compared again inside the
transaction; a changed date, recipe, or serving count requires another review. The resulting
shopping list is bounded to 40 ingredient rows and the mutation byte budget. Opening a planned
meal preserves its serving count. Confirmed cooking completes exactly the reviewed plan in the
same transaction; cancellation and stale-plan conflicts leave both plan and stock unchanged.

Substitutions are suggestions only and never alter matching, recipe ingredients, or stock. Their
notes require the user to consider the dish, allergens, dietary needs, and changed quantities.

## Storage and supplies

The visible **Storage** label replaces **Unspecified**, while the stored `unspecified` location
remains unchanged. An optional food `kind` distinguishes food from a kitchen supply. Legacy
household artwork infers a supply only when there is no explicit choice; choosing Food takes
precedence. Supply classification hides food-specific nutrition and freshness suggestions but
never erases existing nutrition, lot dates, or package metadata.

## Saved recipes and local imports

Manual and imported recipes are reviewed before saving. Import accepts pasted text with title,
Ingredients and Steps headings, Pantridge-shaped recipe JSON, and Schema.org Recipe JSON/JSON-LD
graphs. Numeric amounts, common units, simple fractions, and Unicode fractions are supported.
Imported container words remain uncertain package amounts. Unsupported vague amounts require
correction. Source links must use HTTPS without credentials and are stored, not fetched.

Imports stay local, are bounded before parsing, and are never executed or rendered as HTML.
Servings default to two if a supported count is absent. Review the source, amounts, servings,
and method before saving or cooking. AI recipe suggestions are an explicit, optional signed-in
action; existing optional barcode and nutrition estimates are preserved.

Backup export uses compact JSON so a valid near-capacity snapshot remains below the import
file limit. A regression test covers a snapshot whose former pretty-printed export exceeded
that limit. Restoring into a kitchen with cookbook data is refused, just as for existing food.

## Verification

`pnpm check` covers type safety, lint, structure, authored artwork, formatting, unit tests,
frontend compilation, and Lambda startup. Cookbook browser tests cover cooking/cancel,
fractional amounts, stale cross-tab stock, repeated clicks, offline reload, Back/Forward,
imports, aggregate planned groceries, accessibility, and narrow/wide layouts.

A verification-only pull-request workflow runs full checks and Chromium regressions without
AWS credentials or deployment permissions, preserving screenshots and failure traces as CI
artifacts. Production publication remains the separate main-branch workflow.

## Optional AI recipe ideas

Suggest with AI sends up to forty recognized food names, declared quantities and use-soon
flags to the existing OpenAI service. It excludes supplies, unrecognized labels, zero stock,
and lots past their recorded date. IDs, brands, exact dates, nutrition, shopping lists, and
account identity are not included in the model input. An unknown package size stays unknown.

The request uses the existing authenticated product endpoint, SSM-held key, configured model,
reasoning setting, per-user/global daily limits, and eight-second provider timeout. Recipes
have a server-only 2,048-token output cap; existing product/nutrition request defaults remain
unchanged. Cache entries are private to the account, inventory, use-up preference, and model
configuration. No new credentials, infrastructure permissions, or external tools are added.

Structured output is bounded, validated, and labeled AI-generated. The server creates IDs and
never accepts model-supplied source URLs, inventory changes, or external actions. Preview
results do not save themselves; users review a recipe in the editor and explicitly save it.
Frontend requests abort on dismissal and verify the active account around token refresh and
network completion. Kitchen matching always uses the current local inventory.

Provider behavior and authenticated browser flows are covered with mocks. Live provider
latency/quality and a real Google callback remain separate release checks; no paid calls or
production inventory changes are part of the local test suite.

## Required manual release review

Before any release, manually use the affected flows in an interactive browser and visually
inspect the result at phone and desktop widths. Automated unit/accessibility/browser checks
do not replace this review. Confirm the illustrated book and Storage layout; browse, search,
save, import, edit, and remove recipes; review missing/unknown ingredients; plan and cook a
meal with cancellation and changed-stock handling; inspect shopping notes, partial packages,
and AI request/review/error states. Check keyboard focus, dismissals, Back/Forward, scrolling,
and the small-screen layout. Use an isolated test kitchen and the authorized testing account.

If the preview or browser is blocked, the release remains blocked until a supported
interactive environment is available and the manual pass is completed.
