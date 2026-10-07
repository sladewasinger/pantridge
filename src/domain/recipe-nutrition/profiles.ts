import records from './data/sr-legacy.json';
import type { RecipeIngredient } from '../recipes/model';
import { normalizeIngredientName } from '../recipes/names';
import { convertRecipeAmount } from '../recipes/units';

function profileName(ingredient: RecipeIngredient) {
  if (
    /\b(?:raw|cooked|canned|dried|ground)\b.*\bor\b.*\b(?:raw|cooked|canned|dried|sliced)\b/i.test(
      ingredient.note ?? '',
    )
  )
    return undefined;
  let name = normalizeIngredientName(ingredient.name).replace(
    /\b(chopped|diced|sliced|grated|shredded|peeled)\s+/g,
    '',
  );
  if (/^(chicken|turkey)$/.test(name) && /\bground\b/i.test(ingredient.note ?? ''))
    name = `ground ${name}`;
  // State comes from an explicit ingredient name/note, never from the recipe's cooking steps.
  if (!/\b(canned|cooked|dry|dried|raw|frozen)\b/.test(name)) {
    const form = ingredient.note
      ?.match(/\b(canned|cooked|dry|dried|raw|frozen)\b/i)?.[1]
      ?.toLowerCase();
    if (form) name = `${form} ${name}`;
  }
  return name;
}
export function nutrientProfile(ingredient: RecipeIngredient) {
  const name = profileName(ingredient);
  if (!name) return undefined;
  return records.find((record) => record.aliases.includes(name));
}
export function profileAmount(ingredient: RecipeIngredient) {
  const profile = nutrientProfile(ingredient);
  if (!profile) return undefined;
  const mass = convertRecipeAmount(ingredient.quantity, ingredient.unit, 'g');
  if (mass !== undefined) return { profile, grams: mass, assumption: profile.description };
  const portions = profile.portions.filter(
    (portion) =>
      convertRecipeAmount(
        ingredient.quantity,
        ingredient.unit,
        portion.measure as 'count' | 'cup' | 'tbsp' | 'tsp',
      ) !== undefined,
  );
  const portion = portions.find((item) => !item.description.includes(',')) ?? portions[0];
  if (!portion) return undefined;
  const amount = convertRecipeAmount(
    ingredient.quantity,
    ingredient.unit,
    portion.measure as 'count' | 'cup' | 'tbsp' | 'tsp',
  )!;
  return {
    profile,
    grams: amount * portion.grams,
    assumption: `${profile.description}; USDA ${portion.description}: ${portion.grams} g`,
  };
}
