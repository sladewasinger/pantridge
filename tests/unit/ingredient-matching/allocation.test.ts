import { expect, it } from 'vitest';
import { getRecipeAvailability } from '../../../src/domain/recipes/availability';
import { previewCooking } from '../../../src/domain/recipes/cooking';
import { buildMissingShopping } from '../../../src/domain/recipes/shopping';
import { ingredient, kitchen, recipe } from './fixtures';
import type { Snapshot } from '../../../src/domain/model';

it('keeps package-unit recipes reviewable without crashing or inferring package equivalence', () => {
  const data = kitchen('Rice');
  const meal = recipe(ingredient('Rice', { quantity: 1, unit: 'package' }));
  expect(getRecipeAvailability(data, meal).status).toBe('needs-review');
  expect(previewCooking(data, meal)).toMatchObject({ deductions: [], needsReview: true });
  expect(buildMissingShopping(data, meal, 1, () => crypto.randomUUID())).toEqual([]);
});
it('uses the globally earliest compatible lot while preserving narrower ingredient demands', () => {
  const data = kitchen('Brown rice');
  data.stock[0]!.expires = '2026-10-20';
  const white = { ...data.foods[0]!, id: crypto.randomUUID(), name: 'White rice' };
  data.foods.push(white);
  data.stock.push({
    id: crypto.randomUUID(),
    foodId: white.id,
    quantity: 1,
    expires: '2026-10-08',
  });
  const meal = recipe(
    ingredient('Brown rice', { quantity: 100 }),
    ingredient('Rice', { quantity: 100 }),
  );
  const result = previewCooking(data, meal);
  expect(result.needsReview).toBe(false);
  expect(result.deductions.find((row) => row.foodId === white.id)?.quantity).toBe(0.2);
  expect(result.deductions.find((row) => row.foodId === data.foods[0]!.id)?.quantity).toBe(0.2);
});

it.each([false, true])(
  'reassigns crossed variety/preparation capacities without false shortages: reversed=%s',
  (reversed) => {
    const data = kitchen('Brown rice');
    data.stock[0]!.quantity = 1;
    data.stock[0]!.expires = '2026-10-08';
    data.stock.push({ ...data.stock[0]!, id: crypto.randomUUID() });
    data.stock.push({
      id: crypto.randomUUID(),
      foodId: data.foods[0]!.id,
      quantity: 1,
      ingredient: { id: 'brown-rice', preparation: 'cooked', basis: 'as-sold' },
    });
    const white = { ...data.foods[0]!, id: crypto.randomUUID(), name: 'White rice' };
    data.foods.push(white);
    data.stock.push({ id: crypto.randomUUID(), foodId: white.id, quantity: 1 });
    const rows = [
      ingredient('Brown rice', {
        quantity: 1000,
        ingredient: { id: 'brown-rice', preparation: 'any', basis: 'as-sold' },
      }),
      ingredient('Rice', { quantity: 1000 }),
    ];
    const meal = recipe(...(reversed ? rows.toReversed() : rows));
    expect(getRecipeAvailability(data, meal).status).toBe('confirmed');
    const cooking = previewCooking(data, meal);
    expect(cooking.needsReview).toBe(false);
    expect(cooking.deductions).toHaveLength(4);
    expect(cooking.deductions.map((row) => row.quantity)).toEqual([1, 1, 1, 1]);
    expect(buildMissingShopping(data, meal, 1, () => crypto.randomUUID())).toEqual([]);
    const cooked = { ...data.foods[0]!, id: crypto.randomUUID(), name: 'Cooked brown rice' };
    const pending: Snapshot = {
      ...data,
      foods: [...data.foods, cooked],
      stock: [],
      shopping: [
        {
          id: crypto.randomUUID(),
          foodId: data.foods[0]!.id,
          name: 'Brown rice',
          unit: 'bags',
          quantity: 2,
          purchased: false,
        },
        {
          id: crypto.randomUUID(),
          foodId: cooked.id,
          name: cooked.name,
          unit: 'bags',
          quantity: 1,
          purchased: false,
        },
        {
          id: crypto.randomUUID(),
          foodId: white.id,
          name: white.name,
          unit: 'bags',
          quantity: 1,
          purchased: false,
        },
      ],
    };
    expect(buildMissingShopping(pending, meal, 1, () => crypto.randomUUID())).toEqual([]);
  },
);

it.each([false, true])(
  'reserves specific rice before a generic requirement regardless of display order: reversed=%s',
  (reversed) => {
    const data = kitchen('Brown rice');
    data.stock[0]!.quantity = 1;
    data.stock[0]!.expires = '2026-10-08';
    const white = { ...data.foods[0]!, id: crypto.randomUUID(), name: 'White rice' };
    data.foods.push(white);
    data.stock.push({ id: crypto.randomUUID(), foodId: white.id, quantity: 1 });
    const rows = [
      ingredient('Rice', { quantity: 500 }),
      ingredient('Brown rice', { quantity: 500 }),
    ];
    const meal = recipe(...(reversed ? rows.toReversed() : rows));
    const match = getRecipeAvailability(data, meal);
    expect(match.status).toBe('confirmed');
    expect(match.ingredients.map((row) => row.ingredient.name)).toEqual(
      meal.ingredients.map((row) => row.name),
    );
    expect(match.ingredients.map((row) => row.available)).toEqual([500, 500]);
    const cooking = previewCooking(data, meal);
    expect(cooking.needsReview).toBe(false);
    expect(cooking.deductions).toHaveLength(2);
    expect(cooking.deductions.map((row) => row.quantity)).toEqual([1, 1]);
    expect(buildMissingShopping(data, meal, 1, () => crypto.randomUUID())).toEqual([]);
    const unstocked = {
      ...data,
      stock: [],
      shopping: data.stock.map((lot) => {
        const food = data.foods.find((row) => row.id === lot.foodId)!;
        return {
          id: crypto.randomUUID(),
          foodId: food.id,
          name: food.name,
          unit: food.unit,
          quantity: 1,
          purchased: false,
        };
      }),
    };
    expect(buildMissingShopping(unstocked, meal, 1, () => crypto.randomUUID())).toEqual([]);
  },
);
it('allocates a constrained dry preparation before a variety that accepts either preparation', () => {
  const data = kitchen('Brown rice');
  data.stock[0]!.quantity = 1;
  data.stock[0]!.expires = '2026-10-08';
  data.stock.push({
    id: crypto.randomUUID(),
    foodId: data.foods[0]!.id,
    quantity: 1,
    ingredient: { id: 'brown-rice', preparation: 'cooked', basis: 'as-sold' },
  });
  const meal = recipe(
    ingredient('Brown rice', {
      quantity: 500,
      ingredient: { id: 'brown-rice', preparation: 'any', basis: 'as-sold' },
    }),
    ingredient('Rice', { quantity: 500 }),
  );
  expect(getRecipeAvailability(data, meal).status).toBe('confirmed');
  expect(previewCooking(data, meal).deductions).toHaveLength(2);
  expect(buildMissingShopping(data, meal, 1, () => crypto.randomUUID())).toEqual([]);
});
