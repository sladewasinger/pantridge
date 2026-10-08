# Recipe generation and customization

The cookbook customization keeps its
single primary list, use-soon default, optional built-in collection and view-first AI previews.

## Optional meal direction

Suggest with AI offers Quick, High protein, Lower carb, Comfort and One pan, with up to three
selected together. Defaults are 20 minutes, 30 g protein and 30 g carbohydrate per serving.
More preferences holds explicit targets, meal, cuisine, equipment, a short cooking request,
dislikes and dietary exclusions. Use dated ingredients first is enabled initially.

The provider returns up to three distinct ideas. Fit & nutrition is collapsed on each result;
the recipe preview remains read-only. Time misses are reported. Macro targets are verified
only against complete calculated estimates; partial data is marked unverified. Goals are
guidance, not a constraint solver or a promise that a combination can be satisfied.

## Exact foods and cookbook foundations

Every eligible food name stays inside its compatible family, for example
`Rice: ["Brown rice", "White rice"]`. Canned/dried, raw/cooked, frozen/fresh and dietary forms
stay separate. No alphabetical truncation, stock quantities, package IDs or account identity
are sent. Supplies, unclear names, zero stock and past-date-only foods remain excluded.

The client ranks up to three compatible curated or saved recipe foundations by available
ingredients and use-soon reminders. Legacy unsourced built-ins are excluded from grounding.
Complete measured foundations must fit existing ingredient/method/time bounds; baking,
unknown package amounts and unmeasured extras are excluded. If request space is tight,
optional foundation context is reduced before inventory; inventory is never silently dropped.
The request accepts up to 600 legacy food identities and retains its 16 KiB bound, with a visible
error if exceeded. New kitchen food growth is capped at 500. Saved generated ingredients share
the local identity system and upstream standardization described in [cookbook matching](cookbook-matching.md).

The model may select a foundation or create a new idea. For a selected foundation the server
retains the full original method and ratios, scaled to the requested servings, rather than
accepting arbitrary model changes to them. The client links the known source locally and
labels the foundation. Original ratings and publisher nutrition are not transferred to the
AI version. Requested foods, foundation keys, preferences, model and prompt participate in
the private versioned cache; repeated previews receive fresh local recipe IDs.

## Dietary exclusions and privacy

Vegetarian, vegan, gluten free, celiac-related gluten exclusion, dairy free, lactose free and
the nine major allergen exclusions remain distinct selections. Known conflicts in ingredients,
preparation notes and method/serving steps are checked. Dietary label/preparation review is
required before saving an AI preview or a variation, and before opening cooking review.
Recipe, preference and matching package changes invalidate that acknowledgement.

Names cannot prove a packaged product's ingredients, gluten-free labeling or cross-contact.
The review explicitly asks users to check these. Detection is conservative keyword filtering,
not allergen certification; unknown products can remain unresolved and require human review.
FDA references: [food allergies](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies)
and [gluten labeling](https://www.fda.gov/food/nutrition-education-resources-materials/gluten-and-food-labeling).

Preferences live in device storage scoped to the current kitchen. They are absent from kitchen
snapshots, mutation outboxes and backups, and do not automatically sync. Only selected cooking
constraints are sent to OpenAI when the user requests ideas. Reset preferences clears the
current device's choices. No medical history, identity or credentials are included in prompts.

## Substitutions and optional additions

Make it yours is collapsed in AI previews and saved recipes. Reviewed rules offer measured
available substitutions and supported shopping alternatives, with preparation consequences.
Compatible bean forms and dry pasta/rice varieties can be exchanged; changing to brown rice
adds a package-directions reminder and an approximate 25 minutes. Oil can replace butter for
supported stovetop cooking, not baking. Unsweetened plant milk and gluten-free pasta are
offered only where the rule applies and selected exclusions permit them.

Spice it up offers measured lemon, cayenne, pumpkin-seed or ready-to-eat chickpea additions
for suitable savory meals. Stocked choices sort first; other choices say Needs shopping.
The small ruleset is intentionally bounded, not a general-purpose culinary substitution model.

Apply changes only the preview. Ingredients, method, matching, shopping suggestions and
nutrition update together. Undo variations restores the base during that viewing session.
Save is separate. Changed saved recipes must be saved before planning/cooking that version.
Opening, applying, saving or planning never deducts inventory. Shopping additions and cooking
continue through their existing explicit reviews, with exact lots and idempotent cooking IDs.

## Calculated nutrition

The model provides no numeric nutrition totals. Calculations prefer consistent saved package
labels with a declared basis, then 102 selected offline USDA SR Legacy food profiles from the
April 2018 final release. Per-100-g nutrients and published portion weights retain FDC IDs and
descriptions. [USDA data documentation](https://fdc.nal.usda.gov/data-documentation/)
describes the dataset; the bundled data's README records the download and alias assumptions.

Amounts are summed and divided by recipe servings. Calories, protein, carbohydrate, fat,
sodium and fiber are shown. Package/USDA sources and portion/preparation assumptions are
available in a disclosure. USDA portion weights used for a nutrition estimate never change
stock matching or authorize mass/volume/count conversions for deductions.

Unsupported foods, ambiguous preparations, unknown portion weights, missing nutrients and
unmeasured extras remain missing. Partial values are known subtotals, not complete meal totals;
macro targets are unverified in that case. Brand changes can affect estimates. Original
unedited sourced recipes retain the publisher's estimate; edits and variations discard it and
calculate a new estimate. Calculated recipes are reassessed against current package data when
viewed or saved. Saved estimates remain usable offline.

## API and release boundaries

The existing recipe request accepts optional `inventory[].members`, `preferences` and `bases`.
Version-one recipes accept optional `generation` attribution and calculated nutrition with
missing-data/source evidence. Old snapshots keep their existing shapes; legacy request forms
remain accepted. Deploy the corresponding recipe-generation API before a frontend that writes these new fields.
Ingredient-to-recipe matching is entirely local; see [shared ingredient identities](cookbook-matching.md).

No route, Google admission policy, CORS exposure, IAM privilege, model, paid quota or timeout
was broadened. Existing limits remain 15 seconds provider / 20 seconds client and 2,048 output
tokens. Local connected testing keeps the loopback API, process nonce, separate IndexedDB
kitchen and local quotas; the existing server-managed key is never copied into frontend code.

The earlier 10/40/200 samples tested grouped requests without exact members. They do not prove
a grouping speed benefit. A new 200-exact-food request with synthetic quick/high-protein/celiac
preferences returned three ideas in 13.328 seconds of provider time; a quick request returned
three in 10.007 seconds. Subsequent quick requests returned three in 12.060 and
11.640 seconds; the last selected a saved recipe foundation. These are single samples,
not latency guarantees.

Local automated and manual verification is recorded in [local testing](local-testing.md).
Changes use the feature-to-develop-to-main release flow. Application deployment requires the owner's
instruction; Terraform applies remain manual.
