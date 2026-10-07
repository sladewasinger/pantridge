import type { Snapshot } from '../model';
import type { RecipeAvailability } from './availability';
import { getRecipeAvailability, matchingLots } from './availability';
import { getCookbookRecipes, getRecipes } from './selectors';

interface BrowseOptions {
  order: 'use-soon' | 'on-hand' | 'name' | 'quick';
  builtIns: boolean;
  quickOnly: boolean;
}
export function soonestDate(
  data: Snapshot,
  match: RecipeAvailability,
  today: string,
): string | undefined {
  const until = Date.parse(today) + 7 * 86400000;
  return match.recipe.ingredients
    .flatMap((ingredient) => matchingLots(data, ingredient))
    .flatMap((lot) =>
      lot.expires && lot.expires >= today && Date.parse(lot.expires) <= until ? [lot.expires] : [],
    )
    .sort()[0];
}
function availabilityOrder(left: RecipeAvailability, right: RecipeAvailability) {
  const rank = { confirmed: 0, 'needs-review': 1, missing: 2 };
  const missing = (value: RecipeAvailability) =>
    value.ingredients.filter((item) => !item.ingredient.optional && item.status === 'missing')
      .length;
  return rank[left.status] - rank[right.status] || missing(left) - missing(right);
}
export function browseRecipes(
  data: Snapshot,
  query: string,
  options: BrowseOptions,
  today: string,
) {
  const source = options.builtIns ? getCookbookRecipes(data) : getRecipes(data);
  const text = query.trim().toLowerCase();
  const dated = new Map<string, string>();
  return source
    .filter(
      (recipe) =>
        !text ||
        [recipe.title, ...recipe.ingredients.map((item) => item.name)].some((value) =>
          value.toLowerCase().includes(text),
        ),
    )
    .filter(
      (recipe) => !options.quickOnly || (recipe.minutes !== undefined && recipe.minutes <= 30),
    )
    .map((recipe) => {
      const match = getRecipeAvailability(data, recipe, recipe.servings, today);
      const date = soonestDate(data, match, today);
      if (date) dated.set(recipe.id, date);
      return match;
    })
    .sort((left, right) => {
      const title = left.recipe.title.localeCompare(right.recipe.title);
      if (options.order === 'name') return title;
      if (options.order === 'quick')
        return (left.recipe.minutes ?? 1441) - (right.recipe.minutes ?? 1441) || title;
      const availability = availabilityOrder(left, right);
      if (options.order === 'on-hand') return availability || title;
      return (
        (dated.get(left.recipe.id) ?? '9999').localeCompare(dated.get(right.recipe.id) ?? '9999') ||
        availability ||
        title
      );
    });
}
