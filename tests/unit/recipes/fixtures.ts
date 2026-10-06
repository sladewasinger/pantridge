import type { Recipe, CookingRecord } from '../../../src/domain/recipes/model';
import type { Snapshot } from '../../../src/domain/model';
import { kitchen } from '../fixtures';

export const recipe: Recipe = {
  id: 'cb100000-0000-4000-8000-000000000001',
  title: 'Three eggs',
  servings: 1,
  source: 'manual',
  steps: ['Cook the eggs thoroughly.'],
  ingredients: [
    { id: 'cb100000-0000-4000-8000-000000000002', name: 'Eggs', quantity: 3, unit: 'count' },
  ],
};
export const planId = 'cb100000-0000-4000-8000-000000000003';
export function stockedKitchen(): Snapshot {
  const data = kitchen();
  return {
    ...data,
    recipes: [recipe],
    shopping: [],
    foods: data.foods.map((food) => ({
      ...food,
      size: { amount: 12, measure: 'count', packs: 1 },
    })),
  };
}
export function record(deductions: CookingRecord['deductions'] = []): CookingRecord {
  return {
    id: 'cb100000-0000-4000-8000-000000000004',
    recipeId: recipe.id,
    recipeTitle: recipe.title,
    servings: 1,
    cookedAt: '2026-10-06T12:00:00Z',
    deductions,
  };
}
