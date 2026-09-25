# Mobile shelves, scan feedback, and nutrition amounts

Kitchen and Cellar shelves display three tiles per row. Fridge, pantry and freezer now generate rows automatically as inventory grows; manual shelf placement and inventory-tile dragging have been removed. Touch swipes scroll normally. Shopping rows use dedicated drag handles, animated space for dropping, and keyboard reorder controls.

Scan success notices sit at the viewport top, respecting its safe area. The open scan dialog reserves space below the actual banner height, including when another scan opens a full confirmation form. Notices still support Undo, manual dismissal, and the existing ten-second timeout, paused while hovered or focused.

## Nutrition amounts

Nutrition now supports per serving, per 100 g/ml, whole package, and a custom measured amount. Whole-package totals use the saved package size, including all packs in legacy multipack records; they never multiply by inventory quantity. If an explicit serving weight or volume is available, the view also shows an approximate serving count.

Open Food Facts normalizes nutrients per 100 g or per 100 ml for liquids ([source documentation](https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_nutrition/)). The API adds an optional `nutrition.basis` field inferred from measured serving or package text. Older cached records remain readable and infer the basis at display time. No database migration or additional network request is required.

Custom amounts convert within weight (g, oz, kg, lb) or volume (ml, l, US fl oz, US gal). Weight and volume are never converted through an assumed density. If the basis is unknown, custom amounts require a label-basis selection. Whole-package totals require a compatible measured size; count-only or unknown sizes cannot provide them. When only per-serving nutrients exist, scaling requires an explicit decimal serving weight or volume. Household fractions without a measured equivalent are not guessed.

Missing values display a dash. Nutrition controls are view-only and cannot change stock or prevent its form from submitting. Totals reflect the source product's nutrition basis and saved package weight; they do not infer drained weight or prepared-food amounts. Users can compare the source link with their printed package label.

Modal dismissal clears the overlay immediately rather than waiting for asynchronous browser history traversal. The native dialog closes and cancels its entry animation before React removes it. Back/Forward restoration remains supported. Entry motion uses a short slide without group-opacity fading, and the backdrop uses a simple tint instead of live blur. Dragged shopping rows are opaque and clear their transforms/drop gap on release, cancellation or unmount. Browser regressions cover interrupted entry, tab switching, delayed history, slow local storage and failed saves. The reported intermittent Pixel PWA rendering artifact was not directly reproduced on a physical device.
