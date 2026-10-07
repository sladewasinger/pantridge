# Kitchen-first recipe discovery

The previous ingredient sort counted missing rows. A three-ingredient recipe with zero stock
could beat a ten-ingredient recipe with several matches. A synthetic kitchen based on the
owner's visible shelf names reproduced this with Applesauce; the regression failed before
the fix.

The default cookbook now excludes recipes with no stocked required ingredient or explicitly
supported possible ingredient match. Optional ingredients, zero-quantity lots and household
supplies cannot make a recipe qualify. View has a separate Show recipes without matches
toggle, off by default even for existing preference records. Include built-in recipes remains
an independent source filter. Search and the time filter respect this scope.

Recipes whose required amounts are confirmed or need package-size review form the first
Ingredients on hand section. Missing quantities, possible choices and unmeasured extra
ingredients put a recipe below a horizontal Partial matches heading. Explicitly included
zero-match recipes appear last under More recipes. Each section retains the selected date,
coverage, time or alphabetical order. Use-soon dates come from required exact-match stock;
past dates, optional-only matches and empty lots never create urgency.

Coverage uses distinct required ingredient identities. Exact stock presence contributes one
point and an explicit possible match contributes half a point, divided by the required count.
This ranking measures ingredient coverage, not nutrition, recipe safety or amount sufficiency.
Cards display actual coverage and possible choices. Raw missing-row counts no longer decide
relevance. Amount shortages and unknown package sizes retain their existing review behavior.

Possible matches are deliberately bounded: listed rice/potato/onion varieties for generic
ingredients, plus the exact unsalted/salted/organic descriptors. They do not strip arbitrary
brands, use substring matching, collapse raw/cooked foods or infer dietary compatibility.
Cinnamon Life Cereal is not cinnamon; wheat crackers are not tomatoes or basil. Red, yellow
and white onion singular/plural spellings are identity aliases. These three aliases are shared
with the API as before; possible varieties are discovery-only.

Possible choices never count as confirmed quantities, change shopping identities or select
cooking lots. Recipe details name the candidate and require explicit editing to use it.
Saving, nutrition, shopping and cooking continue to assess the selected exact ingredient.
This is a limited compatibility list, not complete recognition of every branded food.

## Future optional AI identity assistance

No background AI request or timer is implemented by this fix. The proposed ten-minute delay
is a debounce for batching unresolved names while groceries are entered, not a delay in local
match updates. Each kitchen edit resets the quiet deadline. A later batch would send only
unresolved names, reuse reviewed mappings and discard results for an obsolete account or
kitchen version. Opening the cookbook must not itself generate another request.

Canonical ingredient identities and explicit preparation/diet compatibility should remain
the main mechanism. Optional AI could propose identities for unknown labels once for review,
without rewriting food names, packages, nutrition or stock. Accepted mappings should remain
private to the kitchen. Automatic calls would need an explicit opt-in and the existing server
quotas. Closing the browser suspends client work; running scheduled jobs on AWS would be a
separate infrastructure decision.

## Verification

`pnpm check` passed: 319 unit tests plus static, structure, artwork, formatting and build checks.
The production-build browser suites passed 66 Chromium and 55 Windows WebKit cases, each with
its existing intentional skip. The new browser regression exercises complete/partial sections,
the screenshot fixture, variety notes, search, source/time/unmatched filters, preference reload,
accessibility and unchanged inventory/recipes. Existing catalog tests now explicitly enable
unmatched recipes instead of assuming the whole collection is the default view.

Manual clicks used the exact Vite preview URL `http://127.0.0.1:4176/`, an isolated disposable
kitchen restored through the normal backup UI. At 390x844 and 1280x900, the reviewer opened
the cookbook, selected Ingredients on hand, searched for Applesauce, enabled/disabled the
unmatched toggle, applied the time and source filters and read the black-bean/rice candidate
notes. Applesauce stayed hidden until explicit inclusion. The partial divider and compact
counts were visually inspected; this manual interaction is separate from automated screenshots.
No live kitchen, paid provider call, merge or deployment was involved in this verification.
