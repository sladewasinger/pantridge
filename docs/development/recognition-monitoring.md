# Food recognition monitoring

The API and classification worker emit JSON records with `metric: "FoodRecognition"`. These are aggregate application logs, not a deployed dashboard, CloudWatch custom metrics, or alarms. Select the existing API and classification worker log groups and a useful time range in CloudWatch Logs Insights. In Standard log groups, CloudWatch's JSON field discovery exposes the first JSON fragment and its nested fields used below. See [AWS field discovery documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_AnalyzeLogData-discoverable-fields.html).

Records have a fixed event (`cache`, `provider`, `worker`, or `review`), source, and outcome. They contain only bounded counts, durations, and fixed result-status buckets. They never include account or kitchen IDs, food names, barcodes, ingredients, private reasons, request inputs, or error messages. An outcome reduces failures to `failed`, `timeout`, `quota`, `busy`, or `paused`; it does not identify the user or underlying error.

## Cache reuse after sync

After committing a new edit and its mutation receipt, the API peeks at cached recognition for at most 25 newly unresolved or changed fingerprints. It never invokes AI during sync. Quantity-only edits, repeated mutation receipts, and ordinary kitchen reads do not repeat this lookup. Cache misses retain the existing background debounce.

The complete optional enrichment pass has a 750 ms deadline and one conditional write attempt. Private results use the active account's cache scope. Public results require matching server-obtained product metadata, checked again after the cached result arrives. At most 25 targets are processed concurrently; a public target performs at most two metadata passes and one recognition-cache read, all under the same deadline. The annotation transaction checks the current revision, fingerprints, manual choices, admitted account, and verified account identity. Cached hits preserve quantities, package metadata, and the remaining queue's due time, lease, and retry state. A timeout, quota, suspension, conflicting write, or lookup failure cannot fail an already committed edit; the background queue remains available.

Successful cache records count cached input items, rather than unique cache keys or newly persisted annotations. Repeated identical inputs can share one provider result. Keep `source` in the grouping to distinguish sync enrichment from explicit lookup/resolve requests. The hit rate excludes failed or incomplete cache passes:

```sql
filter metric = "FoodRecognition" and event = "cache" and outcome = "success"
| stats sum(hits) as cacheHits, sum(misses) as cacheMisses,
    100 * sum(hits) / (sum(hits) + sum(misses)) as hitRatePct by bin(1h), source
```

## Provider latency and recognition results

`provider` duration covers the structured request and result validation. Outcomes include timeouts and incomplete or rejected output as failures. Provider quotas and the 15-second request deadline and 2048-token classification output limit remain unchanged. A cache hit produces no provider record.

```sql
filter metric = "FoodRecognition" and event = "provider"
| stats count(*) as requests, avg(durationMs) as averageMs,
    pct(durationMs, 95) as p95Ms, max(durationMs) as maximumMs
    by bin(1h), outcome
```

Successful provider records report status counts for a batch of at most 25. These distinguish recognition coverage from transport failures; taxonomy gaps and composite foods are negative recognition outcomes, not verified identities or mandatory correction tasks:

```sql
filter metric = "FoodRecognition" and event = "provider" and outcome = "success"
| stats sum(statuses.recognized) as recognized,
    sum(statuses.unknown) as unknown, sum(statuses.uncertain) as uncertain,
    sum(`statuses.taxonomy-gap`) as taxonomyGaps,
    sum(statuses.composite) as composites, sum(statuses.nonfood) as nonfood
    by bin(1h)
```

## Queue progress, failures, and legacy corrections

`worker` records include queue age from the persisted first-queued timestamp at the start of processing, processing duration, and retry attempt count. Quota and busy outcomes preserve attempts; suspension pauses work. Successful `review` records count the legacy `classification.review` command once per mutation receipt, without recording the target or selected identity. Current optional item corrections use ordinary editor commands and are not counted by this metric; it is not a census of corrections or unresolved items. The interface has no global clarification list.

```sql
filter metric = "FoodRecognition" and event = "worker"
| stats count(*) as batches, max(queueAgeMs) as oldestObservedMs,
    max(retries) as maximumRetries, sum(failures) as failures
    by bin(1h), outcome
```

```sql
filter metric = "FoodRecognition" and event = "review" and outcome = "success"
| stats sum(clarifications) as savedClarifications by bin(1d)
```

Limits are deliberate: hit/miss and individual status counts cap at 25 per record, clarifications at one, retries at three, duration at 60 seconds, and queue age at seven days. Unknown or nonfinite numeric values become zero. These are observed processing events: they do not provide a census of queued kitchens, count items never processed, prove a provider result is correct, or distinguish individual users. A worker failure before claiming a job can have zero queue age. Evaluate low request volume and these caps when reading percentages or latency percentiles. Existing log retention and access controls apply; no new user-level tracking, quotas, dashboards, or alarms are introduced.

## Release verification, October 8, 2026

These historical checks cover the earlier clarification release, before catalog revision 2 and removal of the global clarification flow. They do not verify the current automatic recognition release or its model accuracy.

Pinned pnpm 10.32.1 frozen installation and `pnpm check` passed with 458 unit tests. Production-build browser suites passed 78 Chromium and 64 WebKit tests, each with one existing skip. The Docker-backed full integration suite passed seven tests, including a real local API clarification transaction, unchanged stock/shopping, second-device editor verification after reload, account isolation, and immediate cache reuse without another provider call. The provider in that integration suite is a fixture; these results do not measure model accuracy.

Manual browser actions at 390×844 and 1280×900 exercised preparation clarification, an unknown food's exact-name fallback, queue versus sync status, Process now, the actual local worker, persistence after reload, and account switching. An isolated production-build update test used the real Update button to activate build B from build A while retaining a saved shopping entry. The cookbook artwork and navigation were also inspected. These checks do not establish physical iPhone installed-app behavior or Google OAuth.

Terraform formatting, validation, and all twelve mocked tests passed. The reviewed manual apply changed only the API access-table `ConditionCheckItem` permission and deployment distribution's `GetInvalidation` permission: zero resources added or destroyed. AWS IAM simulation returned `allowed` for both intended action/resource pairs; this is policy verification, not a live authenticated kitchen transaction. Provider models, reasoning settings, timeouts, admission rules, and production budgets remain unchanged.
