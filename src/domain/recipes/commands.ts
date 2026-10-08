import type { Command } from '../commands';
import type { Snapshot } from '../model';
import { cookingRecordSchema, type Recipe, type MealPlanEntry } from './model';
import { addMealPlanShopping } from './plan-shopping';
import { recordCooking } from './cooking';
import { addMissingShopping } from './shopping';
import { findRecipe, getCookingHistory, getMealPlan, getRecipes } from './selectors';
import { preserveRecipeClassifications } from '../standardization/preserve';

function restoreRecipe(data: Snapshot, recipe: Recipe): Snapshot {
  if (getRecipes(data).some((item) => item.id === recipe.id))
    throw new Error('Recipe already exists. Review the cookbook before undoing removal.');
  return { ...data, recipes: [...getRecipes(data), recipe] };
}
function restorePlan(data: Snapshot, entry: MealPlanEntry): Snapshot {
  if (getMealPlan(data).some((item) => item.id === entry.id))
    throw new Error('Planned meal already exists. Review the plan before undoing removal.');
  if (!findRecipe(data, entry.recipeId)) throw new Error('Recipe no longer exists.');
  return { ...data, mealPlan: [...getMealPlan(data), entry] };
}

type RecipeCommand = Extract<Command, { type: `recipe.${string}` | `mealPlan.${string}` }>;
export function applyRecipeCommand(data: Snapshot, command: RecipeCommand): Snapshot {
  switch (command.type) {
    case 'recipe.restore':
      return restoreRecipe(data, command.recipe);
    case 'recipe.save':
      return {
        ...data,
        recipes: [
          ...getRecipes(data).filter((item) => item.id !== command.recipe.id),
          preserveRecipeClassifications(
            getRecipes(data).find((recipe) => recipe.id === command.recipe.id),
            command.recipe,
          ),
        ],
      };
    case 'recipe.remove':
      return {
        ...data,
        recipes: getRecipes(data).filter((item) => item.id !== command.recipeId),
        mealPlan: getMealPlan(data).filter((item) => item.recipeId !== command.recipeId),
      };
    case 'mealPlan.restore':
      return restorePlan(data, command.entry);
    case 'mealPlan.save':
      if (!findRecipe(data, command.entry.recipeId)) throw new Error('Recipe no longer exists.');
      return {
        ...data,
        mealPlan: [
          ...getMealPlan(data).filter((item) => item.id !== command.entry.id),
          command.entry,
        ],
      };
    case 'mealPlan.addMissing':
      return addMealPlanShopping(data, command.entryIds, command.expectedEntries, command.items);
    case 'mealPlan.remove':
      return { ...data, mealPlan: getMealPlan(data).filter((item) => item.id !== command.entryId) };
    case 'recipe.cook':
      if (command.reviewed !== true)
        throw new Error('Review the package deductions before recording cooking.');
      return recordCooking(data, command.record, command.expectedPlan);
    case 'recipe.history.restore': {
      const existing = getCookingHistory(data).find((record) => record.id === command.record.id);
      if (
        existing &&
        JSON.stringify(cookingRecordSchema.parse(existing)) !==
          JSON.stringify(cookingRecordSchema.parse(command.record))
      )
        throw new Error('Cooking history ID already exists.');
      return existing
        ? data
        : { ...data, cookingHistory: [...getCookingHistory(data), command.record] };
    }
    case 'recipe.addMissing': {
      const recipe = findRecipe(data, command.recipeId);
      if (!recipe) throw new Error('Recipe no longer exists.');
      return addMissingShopping(data, recipe, command.servings, command.items);
    }
  }
}
