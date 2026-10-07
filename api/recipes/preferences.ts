import type { RecipeSuggestionRequest } from '../../src/domain/recipe-suggestions/model';
import { excludedIngredient } from '../../src/domain/recipe-preferences/fit';
import { emptyPreferences } from '../../src/domain/recipe-preferences/model';
import type { SuggestionOutput } from './output';

export function allowedNames(request: RecipeSuggestionRequest, additions: string[]) {
  const preferences = request.preferences ?? emptyPreferences();
  return [
    ...new Set([...request.inventory.flatMap((item) => item.members ?? [item.name]), ...additions]),
  ].filter((name) => !excludedIngredient(name, preferences));
}
export function groundOutput(
  output: SuggestionOutput,
  request: RecipeSuggestionRequest,
): SuggestionOutput {
  return {
    recipes: output.recipes.map((recipe) => {
      if (!recipe.basisKey || recipe.basisKey === 'none') return recipe;
      const base = request.bases?.find((item) => item.key === recipe.basisKey);
      if (!base) return recipe;
      // A selected foundation retains its ratios and complete method. Free adaptations use 'none'.
      return {
        ...recipe,
        title: base.title.slice(0, 100),
        minutes: base.minutes,
        ingredients: base.ingredients.map((item) => ({
          ...item,
          quantity:
            Math.round(((item.quantity * recipe.servings) / base.servings) * 1000000) / 1000000,
        })),
        steps: base.steps,
      };
    }),
  };
}
