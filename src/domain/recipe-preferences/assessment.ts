import type { Recipe } from '../recipes/model';
import type { RecipePreferences } from './model';
import { dietaryAssessment, restrictionConflicts } from './restrictions';

export function assessRecipeDiet(recipe: Recipe, preferences: RecipePreferences) {
  const assessment = dietaryAssessment(
    [...recipe.ingredients.map((item) => item.name), ...(recipe.untrackedIngredients ?? [])],
    preferences,
  );
  const preparation = recipe.ingredients
    .filter((item) => restrictionConflicts(item.note ?? '', preferences).length)
    .map((item) => `${item.name} preparation`);
  const method = recipe.steps.flatMap((step) => restrictionConflicts(step, preferences));
  return {
    ...assessment,
    conflicts: [
      ...new Set([
        ...assessment.conflicts,
        ...preparation,
        ...method.map((restriction) => `Method (${restriction})`),
      ]),
    ],
  };
}
