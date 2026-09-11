# Barcode scanning

Scanning requires Google sign-in. Anonymous kitchens retain all manual and offline features.
Every scan requires confirmation. Product lookup never writes inventory. Confirmation commits
one `stock.scan` mutation and its outbox entry in a single IndexedDB transaction. Retry IDs stay
unchanged. Camera decoding happens on the device; images are not uploaded.

## Food, packages and stock

Food records are shelf variants. Their normalized generic name groups variants in search;
name + container unit + declared package size distinguishes inventory counts. Existing IDs and
unspecified sizes remain intact. Optional `size: { amount, measure, packs }` adds weight, volume,
count and multipack support. `packageSize` remains the backward-compatible display field.
`15oz` and `15 oz` match; `425 g` and `15 oz` do not automatically match. Weight ounces and fluid
ounces never match. We count packages, without converting or summing their contents.

Each scanned stock lot retains its packaged product (`barcode`, branded `name`, `brand`, optional
Open Food Facts `source`). Brands do not create separate shelf variants. The latest confirmed
lot supplies a kitchen-specific barcode mapping, including after consumption reaches zero.
Deleting its food deletes these mappings. No private correction changes the shared catalog.
Cached confirmed products can be scanned offline; unknown ones require a connection or manual entry.
Unrecognized sizes require an explicit size or Unspecified selection. Editable estimated reminders
are distinct from printed expiration dates; see [date reminders](freshness.md).

Shopping references the exact variant and retains a size label if it becomes a one-time item.
Generic grouping is based on normalized names, not an extensive food taxonomy. Users can correct
names when a source or model suggests different synonyms. Food identity is still independent of
stock, and a global canonical-food service is not required for this release.

## Proxy and optional classification

`POST /v1/products/resolve` accepts `{ "barcode": "3017620422003", "stage": "lookup" }` behind the existing
Cognito JWT authorizer. The verified token subject supplies quota identity. The client cannot
choose an upstream URL, owner, model, prompt, or provider. EAN-8, UPC-A, EAN-13 and GTIN-14 checksums
are validated and equivalent leading-zero representations are normalized.

The proxy uses Open Food Facts v3 with bounded fields, a custom User-Agent, a five-second timeout
and a 64 KB response cap. Shared product cache entries expire after 30 days (missing products: one
day). Expired entries are never treated as valid while DynamoDB TTL deletion catches up.
Global requests are spaced at least 4.3 seconds apart to respect the documented 15 reads/min/IP;
concurrent uncached scans can receive a retry message. Each account gets 200 online lookups/day.

The lookup stage returns OFF details, package size and nutrition before optional AI runs. A
response with `enhancement: "pending"` lets the client issue the same request with `stage: "enhance"`.
Refinement reads only server-cached public metadata, never user-provided product text. It does not
consume a second daily scan allowance; API abuse protection and AI quotas still apply. Omitting
stage preserves the original combined response for older clients. No additional API route or
Terraform change is needed. Shared raw and refined cache keys are versioned independently.

Confirmation stays usable during refinement. A wand/spinner marks pending suggestions. Explicit
field edits, including reselecting the same artwork or storage, take precedence; storage and frozen
status are protected together. Known private variants retain their corrections. Cancel/save aborts
the client request and ignores late responses; an already running server call may still finish and
consume its reserved quota. A failed refinement keeps the initial result available.

Free rules run first. AI is **disabled by default** (`classifier_provider = "none"`). With
`"openai"`, ambiguous found products use the configurable model (initial default `gpt-4.1-nano`).
Only product name, brand and categories are sent, with `store: false`, a strict output schema,
configurable output-token limit and eight-second timeout. The limit includes reasoning tokens.
Model text has no authority to execute commands.
All results remain editable suggestions. Missing keys, refused/invalid responses, timeouts and
exhausted AI quotas fall back to rules. Limits are 20 AI attempts/user/day and a configurable
100 attempts/day across the application, enforced atomically in DynamoDB before a call.
These limits bound attempts, not a guaranteed currency budget. Provider pricing and AWS charges
still apply; use provider project budgets as another control. No model key is needed for free rules.

The structured response optionally includes bounded `estimatedDays` when a local food profile is
unavailable. No image, private inventory or nutrition record is sent to the model.

## Nutrition

OFF nutriments are stored on the branded stock lot, not the generic food identity. Item/Nutrition
tabs show per-serving or per-100-g/ml values in a package-style label, with a package selector when
multiple scanned brands exist. Sodium is normalized from grams to milligrams; kJ-only energy is
converted to kcal. Missing values remain missing (shown as a dash), never zero. Prepared-product
fields, inferred daily values and allergen claims are excluded. Source links retain OFF attribution.

These are community-supplied facts, not independently verified package labels. Previously remembered
barcodes retain their offline records without a fresh API call and may lack nutrition. This release
does not backfill older lots. Added metadata counts toward the existing bounded snapshot size, so
very large kitchens may reach the byte limit before the item-count limit.

Field reference: [OFF nutrition schema](https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_nutrition/).

The provider adapter is isolated in `api/products/classifier.ts`. Adding another provider requires
an adapter and Terraform enum/config changes, without altering scanning or inventory transitions.
Future paid entitlements belong in the proxy, not in client-side flags.

## Manual AWS setup

Terraform adds a pay-per-request cache/quota table, an authenticated route, a narrow Lambda policy
and nonsecret configuration on the existing API Lambda. No new Lambda, NAT gateway or always-on
server is needed. GitHub deployment permissions remain application-only. Terraform applies remain
manual; apply the reviewed infrastructure before merging the app release to main.

To enable AI later:

1. In AWS Systems Manager → Parameter Store, create a **Standard SecureString** named
   `/pantridge-personal/classifier/api-key` in `us-west-2` (other environments: use the Terraform
   `classifier_key_parameter` output). Use the default `alias/aws/ssm` encryption key.
2. Paste a dedicated provider project API key into its value. Do not paste it into chat, GitHub
   variables, frontend environment files, Terraform variables, or Terraform state.
3. Set `classifier_provider = "openai"` in the ignored local Terraform settings; optionally set
   `classifier_model`, `classifier_reasoning_effort`, `classifier_max_output_tokens` and
   `classifier_daily_limit`. Review and apply Terraform manually.
4. Allow up to five minutes for in-process credential cache rotation. Disabling the provider
   removes secret-read permission at the next apply.

Terraform deliberately does not own or read the parameter value. Standard Parameter Store with
the AWS-managed key avoids a separate Secrets Manager secret or customer-managed KMS key for this
small feature. There is no promise that the entire AWS app is free.

## Attribution and limitations

The personal deployment selects `gpt-5.6-luna` with `low` reasoning and a 1,024-token total output
cap. Deployment selections live in ignored local Terraform settings; reusable defaults remain
rules-only. Non-reasoning models omit the reasoning parameter. Cache keys include the provider,
model, reasoning effort and output cap so a setting change does not reuse an older fallback.
See [Luna model documentation](https://developers.openai.com/api/docs/models/gpt-5.6-luna).

Open Food Facts product data and derived cached classification retain Open Food Facts attribution
and ODbL licensing. The app links the source on confirmation and product details. The shared
catalog must remain separable from private kitchens and releasable under ODbL; before a paid/public
catalog redistribution, review its database-sharing obligations. Do not claim exclusive ownership
of the derived catalog or mix incompatible proprietary sources into it. Our own SVG artwork is
used rather than importing product photographs and their separate image license.

The owner can export only public product cache records using `scripts/export-product-catalog.mjs`
to satisfy catalog requests; no kitchen or per-user quota records are included. That operation
uses the owner's read credentials, not the application deployment role.

The camera uses ZXing's browser decoder (lazy loaded) rather than depending on native
BarcodeDetector support. Manual number entry is available if camera permission is denied.
UPC-E, label OCR, package expiration recognition, receipt imports, price lookup, automatic
shopping consumption and household restocking are not part of this feature.

Browser integration tests use the real production build with public test OIDC endpoints and
mock API responses, never an authentication bypass in application code. Physical camera focus,
real Google login and real paid provider calls must still be checked on target devices/accounts.

Sources: [Open Food Facts API](https://openfoodfacts.github.io/openfoodfacts-server/api/),
[OFF licensing](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/),
[OpenAI structured output](https://developers.openai.com/api/docs/guides/structured-outputs),
[GPT-4.1 nano](https://developers.openai.com/api/docs/models/gpt-4.1-nano),
[SSM encryption](https://docs.aws.amazon.com/systems-manager/latest/userguide/secure-string-parameter-kms-encryption.html).
