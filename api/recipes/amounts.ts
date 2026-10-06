import type { RecipeUnit } from '../../src/domain/recipes/model';
import { convertRecipeAmount } from '../../src/domain/recipes/units';

type IngredientAmount = { name: string; quantity: number; unit: RecipeUnit };
const seasonings =
  /\b(?:pepper|powder|paprika|cumin|cinnamon|turmeric|oregano|thyme|rosemary|vanilla extract|baking soda|yeast)\b/;
function limits(name: string) {
  const normalized = name.toLowerCase();
  if (/\bsalt\b/.test(normalized)) return { grams: 5, milliliters: 5, count: 0 };
  if (seasonings.test(normalized) && !normalized.includes('bell pepper'))
    return { grams: 20, milliliters: 30, count: 0 };
  if (/\b(?:oil|butter)\b/.test(normalized)) return { grams: 100, milliliters: 120, count: 0 };
  if (/\b(?:sugar|honey|syrup)\b/.test(normalized))
    return { grams: 150, milliliters: 180, count: 0 };
  return { grams: 1500, milliliters: 2000, count: 20 };
}
// Broad culinary sanity limits, not nutrition or food-safety advice. Never infer density.
export function plausibleIngredientAmount(ingredient: IngredientAmount, servings: number) {
  const limit = limits(ingredient.name);
  const amount = ingredient.quantity / servings;
  const grams = convertRecipeAmount(amount, ingredient.unit, 'g');
  if (grams !== undefined) return grams <= limit.grams;
  const milliliters = convertRecipeAmount(amount, ingredient.unit, 'ml');
  if (milliliters !== undefined) return milliliters <= limit.milliliters;
  const count = convertRecipeAmount(amount, ingredient.unit, 'count');
  return count !== undefined && count <= limit.count;
}
