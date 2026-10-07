import type { Recipe } from '../recipes/model';
import type { RecipePreferences } from './model';
import type { Snapshot } from '../model';
import { normalizeIngredientName } from '../recipes/names';

export function dietReviewKey(recipe: Recipe, preferences: RecipePreferences, data: Snapshot) {
  const names = new Set(recipe.ingredients.map((item) => normalizeIngredientName(item.name)));
  const foods = data.foods.filter((food) => names.has(normalizeIngredientName(food.name)));
  const ids = new Set(foods.map((food) => food.id));
  const packages = data.stock
    .filter((lot) => ids.has(lot.foodId) && lot.quantity > 0)
    .map((lot) => [lot.id, lot.product]);
  return JSON.stringify([
    recipe.ingredients,
    recipe.untrackedIngredients,
    recipe.steps,
    preferences.restrictions,
    foods,
    packages,
  ]);
}
