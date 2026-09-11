# Continuous cellar inventory

The home kitchen floor meets a continuous underground section. The wooden hatch scrolls to that section and moves keyboard focus there; normal page scrolling works too. Roots, soil colors, stones and shelf finishes deepen along the page. Reduced-motion users get an immediate jump.

The cellar displays the same stocked food records as the pantry, fridge and freezer, never duplicate inventory. `location: "unspecified"` is the catchall for household supplies; those records sort first, followed by the other stocked items alphabetically. Location icons identify each tile. Freezer compatibility remains `location: "fridge", frozen: true`. Zero-stock identities remain available to search and shopping but disappear from all shelves.

Rendering starts with 24 tiles and loads another 24 as the lower boundary approaches the viewport. A keyboard-accessible “Deeper” button supplies the same action. Scrolling ends at the last stocked item; the existing 600-food capacity still applies. The cellar is a browsing view, with edits through the existing item modal. Dragging remains available on the dedicated pantry/fridge/freezer shelves.

The cellar's plus button defaults to Unspecified; existing add, edit and put-away selectors support the same location. Six local household SVGs cover napkins, paper towels, paper plates, toilet paper, shaving cream and a plain supply box. These do not create starter inventory or automatic shopping entries.

The expanded location/artwork enums require the API and frontend to deploy together. Old PWA clients must accept the update before syncing a kitchen containing these new values. The application workflow already deploys both; no infrastructure apply is required for this release.
