import { emptySnapshot, type Food, type Snapshot } from '../../../src/domain/model';
import type { Recipe, RecipeIngredient } from '../../../src/domain/recipes/model';

export const ingredient = (
  name: string,
  overrides: Partial<RecipeIngredient> = {},
): RecipeIngredient => ({ id: crypto.randomUUID(), name, quantity: 100, unit: 'g', ...overrides });
export const recipe = (...ingredients: RecipeIngredient[]): Recipe => ({
  id: crypto.randomUUID(),
  title: 'Local matching test',
  source: 'manual',
  servings: 1,
  ingredients,
  steps: ['Prepare the ingredients.'],
});
export function kitchen(name: string, overrides: Partial<Food> = {}): Snapshot {
  const food: Food = {
    id: crypto.randomUUID(),
    name,
    kind: 'food',
    unit: 'bags',
    art: 'generic',
    brand: '',
    packageSize: '500 g',
    size: { amount: 500, measure: 'g', packs: 1 },
    location: 'pantry',
    shelf: 0,
    frozen: false,
    ...overrides,
  };
  return {
    ...emptySnapshot(),
    foods: [food],
    stock: [{ id: crypto.randomUUID(), foodId: food.id, quantity: 2 }],
  };
}
