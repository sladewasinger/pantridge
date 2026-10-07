import type { Recipe, RecipeIngredient } from '../recipes/model';
import { normalizeIngredientName } from '../recipes/names';
import { recipeIdentity } from './classification';

export { matchHash } from './hash';
export function requirementKey(_recipe: Recipe, ingredient: RecipeIngredient): string {
  const identity = recipeIdentity(ingredient);
  return identity
    ? JSON.stringify(identity)
    : JSON.stringify([normalizeIngredientName(ingredient.name), ingredient.note ?? '']);
}
