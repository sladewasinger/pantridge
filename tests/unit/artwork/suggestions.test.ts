import { expect, it } from 'vitest';
import { emptySnapshot } from '../../../src/domain/model';
import { newFood } from '../../../src/domain/selectors';
import { shoppingSuggestions } from '../../../src/domain/shopping-suggestions';
it('caps suggestions at six, prioritizes low stock and near dates, and omits listed items', () => {
  const data = emptySnapshot();
  data.foods = Array.from({ length: 12 }, (_, i) => newFood(`Food ${i}`));
  data.stock = data.foods.map((food, i) => ({
    id: crypto.randomUUID(),
    foodId: food.id,
    quantity: i % 3,
    expires: `2026-09-${String(20 - i).padStart(2, '0')}`,
  }));
  data.shopping = [
    {
      id: crypto.randomUUID(),
      foodId: data.foods[0]!.id,
      name: 'Food 0',
      unit: 'items',
      quantity: 1,
      purchased: false,
    },
  ];
  const result = shoppingSuggestions(data, '');
  expect(result).toHaveLength(6);
  expect(result.slice(0, 3).map((food) => food.name)).toEqual(['Food 3', 'Food 6', 'Food 9']);
  expect(result[3]?.name).toBe('Food 10');
  expect(shoppingSuggestions(data, 'Food 11')[0]?.name).toBe('Food 11');
});
