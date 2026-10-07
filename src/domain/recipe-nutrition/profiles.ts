import records from './data/sr-legacy.json';
import type { RecipeIngredient } from '../recipes/model';
import { normalizeIngredientName } from '../recipes/names';
import { convertRecipeAmount } from '../recipes/units';
import { identifyIngredient } from '../ingredient-matching/identity';
import { primaryIngredientNote } from '../ingredient-matching/classification';

function profileName(ingredient: RecipeIngredient) {
  const note = primaryIngredientNote(ingredient);
  let name = normalizeIngredientName(ingredient.name).replace(
    /\b(chopped|diced|sliced|grated|shredded|peeled)\s+/g,
    '',
  );
  if (/^(chicken|turkey)$/.test(name) && /\bground\b/i.test(note)) name = `ground ${name}`;
  // State comes from an explicit ingredient name/note, never from the recipe's cooking steps.
  if (!/\b(canned|cooked|dry|dried|raw|frozen)\b/.test(name)) {
    const form = note.match(/\b(canned|cooked|dry|dried|raw|frozen)\b/i)?.[1]?.toLowerCase();
    if (form) name = `${form} ${name}`;
  }
  return name;
}
export function nutrientProfile(ingredient: RecipeIngredient) {
  const name = profileName(ingredient);
  const preferred = records.find((record) => record.aliases.includes(name));
  const required = ingredient.ingredient;
  if (!required) return preferred;
  if (required.basis !== 'as-sold') return undefined;
  const matches = (record: (typeof records)[number]) =>
    record.aliases.some((alias) => {
      const identity = identifyIngredient(alias);
      return identity?.id === required.id && identity.preparation === required.preparation;
    });
  return preferred && matches(preferred) ? preferred : records.find(matches);
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
