import type { RecipePreferences } from './model';

const animal =
  /\b(chicken|turkey|beef|pork|ham|bacon|pancetta|pepperoni|salami|prosciutto|sausage|lamb|duck|veal|gelatin|lard|meat)\b/i;
const fish = /\b(fish|salmon|tuna|cod|tilapia|sardines?|anchov(?:y|ies)|mackerel|trout)\b/i;
const shellfish =
  /\b(shrimps?|prawns?|crabs?|lobsters?|crayfish|oysters?|mussels?|clams?|scallops?)\b/i;
const dairy =
  /\b(milk|butter|cream|cheese|cheddar|feta|ricotta|parmesan|mozzarella|yogurt|yoghurt|whey|casein|ghee)\b/i;
const plantMilk = /\b(almond|oat|soy|coconut|rice|cashew|pea) milk\b/i;
const gluten =
  /\b(wheat|barley|rye|triticale|beer|couscous|bulgur|semolina|seitan|malt|pasta|spaghetti|penne|macaroni|linguine|fettuccine|fusilli|rigatoni|noodles|bread|breadcrumbs|flour|soy sauce)\b/i;
const allergen: Record<string, RegExp> = {
  egg: /\b(egg|eggs|mayonnaise)\b/i,
  fish,
  shellfish,
  wheat: gluten,
  peanut: /\b(peanut|peanuts)\b/i,
  'tree-nut':
    /\b(almond|walnut|cashew|pecan|hazelnut|pistachio|macadamia|brazil nut|pine nut)s?\b/i,
  soy: /\b(soy|soybean|tofu|tempeh|edamame|miso|tamari)\b/i,
  sesame: /\b(sesame|tahini)\b/i,
};
const explicitAlternative = /\b(dairy-free|vegan|plant-based)\b/i;
function hasDairy(name: string) {
  return dairy.test(name) && !plantMilk.test(name) && !explicitAlternative.test(name);
}
function hasAnimal(name: string) {
  return animal.test(name) || fish.test(name) || shellfish.test(name);
}
function hasGluten(name: string) {
  const alternative = /\b(gluten-free|rice pasta|corn pasta|quinoa pasta)\b/i.test(name);
  return gluten.test(name) && !(alternative && !/\bwheat\b/i.test(name));
}
export function restrictionConflicts(name: string, preferences: RecipePreferences): string[] {
  return preferences.restrictions.filter((restriction) => {
    if (restriction === 'vegetarian') return hasAnimal(name);
    if (restriction === 'vegan')
      return hasAnimal(name) || hasDairy(name) || /\b(eggs?|honey)\b/i.test(name);
    if (['milk', 'dairy-free'].includes(restriction)) return hasDairy(name);
    if (restriction === 'lactose-free') return hasDairy(name) && !/\blactose-free\b/i.test(name);
    if (['gluten-free', 'celiac', 'wheat'].includes(restriction)) {
      return hasGluten(name);
    }
    return allergen[restriction]?.test(name) ?? false;
  });
}
const plainFood =
  /^(?:fresh |raw |frozen )?(?:water|salt|black pepper|spinach|kale|broccoli|cauliflower|cabbage|asparagus|mushrooms?|tomatoes?|onions?|garlic(?: cloves)?|carrots?|potatoes?|cucumbers?|zucchini|lettuce|arugula|lemons?|limes?|apples?|oranges?|bananas?|avocados?|parsley|cilantro|basil|rosemary|thyme|chicken(?: breast| thighs)?|beef|pork)$/i;
export function dietaryAssessment(names: string[], preferences: RecipePreferences) {
  const conflicts = names.filter((name) => restrictionConflicts(name, preferences).length);
  const labels = preferences.restrictions.length
    ? names.filter((name) => !plainFood.test(name))
    : [];
  const crossContact = preferences.restrictions.some(
    (value) => !['vegetarian', 'vegan'].includes(value),
  );
  return { conflicts: [...new Set(conflicts)], labels: [...new Set(labels)], crossContact };
}
