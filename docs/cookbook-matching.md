# Local ingredient identities and kitchen-first recipes

Cookbook matching is entirely local and offline. Opening the cookbook, editing inventory,
changing filters, or adding groceries makes no OpenAI matching call. There is no background
matching endpoint, queue, timer, opt-in, or paid matching cache. Explicit recipe generation,
barcode refinement and nutrition estimates retain their existing optional API behavior.

## Shared identities

The append-only ingredient registry gives inventory and all 104 built-in recipes the same
canonical IDs. Whole-name aliases and explicitly listed preparation/quality modifiers are
deterministic. Generic rice accepts listed rice varieties; a white-rice requirement does not
accept brown rice. Different beans, milk alternatives, powders and composite products remain
distinct. Cinnamon cereal is not cinnamon; tomato-and-basil crackers are neither ingredient.
Artwork and arbitrary substring/fuzzy similarity are never identity evidence.

Unrecognized exact names receive a stable local custom identity, initially requiring review.
Users can choose a catalog ingredient or confirm an exact custom name through collapsed
**Recipe matching** controls in food, package and recipe editors. Renaming a food or ingredient,
or editing an ingredient note, clears the previous explicit descriptor so it cannot become stale.
Registry IDs must not be removed or reassigned after release, because they can be saved in backups.

Each descriptor separates identity, preparation and quantity basis. A stock lot can override
its generic shelf identity. Recognized product names preserve their more-specific variety and
preparation; unknown branded/composite descriptions require review even when the shelf name
is known. An explicit package classification can confirm that evidence. Household supplies
and zero-quantity lots cannot qualify recipes.

## Quantities and review

Cooked rice is present for a dry-rice recipe, but cooked grams are never counted as dry grams.
Net can weight is not drained weight. Primary recipe notes establish preparation and drained basis;
only an explicit declared whole-can size establishes measurement before draining. Unknown
preparation, ambiguous garlic counts, missing package sizes and incompatible units require
review. No cooking yields, density conversions or allergen guarantees are inferred.
Alternative clauses do not change the primary ingredient's preparation or reuse its amount for a substitute.

**Recipe amount per package** can store a measured usable amount on a lot. It is tied to its
reviewed basis and cleared when effective identity/preparation/basis changes. Cooking review
shows the measured amount alongside the original package label. Food and lot signatures
protect against stale classifications, measurements, product metadata and quantities.
Only explicit, reviewed, idempotent cooking transactions deduct stock.

Availability, ranking, shopping, planning, cooking and package nutrition share the local
resolver. Nutrition labels for uncertain preparations or measured drained portions cannot
be presented as authoritative recipe nutrition. Known same-dimension conversions preserve
six-decimal stock quantities; shopping counts remain whole packages.
Generic nutrition profiles honor reviewed canonical preparation, including cooked versus dry rice;
unsupported or conflicting evidence stays partial instead of receiving a guessed total.

Shopping combines canonical requirements across ordinary notes before rounding package
counts. Dry/cooked or net/drained requirements remain separate, including one-time shopping
rows and meal plans. Uncertain present stock is not automatically sent to shopping. Missing
drained/edible amounts create explicit quantity-review entries rather than inventing yields
from future purchased net weights. One-time ingredient descriptors survive put-away review.
Shopping packages are reserved across overlapping generic/specific requirements, so the same purchased
amount cannot satisfy two different recipe rows. Changes in descriptors invalidate a stale shopping review.
Shared residual-capacity allocation can reassign an earlier broad requirement to other compatible lots
when a narrower requirement needs that stock. Mass, volume and count stay separate; required ingredients
allocate before optional ones. Source lots follow global expiry/id order. Package units remain review-only;
crossed measurement dimensions with unresolved shared capacity require review rather than invented conversions.

## Persistence and presentation

Optional `ingredient` fields on foods, lots, recipe ingredients and shopping rows preserve
version-one inventory-only snapshots. Lots optionally store `ingredientSize` and its basis.
The shared mutation schema adds `stock.classify` and `stock.recipeAmount`; both commit through
the existing IndexedDB/outbox transaction and authenticated account isolation. Updated clients
are needed for these new commands. Legacy cooking without a lot signature cannot apply to
newly classified, measured or branded lots; it must be reviewed using the updated app.

Recipes without stocked required ingredients stay hidden until **View → Show recipes without
matches** is enabled. Complete ingredient presence and reviewable amounts lead; missing rows
appear below **Partial matches**. Source, search, time and use-soon filters retain this scope.
Shelf date badges still show only the next seven days or past dates; full dates remain editable.

## Verification

Local matching benchmark, one cold and one warm calculation over all 104 built-ins:

| Stocked foods | Cold calculation | Warm calculation |
| ------------- | ---------------- | ---------------- |
| 10            | 14.46 ms         | 3.77 ms          |
| 40            | 10.99 ms         | 5.97 ms          |
| 200           | 30.40 ms         | 14.11 ms         |
| 600           | 84.04 ms         | 38.61 ms         |

These desktop Node measurements exclude rendering and are not phone latency guarantees.
All calculations used zero matching API calls. No quota counters were reset.

Manual browser testing used the isolated 201-item local kitchen. A cooked-rice classification
and measured 300 g package amount survived reload and immediately updated recipe availability.
Cancelled cooking preserved stock; explicit confirmation of 0.25 package deducted 75 g from
only that test lot. Desktop and phone layouts were inspected separately from automated tests.
The regression suite also covers composite false positives, per-lot preparation, drained
weights, stale review, semantic shopping aggregation, offline recipe editing and zero matching
requests. No live Google sign-in or cross-device sync claim is made by these local tests.
Manual shopping review added only the missing soy-sauce row, with no stock increase. Editing primary
preparation notes produced confirmed cooked-rice and canned-bean amounts immediately and after reload.
`pnpm check` passed with 365 unit tests; the production-build Chromium suite passed 71 tests with its
existing single platform-specific skip. An independent adversarial review found and verified regressions
for overlapping shopping quantities, crossed variety/preparation capacities, stale descriptors, ambiguous
counts, package-unit review and cooked/dry nutrition.
The local WebKit configuration passed 59 tests with its Windows camera skip; its simulated-offline
exclusions are unchanged. The macOS WebKit release gate additionally runs after merging to main.
Reload tests wait for dismissed dialogs' asynchronous history transitions before reloading, and the
cross-tab cooking test returns focus to the review tab. These synchronization checks preserve all
behavior assertions and existing timeouts; three affected tests also passed three repetitions each.
The first macOS gate exhausted the total test budget on combined artwork decoding, dense whole-page
accessibility scans and interaction checks. Accessibility scans now have focused tests with the same
form state and scope; selected artwork rendering and persistence checks remain. The owner requested
removing the blanket catalog decode test; generated artwork validation remains in `pnpm check`.
Collapsed ingredient selectors mount their catalog only when opened, preserving controlled draft values.
The macOS WebKit runner uses two workers to reduce competing scans, with all timeouts unchanged.
