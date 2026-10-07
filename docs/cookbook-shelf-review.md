# Cookbook shelf review — October 6, 2026

The cookbook replaces the plant above the pantry. Its base and contact shadow meet the existing
shelf at kitchen coordinate y=73. The terracotta cover, cream pages, narrow spine, restrained
perspective and warm shading follow the surrounding SVG artwork. The title is on the cover;
there is no detached label. Hover brightens the book without lifting it off the shelf. Keyboard
focus has an explicit outline, and the existing reduced-motion rule removes its transition.

## Local verification

Used the pinned pnpm 10.32.1 and `pnpm install --frozen-lockfile`. The exact Vite URL printed for
this session was `http://127.0.0.1:5175/`. The interactive Codex browser reached that local app.
These were actual UI interactions in an anonymous local test kitchen, separate from automated
tests and screenshot inspection:

- Inspected the kitchen at desktop 1280×900 and phone 390×844 and 320×800 widths. The book visibly
  rests on the shelf. At 320px its button measures approximately 62.5×45.8px; no horizontal
  overflow. Tapped the illustrated book; tabbed to it and opened it with Space. Checked its
  focus ring and dismissed a recipe with Escape.
- Browsed starter recipes, expanded substitution suggestions, saved a recipe, reviewed and
  added missing ingredients, and inspected the resulting shopping quantities and package-size
  review notes. Planned a meal and verified stock remained unchanged.
- Imported local recipe text, inspected the editable review and package-size note, saved it,
  and found it using cookbook search.
- Edited a cooking deduction to 0.5 and cancelled; the original stock remained. Reopened the
  review, entered 0.5, checked the confirmation and explicitly confirmed cooking. Reloaded the
  kitchen and verified the remaining 0.5 can was saved.
- Opened a review in one tab and changed stock in a second tab. The first review displayed the
  changed-stock warning and disabled confirmation. Refreshing amounts showed the new quantity
  and required review again. Cancelled without further deductions.
- Opened optional AI suggestions and inspected the transmission disclosure and anonymous
  sign-in requirement; no provider request was sent.

Local screenshots are generated review artifacts in `artifacts/review/cookbook-phone.jpg` and
`artifacts/review/cookbook-desktop.jpg`, excluded from Git.

`pnpm check` passed, including 275 unit tests and the production build. `pnpm test:e2e` passed
against its production build: 58 passed, one intentional skip. Its initial attempt could not
start because the matching Chromium executable was missing; installing the repository's
Playwright Chromium resolved that blocker. No browser assertions were removed or weakened.

The Windows checkout had 121 CRLF-only formatter failures. A read-only comparison proved there
were no substantive formatting differences. Converting only those line endings allowed the
required check to pass without adding unrelated content changes.

## Dependency and workflow review

The lockfile retains compatible updates only: brace-expansion 2.1.4 → 2.1.7 and 5.0.9 → 5.0.12,
source-map-js 1.2.1 → 1.2.2, fast-uri 3.1.7 → 3.1.8, and serialize-javascript 7.1.1 → 7.1.2.
The fresh audit reports no known vulnerabilities. The high-severity audit gate remains enabled.

Reviewed preserved commit `a7190a63c2dd05c1c1d74254f4001b0387f97242`. Its audit step is useful;
its dependency path filters would trigger full verification on PRs into develop, conflicting
with the owner's current unit-test-and-build-only rule. The verification workflow is now manual
and includes that audit step. Develop checks and the gated main deployment workflow retain
their existing roles. The preserved branch/commit remains available separately.

## Remaining review and release limits

The rejected screenshot referenced in the handoff was not attached to this conversation.
The current production kitchen and actual unreleased local render were inspected before edits,
but comparison against that missing screenshot and owner approval of this revised artwork
remain pending. No merge to main, application deployment, workflow dispatch, Terraform apply,
production inventory edit, new credential, or paid AI call was performed.

Real Google sign-in, cross-device sync and paid provider behavior were not manually exercised.
The regression suite covers their mocked flows, barcode and nutrition behavior. WebKit was not
rerun locally; this review does not replace the full checks required after an authorized merge
to main. Release remains subject to the owner's current deployment instructions.
