import { kitchen } from '../fixtures';
import { recipe } from '../recipes/fixtures';
import type { SavedStandardization } from '../../../src/domain/standardization/model';
import type { IngredientIdentity } from '../../../src/domain/ingredient-matching/model';

export const newIdentity: IngredientIdentity = {
  id: 'raspberries',
  preparation: 'raw',
  basis: 'as-sold',
};
export const newResult: SavedStandardization = {
  status: 'recognized',
  identity: 'raspberries' as SavedStandardization['identity'],
  preparation: 'raw',
  reason: '',
  version: '2',
  fingerprint: 'a'.repeat(64),
  source: 'ai-private',
};
export function expandedKitchen() {
  const data = kitchen();
  return {
    ...data,
    starterVersion: 1 as const,
    foods: data.foods.map((item) => ({
      ...item,
      ingredient: newIdentity,
      standardization: newResult,
    })),
    stock: data.stock.map((item) => ({
      ...item,
      ingredient: newIdentity,
      standardization: newResult,
      quantity: 1.234567,
    })),
    shopping: data.shopping.map((item) => ({ ...item, ingredient: newIdentity })),
    recipes: [
      {
        ...recipe,
        ingredients: recipe.ingredients.map((item) => ({
          ...item,
          ingredient: newIdentity,
          standardization: newResult,
        })),
      },
    ],
  };
}
