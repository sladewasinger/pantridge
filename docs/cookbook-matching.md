# Local ingredient identities and kitchen-first recipes

Cookbook matching is entirely local and offline. Opening the cookbook, editing inventory,
changing filters, or adding groceries makes no OpenAI matching call. Unfamiliar food names now
have a separate upstream AI standardization queue, described below. Its persisted identities
feed the same local matcher. Explicit recipe generation, barcode refinement and nutrition
estimates retain their existing optional API behavior.

## AI standardization architecture

Known local identities work immediately. Unfamiliar generic foods, branded positive stock lots,
and saved/imported/generated recipe ingredients without explicit descriptors are eligible for
standardization. Results are optional versioned snapshot annotations: identity, preparation,
status, provenance, explanation and a semantic evidence fingerprint. Manual descriptors take
precedence. Previously explicit custom identities are preserved; selecting Automatic allows
reclassification. Shopping-only text is not classified until it becomes a kitchen food.

Recognition never writes quantities, package sizes, drainage, edible fractions, nutrition or
allergen claims. Composite foods, unknown names and taxonomy gaps are explicit results, not
forced constituent matches. AI-recognized cooked brown rice and canned black beans can match
the corresponding identities locally; cooked grams cannot fulfill dry grams and net can weight
cannot fulfill drained weight. Identity is not evidence of celiac, gluten-free or dairy-free safety.
An AI result with unknown preparation still requires amount/preparation review.

The kitchen snapshot owns the durable job. Server mutation transactions schedule it ten minutes
after semantic grocery edits, capped at thirty minutes from the first pending edit. Quantity-only
changes do not postpone it. A sparse DynamoDB due index and EventBridge worker poll every minute;
the worker claims a sixty-second lease, processes at most 25 targets and commits annotations
using revision plus active account/identity transaction conditions. Processing continues with all
devices closed **after edits have synced**. Offline edits remain local until the next successful sync.
The worker examines up to five due index entries and handles one kitchen batch per invocation;
due time is eligibility, not a guaranteed completion deadline. Global budgets can add a longer wait.

Late responses recheck target fingerprints, manual corrections and measurement edits. Unchanged
quantity edits survive. Newer job generations retain their schedule after an older request fails.
Leases recover abandoned invocations. Provider failures retry with bounded backoff and stop after
three attempts; quota exhaustion waits until the next UTC day. Suspension pauses processing.
Settings → Food recognition lists pending names, scheduling and retry state. Item and recipe
Recipe matching controls explain uncertain results. Process now requests server processing;
it neither bypasses budgets nor performs matching in the cloud.
Recognition counts are separate from unsynced edits. Immediate or overdue jobs show “Queued for
processing,” never an epoch timestamp; future-day retries include their date. While the app is visible,
due or near-due active jobs refresh through normal sync every thirty seconds, subject to existing
offline and retry guards. Once recognition finishes, cloud polling returns to the five-minute idle
cadence. Failed, paused and distant retry jobs do not trigger the faster cadence.

Freshly synced unfamiliar items also receive a bounded persisted-cache lookup before waiting for
the worker: at most 25 eligible targets and 750 ms per mutation. A hit can be returned with that
mutation's snapshot. A miss or lookup failure retains the saved edit and normal durable schedule;
this path invokes no provider and publishes no catalog entries. Existing local identities and
saved annotations remain available immediately offline.

## Clarifying recognition

Settings → Food recognition separates queued work from items needing a decision. Unknown,
uncertain, composite, nonfood and taxonomy-gap results, plus known identities with unknown
preparation, can be reviewed individually. Choose an existing identity and its preparation, or
keep the exact name as a custom identity. The exact-name choice does not turn a composite into
one of its ingredients or establish confirmed recipe compatibility. No new registry entry is
created automatically, and leaving an item for later remains available.

Saving uses the additive `classification.review` mutation and the signature captured when the
form opened. Both the local and server reducer reject changed evidence, descriptors, package or
measurement metadata; an account change also prevents submission. Names, barcode/brand,
package sizes, stock quantities and dates, nutrition and unrelated recipe edits are preserved.
The chosen descriptor becomes authoritative over late AI results and works offline through the
ordinary IndexedDB/outbox flow. It is private to the kitchen and is not published to the shared
catalog or used as a cross-account alias.

Changing a package's identity/preparation clears its reviewed recipe amount and basis. Changing
a generic food clears those measurements only on lots inheriting its classification; lots with
their own manual descriptor retain both their classification and measurements. Recipe reviews
do not modify stock. Users still review applicable amounts and dietary safety separately.
See the [API command contract](api.md#recognition-clarification) for stale-write behavior.

## Shared catalog and its limits

Private names, recipe notes and user corrections are cached under verified account ownership.
Shared records are derived only from server-obtained Open Food Facts evidence, never arbitrary
client text. Normalized barcode plus evidence, prompt revision and model configuration determine
reuse. A server-owned public evidence pointer survives expiration of the shorter raw lookup cache;
fresh raw metadata takes precedence. Pointer publication atomically checks that the raw source is
still current, so a late older request cannot replace newer barcode evidence. Public evidence and recognized classifications expire after
365 days; negative classifications after 30 days. Saved kitchen annotations persist until semantic
edits or an explicit future migration. Source metadata may become stale; this is not a label-safety
database. OFF attribution and applicable ODbL obligations remain separate from private corrections.

Exact normalized-name lookup returns up to ten public candidates. It does not silently select
among ambiguous names, and standardization does not automatically reuse a name-only candidate.
Cross-app authenticated catalog lookup is possible; service-to-service credentials, an unrestricted
public API and prefix autocomplete are not part of this change. A future autocomplete can query
local aliases/private history first and shared candidate prefixes second, without AI per keystroke.
No embeddings or vector database are needed for this version. Similarity could later retrieve
candidates; it must not establish identity, amounts or dietary safety.

New food growth stops at 500 distinct food records, including zero-stock history. Existing kitchens
above 500 remain editable/removable within the previous schema bounds. Stock and shopping retain
their existing separate limits and snapshot byte bound. Shared catalog admission is additionally
capped at 100 new classifications per owner/day and 1,000 globally/day; the existing AI user/global
budgets still apply and were not increased. TTL, request bounds and quotas limit growth and spend;
500 foods alone would not protect against repeated add/delete or arbitrary lookup abuse.

Taxonomy additions require curated append-only IDs shared with recipes. Negative annotations do
not automatically become recognized when the registry grows; a versioned reclassification migration
is future work. AI quality needs continued evaluation, especially composite foods and incomplete
labels. Dense queues, index hot-partition throughput and repeated storage/permission failures need
operational monitoring; this first worker is intentionally bounded, not a high-throughput service.

## Manual rollout

Terraform prepares a dedicated worker role/function, due/name indexes, minute schedule and narrow
application-code deployment permissions. `standardization_enabled` defaults false. Production was
enabled through a manual Terraform apply on October 7, 2026. For another environment: review/apply
Terraform manually, wait for indexes to become active, refresh public deployment configuration from
Terraform outputs (including the worker artifact), deploy both API and worker code through the
approved develop→main flow, then explicitly enable the flag/schedule through a reviewed manual apply.
The application deployment role cannot administer infrastructure. Verify a real signed-in disposable
kitchen, app-closed processing and cross-device synchronization before considering rollout verified.
Existing kitchens are enrolled on their next server read or edit, not via a bulk scan.

The immediate-cache path additionally requires `dynamodb:ConditionCheckItem` on the access table
for the API role, to check account/identity status in the annotation transaction. Apply this narrow
permission manually before the application release. DynamoDB Local and mocked tests cannot prove
live IAM access. The publication fix separately requires distribution-scoped
`cloudfront:GetInvalidation` for the deployment role; see [deployment ordering](github-deployment.md#service-worker-publication).

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
