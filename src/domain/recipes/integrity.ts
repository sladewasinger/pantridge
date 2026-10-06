import { starterRecipes } from './starters';

interface RecipeData {
  recipes?: { id: string }[];
  mealPlan?: { id: string; recipeId: string }[];
  cookingHistory?: { id: string }[];
}
export function hasValidRecipeLinks(data: RecipeData): boolean {
  const recipes = data.recipes ?? [];
  const plans = data.mealPlan ?? [];
  const history = data.cookingHistory ?? [];
  const ids = new Set([...starterRecipes, ...recipes].map((recipe) => recipe.id));
  return (
    [recipes, plans, history].every(
      (items) => new Set(items.map((item) => item.id)).size === items.length,
    ) && plans.every((entry) => ids.has(entry.recipeId))
  );
}
export function hasCookbookData(data: RecipeData): boolean {
  return Boolean(data.recipes?.length || data.mealPlan?.length || data.cookingHistory?.length);
}
