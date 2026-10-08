import type { Recipe } from '../recipes/model';
import { evidenceFingerprint, recipeEvidence } from './evidence';

export function preserveRecipeClassifications(
  previous: Recipe | undefined,
  recipe: Recipe,
): Recipe {
  if (!previous) return recipe;
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((item) => {
      const old = previous.ingredients.find((row) => row.id === item.id);
      return old &&
        evidenceFingerprint(recipeEvidence(old)) === evidenceFingerprint(recipeEvidence(item))
        ? { ...item, standardization: old.standardization ?? item.standardization }
        : item;
    }),
  };
}
