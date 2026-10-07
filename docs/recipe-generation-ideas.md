# Recipe generation directions for a future change

These are proposals, not implemented API or grouping changes. The current cookbook redesign
keeps one primary list and puts browsing controls in View. Optional generation choices belong
inside Get ideas, with further detail collapsed by default.

## Choose the meal's direction

Offer a few optional chips: Quick, High protein, Lower carb, Comfort food, One pan. A compact
"More preferences" section can hold a time limit, meal type, cuisine, equipment and a short
free-text request. Let users combine compatible directions and explain conflicts rather than
silently ignoring one. Keep time and protein targets explicit: e.g. at most 20 minutes or at
least 30 g protein per serving. Explain when the kitchen cannot satisfy a requested target.

Return three meaningfully different choices, each with time, required purchases, estimated
nutrition and a short reason it fits the request. Include one familiar, well-tested base recipe
where suitable, then bounded variants. Inventing every recipe from scratch is unnecessary.

## Ground suggestions in a known recipe and exact kitchen foods

Retrieve compatible curated or personally saved recipes first. Give the model their measured
ratios, steps and exact available foods; ask for a small number of justified changes. Reject
changes that undermine baking ratios or omit essential steps. Keep original attribution and
clearly mark an AI adaptation; remove original nutrition and ratings from the adapted version.
Record the selected ingredients and modifications so a retry is explainable and reproducible.

If grouping is explored later, send families containing every exact member rather than losing
the members: `rice: [brown rice, white rice]`. Keep canned/dried, raw/cooked, frozen/fresh and
diet-specific distinctions. Require output to choose actual member names and quantities, then
validate those names server-side. Family grouping may improve flexibility, but the earlier
10/40/200 timing samples only tested grouped requests and do not prove a speed benefit.

## Useful substitutions with consequences

Suggest a preferred available replacement plus an alternative. Show exact amounts, preparation
changes and why it works. A dairy-free creamy sauce may use a suitable plant ingredient; brown
rice in place of white requires different timing/liquid rather than a name swap. Ingredients
with uncertain package form or labels should require review. Apply a substitution only after
the user chooses it; recalculate ingredients, shopping, nutrition and cooking review together.

Keep hard restrictions separate from tastes or nutrition goals. A dislike can be optional;
celiac-related gluten exclusion, milk allergy and other allergens need stricter treatment.
"Dairy-free", "lactose-free" and "vegan" are distinct. A generic food name cannot establish a
packaged product's gluten-free status. Check package-label evidence and flag unknown products,
seasoning mixes, sauces and cross-contact considerations. Do not generate a celiac-safe promise
from an LLM ingredient list. FDA guidance explains the standard for gluten-free labeling:
https://www.fda.gov/food/nutrition-education-resources-materials/gluten-and-food-labeling

## Spice it up without a random reroll

After choosing a base recipe, offer two or three optional additions: brighter (lemon/herbs),
spicier (chili), crunchier (toasted nuts/seeds) or extra protein (compatible beans/chicken).
Use stocked foods first; clearly separate additions requiring shopping. Explain the flavor or
texture benefit and show nutrition/allergen changes before applying. Never suggest a nut garnish
to a nut-restricted kitchen. Keep the base recipe available so the user can undo the variation.

## Calculate nutrition from food data

Prefer saved package-label nutrition, then an attributable nutrient database with explicit
ingredient amounts, preparation state and yield. Sum the batch and divide by servings; show
calories, protein, carbohydrates, fat and sodium, plus uncertainty when label information is
missing. Let the model choose a recipe; do not rely on it to guess authoritative macro totals.
Sodium needs particular care with broth, canned products, condiments and seasonings. Recalculate
after substitutions or additions; never quietly reuse the original publisher estimate.

Persisted diet preferences need an explicit privacy/sync design before implementation. Send only
the constraints needed for the requested generation, not medical history, identity or unrelated
account data. Preserve existing quota enforcement, review-before-save and reviewed cooking IDs.
