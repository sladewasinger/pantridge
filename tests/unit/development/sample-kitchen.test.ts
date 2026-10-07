import { expect, it } from 'vitest';
import { addSampleFoods } from '../../../src/development/sample-kitchen';
import { emptySnapshot } from '../../../src/domain/model';
import { isRecipeFoodName } from '../../../src/domain/recipe-suggestions/foods';
import { suggestionFoods } from '../../../src/domain/recipe-suggestions/inventory';
import { kitchen } from '../fixtures';

it('creates 200 distinct recognized foods with varied artwork, placement and measured stock', () => {
  const sample = addSampleFoods(emptySnapshot());
  expect(sample.foods).toHaveLength(200);
  expect(sample.stock).toHaveLength(200);
  expect(new Set(sample.foods.map((food) => food.name)).size).toBe(200);
  expect(sample.foods.every((food) => isRecipeFoodName(food.name))).toBe(true);
  expect(new Set(sample.foods.map((food) => food.art)).size).toBeGreaterThan(40);
  expect(sample.foods.some((food) => food.frozen)).toBe(true);
  expect(sample.foods.some((food) => food.location === 'fridge' && !food.frozen)).toBe(true);
  expect(sample.foods.some((food) => food.location === 'pantry' && !food.frozen)).toBe(true);
  expect(suggestionFoods(sample, '2026-10-06').length).toBeGreaterThan(150);
});

it('preserves existing packages and groceries and never duplicates or restocks a repeated load', () => {
  const original = kitchen();
  const sample = addSampleFoods(original);
  expect(original.foods).toHaveLength(1);
  expect(sample.foods).toContainEqual(original.foods[0]);
  expect(sample.stock).toContainEqual(original.stock[0]);
  expect(sample.shopping).toEqual(original.shopping);
  const consumed = { ...sample, stock: sample.stock.map((stock) => ({ ...stock, quantity: 0 })) };
  expect(addSampleFoods(consumed)).toEqual(consumed);
});

it('rejects a sample that would exceed snapshot capacity rather than partly writing it', () => {
  const data = kitchen();
  data.foods = Array.from({ length: 600 }, (_, index) => ({
    ...data.foods[0]!,
    id: crypto.randomUUID(),
    name: `Existing ${index}`,
  }));
  data.stock = [];
  expect(() => addSampleFoods(data)).toThrow();
  expect(data.foods).toHaveLength(600);
});
