# Estimated date reminders

New manual items and separate-package additions suggest a date only when their name confidently matches a local food profile for the chosen storage. Barcode confirmation uses the same profiles first, then an optional AI estimate if no profile matches. Dates are calculated from the device's local purchase day, with calendar arithmetic that avoids daylight-saving shifts. The artwork selected by a user does not determine freshness: a milk icon on an unknown item must not invent a milk date.

All suggestions are editable or removable before saving. Changing or clearing the date locks that decision against later name, placement or AI changes. Stock records carry optional `expirySource: "estimate" | "ai"`; manually editing a saved date removes that marker. Estimated shelf badges use `~` and say “Review” after the reminder date. Dates never delete, consume, hide or automatically mark food unsafe. Existing stock and starter items do not receive retroactive dates.

Profiles assume newly purchased unopened packages, proper refrigeration/freezing and typical commercial food. Purchase freshness, ripeness, packaging and printed dates are unknown. These are app reminders, not predictions of actual expiration or safety. Household items, unknown manual names, opened/prepared/leftover foods and infant formula get no automatic date. Plain packaging alone does not establish food type. Unmatched barcode estimates are bounded to 4 days refrigerated, 365 frozen or 730 pantry days; the classifier is instructed to return null when uncertain and at most 2 refrigerated days for raw meat/fish. Optional AI can still be wrong, and users must confirm its result.

## Profile maintenance

`src/domain/freshness/profiles.ts` is the reviewed, storage-specific table. Prefer the upper end of applicable guidance where appropriate, without extending short raw-meat or fish windows. Refrigerated chicken, ground beef, fresh sausage and fish have two-day defaults; eggs have 35 days and milk seven. Freezer reminders concern quality rather than the safety of continuously frozen food.

The table combines primary storage guidance with deliberately generous product assumptions. It is not a verbatim USDA dataset or an authoritative food-safety tool. For example, counter apples (14 days) and bananas (7 days) allow for buying unripe, fresh produce and exceed the extension table's ready-to-eat counter guidance; they are explicitly quality reminders. Package labels and actual condition take precedence. Do not use this feature to extend an infant formula use-by date.

References reviewed September 2026:

- [FoodSafety.gov cold food storage chart](https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts): refrigerated raw-food windows and frozen quality guidance.
- [Oregon State University Extension: Storing Food for Safety and Quality](https://extension.oregonstate.edu/sites/extd8/files/2023-08/pnw612.pdf): unopened pantry, dairy, produce and frozen storage tables.
- [FDA: How to Cut Food Waste and Maintain Food Safety](https://www.fda.gov/food/consumers/how-cut-food-waste-and-maintain-food-safety): quality-date context and formula exceptions.

Future receipt or printed-label import must distinguish observed package dates from suggestions and preserve this provenance. Put-away retains its existing optional manual date field in this release.
