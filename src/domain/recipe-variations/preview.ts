import type { Recipe } from '../recipes/model';
import type { RecipeVariation } from './model';

// Nutrition preview only. This value is never persisted or used for stock deductions.
export function variationNutritionPreview(recipe: Recipe, variation: RecipeVariation): Recipe {
  const ingredient = { ...variation.ingredient, id: variation.replaces ?? 'nutrition-preview' };
  return {
    ...recipe,
    nutrition: undefined,
    ingredients: variation.replaces
      ? recipe.ingredients.map((item) => (item.id === variation.replaces ? ingredient : item))
      : [...recipe.ingredients, ingredient],
  };
}
