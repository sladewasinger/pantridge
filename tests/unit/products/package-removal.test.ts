import { expect, it } from 'vitest';
import { commandSchema } from '../../../src/domain/commands';
import { reduceChecked } from '../../../src/domain/reducer';
import { cellarFoods, newFood } from '../../../src/domain/selectors';
import { emptySnapshot, type Food } from '../../../src/domain/model';
import { kitchen, lotId, newLotId } from '../fixtures';

it('removes only the selected package, replays safely, and restores all its metadata', () => {
  const data = kitchen();
  const saved = {
    ...data.stock[0]!,
    expirySource: 'estimate' as const,
    product: {
      barcode: '03017620422003',
      name: 'Brand Eggs',
      brand: 'Brand',
      source: 'openfoodfacts' as const,
      nutrition: { per100: { calories: 140 } },
    },
  };
  data.stock = [saved, { id: newLotId, foodId: saved.foodId, quantity: 0 }];
  const command = commandSchema.parse({ type: 'stock.remove', stockId: lotId });
  const removed = reduceChecked(data, command);
  expect(removed.stock).toEqual([data.stock[1]]);
  expect(removed.foods).toEqual(data.foods);
  expect(removed.shopping).toEqual(data.shopping);
  expect(reduceChecked(removed, command)).toEqual(removed);
  const restored = reduceChecked(removed, { type: 'stock.add', stock: saved });
  expect(restored.stock.find((lot) => lot.id === lotId)).toEqual(saved);
  expect(reduceChecked(restored, { type: 'stock.add', stock: saved })).toEqual(restored);
  expect(reduceChecked(removed, { type: 'stock.remove', stockId: newLotId }).stock).toEqual([]);
});

it('groups stocked cellar items by location, then alphabetically within each group', () => {
  const data = emptySnapshot();
  for (const location of ['freezer', 'pantry', 'fridge', 'unspecified'] as const) {
    for (const name of ['Zebra', 'Apple']) {
      const food: Food = {
        ...newFood(`${name} ${location}`),
        location: location === 'freezer' ? 'fridge' : location,
        frozen: location === 'freezer',
      };
      data.foods.push(food);
      data.stock.push({ id: crypto.randomUUID(), foodId: food.id, quantity: 1 });
    }
  }
  data.foods.push({ ...newFood('Depleted'), location: 'unspecified' });
  const original = structuredClone(data);
  expect(cellarFoods(data).map((food) => food.name)).toEqual([
    'Apple unspecified',
    'Zebra unspecified',
    'Apple fridge',
    'Zebra fridge',
    'Apple pantry',
    'Zebra pantry',
    'Apple freezer',
    'Zebra freezer',
  ]);
  expect(data).toEqual(original);
});
