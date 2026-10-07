import type { Snapshot } from '../../domain/model';
import type { Recipe } from '../../domain/recipes/model';
import { ingredientChoices } from '../../domain/recipe-suggestions/choices';
import { getRecipeAvailability } from '../../domain/recipes/availability';

export function suggestionHint(data: Snapshot, recipe: Recipe, today: string) {
  if (ingredientChoices(data, recipe, today).length)
    return 'Choose your ingredients during review.';
  const match = getRecipeAvailability(data, recipe, recipe.servings, today);
  if (match.pastDate > 0) return 'Check past-date ingredients before using matching stock.';
  if (match.status === 'confirmed') return 'Ingredient amounts match your stock.';
  if (match.status === 'needs-review') return 'Check your package amounts.';
  return 'Some ingredients need shopping or a suitable substitution.';
}
