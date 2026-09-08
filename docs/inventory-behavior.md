# Inventory behavior

New empty kitchens receive one package each of eggs, milk, butter, black beans, rice, and pasta, with matching SVG artwork. Existing nonempty kitchens are preserved. `starterVersion: 1` records that initialization has happened, including when every starter food is deleted. Guest initialization is one IndexedDB transaction. The first cloud read performs the same transition through a permanent, account-scoped mutation receipt, preventing concurrent devices from duplicating defaults. Cloud reads after initialization are read-only.

The freezer has its own screen and entry point on the upper green door. Persisted food continues to use `location: fridge, frozen: true`, so existing frozen inventory appears there without a migration. Fridge shelves exclude frozen food. The location selector in add, edit, and put-away forms exposes Pantry, Fridge, and Freezer.

Editing a unit changes its label, preserving numeric counts and dates; it is not a quantity conversion. Linked shopping entries receive the new name and unit too. Deleting a food removes its stock lots while retaining requested groceries as standalone shopping entries. All changes use the same validated domain commands locally and in the API, with offline persistence and idempotent sync.

Butter, rice, bread, apple, carrots, and fish add artwork enum values. Installed clients must accept the PWA update to render these new foods and edit them; old clients can reject a snapshot containing new artwork. Updates preserve IndexedDB data. Backup restore still requires an empty inventory; delete starter foods first when restoring a new kitchen.

Deleting food offers Undo until dismissed, replaced by another deletion, or the page reloads. Restoration refuses to overwrite an existing identity and restores lots atomically in IndexedDB. Shopping entries retained during deletion remain standalone.
