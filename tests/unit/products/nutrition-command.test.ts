import { expect, it } from 'vitest';
import { kitchen, egg } from '../fixtures';
import { reduceChecked } from '../../../src/domain/reducer';
import {
  nutritionEstimateSchema,
  estimateNutrition,
} from '../../../src/domain/products/nutrition-estimate';
import { hasNutrition } from '../../../src/domain/products/nutrition';
const estimate = nutritionEstimateSchema.parse({
  source: 'ai',
  name: 'Eggs',
  details: 'raw',
  basis: 'g',
  estimatedAt: '2026-09-25T00:00:00Z',
  assumptions: 'Test fixture only',
  per100: {
    calories: 100,
    fat: 5,
    saturatedFat: null,
    carbohydrates: 1,
    sugars: null,
    fiber: null,
    protein: 10,
    sodium: null,
  },
});
it('saves/removes estimates without replacing stock, product metadata or concurrent food edits', () => {
  const data = kitchen();
  data.foods[0]!.brand = 'Updated brand';
  const next = reduceChecked(data, {
    type: 'food.nutrition',
    foodId: egg.id,
    name: egg.name,
    estimate,
  });
  expect(next.foods[0]).toMatchObject({ brand: 'Updated brand', nutritionEstimate: estimate });
  expect(next.stock).toEqual(data.stock);
  expect(next.shopping).toEqual(data.shopping);
  const removed = reduceChecked(next, {
    type: 'food.nutrition',
    foodId: egg.id,
    name: egg.name,
    estimate: null,
  });
  expect(removed.foods[0]).not.toHaveProperty('nutritionEstimate');
  expect(estimateNutrition(estimate).per100).not.toHaveProperty('sodium');
});
it('never resurrects deleted food or applies estimates after the food name changes', () => {
  const command = { type: 'food.nutrition' as const, foodId: egg.id, name: egg.name, estimate };
  const deleted = reduceChecked(kitchen(), { type: 'food.remove', foodId: egg.id });
  expect(reduceChecked(deleted, command)).toEqual(deleted);
  const renamed = reduceChecked(kitchen(), { type: 'food.save', food: { ...egg, name: 'Milk' } });
  expect(reduceChecked(renamed, command)).toEqual(renamed);
  expect(() =>
    reduceChecked(kitchen(), { ...command, estimate: { ...estimate, name: 'Other food' } }),
  ).toThrow('do not match');
  expect(hasNutrition({ per100: {} })).toBe(false);
  expect(hasNutrition({ per100: { calories: 0 } })).toBe(true);
});
