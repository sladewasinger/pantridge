import { expect, it } from 'vitest';
import { emptySnapshot } from '../../../src/domain/model';
import {
  calculateRecipeNutrition,
  withCalculatedNutrition,
} from '../../../src/domain/recipe-nutrition/calculate';
import { recipeFit } from '../../../src/domain/recipe-preferences/fit';
import { emptyPreferences } from '../../../src/domain/recipe-preferences/model';
import { egg, kitchen } from '../fixtures';
import { recipe } from './fixtures';

it('calculates USDA large-egg portions without modifying stock or guessing macros', () => {
  const data = kitchen();
  const before = structuredClone(data);
  const nutrition = calculateRecipeNutrition(data, recipe)!;
  expect(nutrition).toMatchObject({
    source: 'calculated',
    calories: 214.5,
    protein: 18.9,
    sodium: 213,
    carbohydrate: 1.1,
    fat: 14.3,
    missing: [],
  });
  expect(nutrition.evidence![0]).toMatchObject({ source: 'usda', fdcId: 171287 });
  expect(nutrition.evidence![0]!.assumption).toContain('large: 50 g');
  expect(data).toEqual(before);
});
it('prefers matching package nutrition and explicitly uses USDA only for the portion weight', () => {
  const data = kitchen();
  data.stock[0]!.product = {
    barcode: '12345678',
    name: 'Packaged eggs',
    brand: '',
    source: 'openfoodfacts',
    nutrition: {
      basis: 'g',
      per100: { calories: 150, protein: 13, fat: 10, carbohydrates: 1, sodium: 200, fiber: 0 },
    },
  };
  const nutrition = calculateRecipeNutrition(data, recipe)!;
  expect(nutrition).toMatchObject({ calories: 225, protein: 19.5, sodium: 300, missing: [] });
  expect(nutrition.evidence![0]!.source).toBe('package');
  expect(nutrition.evidence![0]!.assumption).toContain('USDA large');
});
it('does not mix unknown/different package labels into one apparently authoritative label', () => {
  const data = kitchen();
  data.stock[0]!.product = {
    barcode: '12345678',
    name: 'Eggs',
    brand: '',
    source: 'openfoodfacts',
    nutrition: { basis: 'g', per100: { calories: 999 } },
  };
  data.stock.push({ id: crypto.randomUUID(), foodId: egg.id, quantity: 1 });
  expect(calculateRecipeNutrition(data, recipe)!.evidence![0]!.source).toBe('usda');
});
it('keeps raw/cooked states separate and leaves unknown foods, amounts and sodium partial', () => {
  const input = {
    ...recipe,
    ingredients: [
      { ...recipe.ingredients[0]!, name: 'Rice', quantity: 100, unit: 'g' as const },
      {
        ...recipe.ingredients[0]!,
        id: crypto.randomUUID(),
        name: 'Black beans',
        quantity: 200,
        unit: 'g' as const,
      },
    ],
    untrackedIngredients: ['Water', 'Salt to taste'],
  };
  const raw = calculateRecipeNutrition(emptySnapshot(), input)!;
  const cooked = calculateRecipeNutrition(emptySnapshot(), {
    ...input,
    ingredients: [{ ...input.ingredients[0]!, name: 'Cooked rice' }],
  })!;
  expect(raw.calories).toBeGreaterThan(cooked.calories!);
  expect(raw.missing).toEqual(['Black beans', 'Salt to taste']);
  const unknown = calculateRecipeNutrition(emptySnapshot(), {
    ...recipe,
    ingredients: [{ ...recipe.ingredients[0]!, name: 'Kosher salt', quantity: 1, unit: 'tsp' }],
  })!;
  expect(unknown.sodium).toBeUndefined();
  expect(unknown.missing).toEqual(['Kosher salt']);
});
it('does not report an incomplete macro total as meeting a target and recalculates servings', () => {
  const partial = withCalculatedNutrition(emptySnapshot(), {
    ...recipe,
    ingredients: [{ ...recipe.ingredients[0]!, name: 'Mystery food' }],
  });
  expect(recipeFit(partial, { ...emptyPreferences(), directions: ['high-protein'] })).toEqual([
    'protein target unverified: incomplete nutrition',
  ]);
  expect(calculateRecipeNutrition(emptySnapshot(), { ...recipe, servings: 3 })!.protein).toBe(6.3);
});
