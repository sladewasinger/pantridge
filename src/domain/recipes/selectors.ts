import type { Snapshot } from '../model';
import { starterRecipes } from './starters';

export const getRecipes = (data: Snapshot) => data.recipes ?? [];
export const getMealPlan = (data: Snapshot) => data.mealPlan ?? [];
export const getCookingHistory = (data: Snapshot) => data.cookingHistory ?? [];
export function getCookbookRecipes(data: Snapshot) {
  const saved = getRecipes(data);
  return [
    ...starterRecipes.filter((recipe) => !saved.some((item) => item.id === recipe.id)),
    ...saved,
  ];
}
export function findRecipe(data: Snapshot, id: string) {
  return getCookbookRecipes(data).find((recipe) => recipe.id === id);
}
