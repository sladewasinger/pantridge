import { expect, it } from 'vitest';
import { addMissingShopping, buildMissingShopping } from '../../../src/domain/recipes/shopping';
import { ingredient, kitchen, recipe } from './fixtures';

it('reserves shopping packages across overlapping generic and specific requirements', () => {
  const data = kitchen('Brown rice');
  data.stock = [];
  const meal = recipe(
    ingredient('Rice', { quantity: 1000 }),
    ingredient('Brown rice', { quantity: 1000 }),
  );
  const rows = buildMissingShopping(data, meal, 1, () => crypto.randomUUID());
  expect(rows).toHaveLength(1);
  expect(rows[0]?.quantity).toBe(4);
  expect(
    buildMissingShopping({ ...data, shopping: rows }, meal, 1, () => crypto.randomUUID()),
  ).toEqual([]);
  const smaller = recipe(
    ingredient('Rice', { quantity: 100 }),
    ingredient('Brown rice', { quantity: 100 }),
  );
  expect(buildMissingShopping(data, smaller, 1, () => crypto.randomUUID())[0]?.quantity).toBe(1);
});

it('rejects a shopping review after preparation changes even when its visible amount is unchanged', () => {
  const data = kitchen('Rice');
  data.foods = [];
  data.stock = [];
  const meal = recipe(
    ingredient('Rice', {
      ingredient: { id: 'rice', preparation: 'dry', basis: 'as-sold' },
    }),
  );
  const rows = buildMissingShopping(data, meal, 1, () => crypto.randomUUID());
  expect(rows[0]?.ingredient?.preparation).toBe('dry');
  const changed = {
    ...meal,
    ingredients: [
      {
        ...meal.ingredients[0]!,
        ingredient: { id: 'rice', preparation: 'cooked' as const, basis: 'as-sold' as const },
      },
    ],
  };
  expect(() => addMissingShopping(data, changed, 1, rows)).toThrow(
    'Review the missing ingredients again',
  );
  expect(addMissingShopping(data, meal, 1, rows).shopping).toEqual(rows);
});

it('keeps dry and cooked requirements with the same displayed name as distinct shopping rows', () => {
  const data = kitchen('Rice');
  data.stock = [];
  const meal = recipe(
    ingredient('Rice', { ingredient: { id: 'rice', preparation: 'dry', basis: 'as-sold' } }),
    ingredient('Rice', { ingredient: { id: 'rice', preparation: 'cooked', basis: 'as-sold' } }),
  );
  const rows = buildMissingShopping(data, meal, 1, () => crypto.randomUUID());
  expect(rows).toHaveLength(2);
  expect(rows[0]?.foodId).toBe(data.foods[0]!.id);
  expect(rows[1]?.foodId).toBeUndefined();
  expect(rows[1]?.ingredient?.preparation).toBe('cooked');
  expect(
    buildMissingShopping({ ...data, shopping: rows }, meal, 1, () => crypto.randomUUID()),
  ).toEqual([]);
});
it('adds ingredient amounts across nonsemantic notes before rounding whole packages', () => {
  const data = kitchen('Eggs', {
    unit: 'cartons',
    size: { amount: 12, measure: 'count', packs: 1 },
  });
  data.stock = [];
  const meal = recipe(
    ingredient('Eggs', { quantity: 10, unit: 'count', note: 'for filling' }),
    ingredient('Egg', { quantity: 10, unit: 'count', note: 'for topping' }),
  );
  const rows = buildMissingShopping(data, meal, 1, () => crypto.randomUUID());
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ foodId: data.foods[0]!.id, quantity: 2 });
  expect(rows[0]?.recipeNote).toContain('20 count');
});
it('reuses shopping for a compatible variety idempotently without pretending garlic bulbs are cloves', () => {
  const data = kitchen('Brown rice');
  data.stock = [];
  const meal = recipe(ingredient('Rice', { quantity: 700 }));
  const rows = buildMissingShopping(data, meal, 1, () => crypto.randomUUID());
  expect(rows[0]?.quantity).toBe(2);
  expect(
    buildMissingShopping({ ...data, shopping: rows }, meal, 1, () => crypto.randomUUID()),
  ).toEqual([]);
  const garlic = kitchen('Garlic', { unit: 'items', size: undefined, packageSize: '' });
  garlic.stock = [];
  const cloves = buildMissingShopping(
    garlic,
    recipe(ingredient('Garlic cloves', { quantity: 3, unit: 'count' })),
    1,
    () => crypto.randomUUID(),
  );
  expect(cloves[0]).toMatchObject({ quantity: 1, unit: 'items' });
  expect(cloves[0]?.foodId).toBeUndefined();
  expect(cloves[0]?.recipeNote).toContain('Check package size');
});
