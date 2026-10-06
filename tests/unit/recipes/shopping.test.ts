import { describe, expect, it } from 'vitest';
import { emptySnapshot } from '../../../src/domain/model';
import { reduceChecked } from '../../../src/domain/reducer';
import { buildMissingShopping } from '../../../src/domain/recipes/shopping';
import { buildMealPlanShopping } from '../../../src/domain/recipes/plan-shopping';
import { egg, shoppingId, newLotId, purchase } from '../fixtures';
import { recipe, planId, stockedKitchen } from './fixtures';

describe('recipe and plan groceries', () => {
  it('adds unknown sizes as one-time review entries, without adding food or stock', () => {
    const data = { ...emptySnapshot(), recipes: [recipe] };
    const items = buildMissingShopping(data, recipe, 1, () => shoppingId);
    expect(items[0]).toMatchObject({ name: 'Eggs', quantity: 1, unit: 'items' });
    expect(items[0]?.recipeNote).toContain('3 count');
    expect(items[0]?.recipeNote).toContain('Check package size');
    const after = reduceChecked(data, {
      type: 'recipe.addMissing',
      recipeId: recipe.id,
      servings: 1,
      items,
    });
    expect(after.foods).toEqual([]);
    expect(after.stock).toEqual([]);
    expect(after.shopping).toHaveLength(1);
    expect(
      reduceChecked(after, { type: 'recipe.addMissing', recipeId: recipe.id, servings: 1, items }),
    ).toEqual(after);
  });
  it('rounds shopping packages upward and reuses an existing unchecked row only as needed', () => {
    const data = stockedKitchen();
    data.stock = [];
    data.shopping = [{ ...purchase, quantity: 1, purchased: false }];
    const items = buildMissingShopping(data, recipe, 9, () => newLotId);
    expect(items[0]).toMatchObject({ id: shoppingId, foodId: egg.id, quantity: 3 });
    const after = reduceChecked(data, {
      type: 'recipe.addMissing',
      recipeId: recipe.id,
      servings: 9,
      items,
    });
    expect(after.shopping).toHaveLength(1);
    expect(buildMissingShopping(after, recipe, 9, () => newLotId)).toEqual([]);
    expect(after.stock).toEqual([]);
  });
  it('never treats purchased rows as already available inventory', () => {
    const data = stockedKitchen();
    data.stock = [];
    data.shopping = [purchase];
    const items = buildMissingShopping(data, recipe, 1, () => newLotId);
    expect(items[0]?.id).toBe(newLotId);
    const after = reduceChecked(data, {
      type: 'recipe.addMissing',
      recipeId: recipe.id,
      servings: 1,
      items,
    });
    expect(after.shopping).toHaveLength(2);
    expect(after.shopping.find((item) => item.id === shoppingId)).toEqual(purchase);
  });
  it('does not duplicate an existing unpurchased one-time ingredient', () => {
    const data = stockedKitchen();
    data.stock = [];
    data.shopping = [{ id: shoppingId, name: 'egg', quantity: 1, purchased: false, unit: 'items' }];
    expect(buildMissingShopping(data, recipe, 1, () => newLotId)).toEqual([]);
  });
  it('merges repeated ingredient rows before subtracting stock and existing groceries', () => {
    const data = stockedKitchen();
    data.stock = [];
    data.foods[0]!.unit = 'items';
    delete data.foods[0]!.size;
    const repeated = {
      ...recipe,
      ingredients: [
        ...recipe.ingredients,
        { ...recipe.ingredients[0]!, id: newLotId, name: 'egg', quantity: 2 },
      ],
    };
    const items = buildMissingShopping(data, repeated, 1, () => shoppingId);
    expect(items[0]?.quantity).toBe(5);
  });
  it('requires explicit review for mixed dimensions in either ingredient order', () => {
    const data = stockedKitchen();
    data.stock = [];
    data.foods[0]!.name = 'Flour';
    data.foods[0]!.size = { amount: 1, measure: 'kg', packs: 1 };
    const ingredients = [
      { ...recipe.ingredients[0]!, name: 'Flour', quantity: 100, unit: 'g' as const },
      { ...recipe.ingredients[0]!, id: newLotId, name: 'Flour', quantity: 1, unit: 'cup' as const },
    ];
    for (const rows of [ingredients, [...ingredients].reverse()]) {
      expect(() =>
        buildMissingShopping(data, { ...recipe, ingredients: rows }, 1, () => shoppingId),
      ).toThrow('incompatible recipe units');
    }
  });
  it('rejects changed inventory instead of adding unreviewed larger quantities', () => {
    const data = stockedKitchen();
    data.stock[0]!.quantity = 0.25;
    const items = buildMissingShopping(data, recipe, 5, () => shoppingId);
    const changed = { ...data, stock: [] };
    expect(() =>
      reduceChecked(changed, {
        type: 'recipe.addMissing',
        recipeId: recipe.id,
        servings: 5,
        items,
      }),
    ).toThrow('changed');
    expect(changed.shopping).toEqual([]);
  });
  it('aggregates selected meals so repeated meals cannot reuse the same inventory twice', () => {
    const data = stockedKitchen();
    data.stock[0]!.quantity = 0.25;
    data.mealPlan = [
      { id: planId, recipeId: recipe.id, date: '2026-10-06', servings: 1 },
      { id: newLotId, recipeId: recipe.id, date: '2026-10-07', servings: 1 },
    ];
    expect(buildMissingShopping(data, recipe, 1, () => shoppingId)).toEqual([]);
    const entryIds = data.mealPlan.map((entry) => entry.id);
    const items = buildMealPlanShopping(data, entryIds, () => shoppingId);
    expect(items[0]?.quantity).toBe(1);
    expect(items[0]?.recipeNote).toContain('3 count');
    const command = {
      type: 'mealPlan.addMissing' as const,
      entryIds,
      expectedEntries: data.mealPlan,
      items,
    };
    const after = reduceChecked(data, command);
    expect(after.shopping).toHaveLength(1);
    expect(reduceChecked(after, command)).toEqual(after);
    const changed = {
      ...data,
      mealPlan: data.mealPlan.map((entry) => ({ ...entry, date: '2026-10-08' })),
    };
    expect(() => reduceChecked(changed, command)).toThrow('meal plan changed');
  });
});
