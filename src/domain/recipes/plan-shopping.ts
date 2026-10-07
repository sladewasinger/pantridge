import type { ShoppingItem, Snapshot } from '../model';
import type { MealPlanEntry, Recipe } from './model';
import { getMealPlan, findRecipe } from './selectors';
import { addMissingShopping, buildMissingShopping } from './shopping';
import { classifyRecipeIngredient } from '../ingredient-matching/classification';

function planRequirements(data: Snapshot, entryIds: string[]): Recipe {
  if (!entryIds.length || entryIds.length > 20 || new Set(entryIds).size !== entryIds.length)
    throw new Error('Choose between one and twenty distinct planned meals.');
  const ingredients = entryIds.flatMap((id) => {
    const entry = getMealPlan(data).find((item) => item.id === id);
    if (!entry) throw new Error('A planned meal no longer exists. Review the plan again.');
    const recipe = findRecipe(data, entry.recipeId);
    if (!recipe) throw new Error('A planned recipe no longer exists. Review the plan again.');
    return recipe.ingredients.map((ingredient) => ({
      ...classifyRecipeIngredient(ingredient),
      quantity: (ingredient.quantity * entry.servings) / recipe.servings,
    }));
  });
  // Internal aggregate only; this is never saved as a cookbook recipe.
  return {
    id: entryIds[0]!,
    title: 'Planned meals',
    source: 'manual',
    servings: 1,
    ingredients,
    steps: ['Review groceries for the selected meals.'],
  };
}
export function buildMealPlanShopping(
  data: Snapshot,
  entryIds: string[],
  newId: () => string,
): ShoppingItem[] {
  const items = buildMissingShopping(data, planRequirements(data, entryIds), 1, newId);
  if (items.length > 40)
    throw new Error('Choose fewer planned meals; this list exceeds forty ingredients.');
  return items;
}
export function addMealPlanShopping(
  data: Snapshot,
  entryIds: string[],
  expectedEntries: MealPlanEntry[],
  items: ShoppingItem[],
): Snapshot {
  const expected = new Map(expectedEntries.map((entry) => [entry.id, entry]));
  if (
    expected.size !== entryIds.length ||
    !entryIds.every((id) => {
      const current = getMealPlan(data).find((entry) => entry.id === id);
      const reviewed = expected.get(id);
      return (
        current &&
        reviewed &&
        current.recipeId === reviewed.recipeId &&
        current.date === reviewed.date &&
        current.servings === reviewed.servings
      );
    })
  )
    throw new Error('The meal plan changed. Review planned groceries again.');
  return addMissingShopping(data, planRequirements(data, entryIds), 1, items);
}
