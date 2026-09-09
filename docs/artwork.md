# Food artwork

The library includes 100 food illustrations (40 fridge, 50 pantry, 10 freezer) and eight plain packaging illustrations. This is a curated collection of common US groceries, not a statistical popularity ranking. Categories organize the picker; they are not food storage advice. Adding artwork does not create inventory.

All assets are local SVGs in the approved warm kitchen style, available offline through the PWA precache. The 14 existing illustration IDs and paths remain compatible, including `generic` (now a plain grocery bag). The plain seafood tin intentionally contains no fish symbol and can represent sardines, oysters, mackerel, or other tinned foods. Crackers and chips have distinct box and bag illustrations. The picker supports search (including packaging aliases), category filters, keyboard selection and a bounded scrolling grid.

## Maintenance

- Author recipes in `scripts/artwork/catalog.mjs`; silhouettes and package motifs live in the adjacent small modules.
- Run `pnpm artwork:generate` after changing a recipe or drawing. Commit the resulting SVGs and typed catalog modules.
- `pnpm artwork:check`, included in `pnpm check`, verifies checked-in assets match their recipes. Assets are split into directories with at most 18 files. Existing artwork remains at its original URL.
- Keep IDs stable: they are part of saved food records, sync mutations, and the API's artwork enum. Update `artworkVersion` when changing classifier-visible choices or metadata so shared cached product lookups are refreshed.

## Automatic selection

The classifier receives the same catalog the picker uses: stable ID, human-readable label, package shape, plain-packaging flag and relevant aliases. Text metadata avoids transmitting 108 image files on each lookup. The strict structured-output schema only accepts IDs that have a bundled asset. The model is instructed to use matching food artwork, otherwise the appropriate plain package; package unit alone is not enough to pick a food illustration. Existing basic rules can still select established staples without a model request.

Previously confirmed barcodes use their saved food's artwork, preserving user corrections and avoiding a network/LLM call. A library update does not silently replace existing selections. A newly scanned product still requires confirmation before inventory changes. Model selection is a best-effort suggestion; users can edit it in the picker.

New artwork IDs expand the shared food/API schema without changing snapshot version or adding database fields. Deploy API and frontend together using the application workflow. Clients running an older cached app may need to accept the app update before syncing records that use a newly added ID.
