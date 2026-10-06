import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { emptySnapshot, snapshotSchema } from '../../../src/domain/model';
import { mutationSchema } from '../../../src/domain/commands';
import { reduceChecked } from '../../../src/domain/reducer';
import { recipeSchema, cookingRecordSchema } from '../../../src/domain/recipes/model';
import { previewCooking } from '../../../src/domain/recipes/cooking';
import {
  getCookbookRecipes,
  getRecipes,
  getMealPlan,
  getCookingHistory,
} from '../../../src/domain/recipes/selectors';
import { changeKitchen, readKitchen } from '../../../src/data/database';
import { reconcile } from '../../../src/data/reconcile';
import { kitchen, newLotId, lotId } from '../fixtures';
import { recipe, record, planId, stockedKitchen } from './fixtures';

const uniqueId = (index: number) => `cb900000-0000-4000-8000-${String(index).padStart(12, '0')}`;
describe('cookbook storage and backup compatibility', () => {
  it('reads old v1 backups unchanged and supplies empty optional getters', () => {
    const old = kitchen();
    const parsed = snapshotSchema.parse(JSON.parse(JSON.stringify(old)));
    expect(parsed).toEqual(old);
    expect(getRecipes(parsed)).toEqual([]);
    expect(getMealPlan(parsed)).toEqual([]);
    expect(getCookingHistory(parsed)).toEqual([]);
  });
  it('retains recipes, dated plans, fractional quantities and cook history on roundtrip', () => {
    const data = stockedKitchen();
    const cooked = reduceChecked(data, {
      type: 'recipe.cook',
      reviewed: true,
      record: record(previewCooking(data, recipe).deductions),
    });
    const planned = reduceChecked(cooked, {
      type: 'mealPlan.save',
      entry: { id: planId, recipeId: recipe.id, date: '2026-10-07', servings: 2 },
    });
    expect(snapshotSchema.parse(JSON.parse(JSON.stringify(planned)))).toEqual(planned);
    let restored = emptySnapshot();
    for (const food of planned.foods)
      restored = reduceChecked(restored, { type: 'food.save', food });
    for (const stock of planned.stock)
      restored = reduceChecked(restored, { type: 'stock.add', stock });
    for (const recipe of getRecipes(planned))
      restored = reduceChecked(restored, { type: 'recipe.save', recipe });
    for (const entry of getMealPlan(planned))
      restored = reduceChecked(restored, { type: 'mealPlan.save', entry });
    for (const record of getCookingHistory(planned))
      restored = reduceChecked(restored, { type: 'recipe.history.restore', record });
    expect(restored).toEqual(planned);
    expect(restored.stock[0]?.quantity).toBe(1.75);
  });
  it('validates recipe IDs, ingredient IDs and meal-plan references while preserving historical deleted food', () => {
    expect(
      snapshotSchema.safeParse({ ...emptySnapshot(), recipes: [recipe, recipe] }).success,
    ).toBe(false);
    expect(
      recipeSchema.safeParse({
        ...recipe,
        ingredients: [...recipe.ingredients, ...recipe.ingredients],
      }).success,
    ).toBe(false);
    expect(
      snapshotSchema.safeParse({
        ...emptySnapshot(),
        mealPlan: [{ id: planId, recipeId: recipe.id, date: '2026-10-07', servings: 1 }],
      }).success,
    ).toBe(false);
    const data = stockedKitchen();
    const cooked = reduceChecked(data, {
      type: 'recipe.cook',
      reviewed: true,
      record: record(previewCooking(data, recipe).deductions),
    });
    const removed = reduceChecked(cooked, { type: 'food.remove', foodId: data.foods[0]!.id });
    expect(removed.cookingHistory).toHaveLength(1);
    expect(snapshotSchema.safeParse(removed).success).toBe(true);
  });
  it('accepts plans for curated recipes without adding them to saved recipes or stock', () => {
    const data = emptySnapshot();
    const builtin = getCookbookRecipes(data)[0]!;
    const planned = reduceChecked(data, {
      type: 'mealPlan.save',
      entry: { id: planId, recipeId: builtin.id, date: '2026-10-08', servings: 2 },
    });
    expect(planned.recipes).toBeUndefined();
    expect(planned.foods).toEqual([]);
    expect(planned.stock).toEqual([]);
    expect(reduceChecked(planned, { type: 'mealPlan.remove', entryId: planId }).mealPlan).toEqual(
      [],
    );
  });
  it('removes future plan references when deleting a saved recipe and keeps history', () => {
    const data = {
      ...stockedKitchen(),
      cookingHistory: [record()],
      mealPlan: [{ id: planId, recipeId: recipe.id, date: '2026-10-08', servings: 1 }],
    };
    const after = reduceChecked(data, { type: 'recipe.remove', recipeId: recipe.id });
    expect(after.recipes).toEqual([]);
    expect(after.mealPlan).toEqual([]);
    expect(after.cookingHistory).toEqual(data.cookingHistory);
  });
  it('guards recipe and plan Undo against concurrent recreated IDs', () => {
    const data = {
      ...stockedKitchen(),
      mealPlan: [{ id: planId, recipeId: recipe.id, date: '2026-10-08', servings: 1 }],
    };
    expect(() => reduceChecked(data, { type: 'recipe.restore', recipe })).toThrow('already exists');
    expect(() =>
      reduceChecked(data, { type: 'mealPlan.restore', entry: data.mealPlan[0]! }),
    ).toThrow('already exists');
    const removed = reduceChecked(data, { type: 'recipe.remove', recipeId: recipe.id });
    const restored = reduceChecked(reduceChecked(removed, { type: 'recipe.restore', recipe }), {
      type: 'mealPlan.restore',
      entry: data.mealPlan[0]!,
    });
    expect(restored).toEqual(data);
  });
  it('rejects recipe301 before changing stock and retains existing cook ID receipts', () => {
    const data = stockedKitchen();
    data.cookingHistory = Array.from({ length: 300 }, (_, index) => ({
      ...record(),
      id: uniqueId(index),
    }));
    const command = {
      type: 'recipe.cook' as const,
      reviewed: true as const,
      record: record(previewCooking(data, recipe).deductions),
    };
    expect(() => reduceChecked(data, command)).toThrow('history is full');
    expect(data.stock[0]?.quantity).toBe(2);
    expect(
      reduceChecked(data, { type: 'recipe.cook', reviewed: true, record: data.cookingHistory[0]! }),
    ).toEqual(data);
  });
  it('bounds recipe and mutation bytes so accepted offline edits can fit the API', () => {
    const large = { ...recipe, steps: Array(30).fill('x'.repeat(1000)) as string[] };
    expect(recipeSchema.safeParse(large).success).toBe(false);
    const saved = mutationSchema.parse({
      id: newLotId,
      command: {
        type: 'recipe.save',
        recipe: { ...recipe, steps: Array(10).fill('x'.repeat(1000)) as string[] },
      },
    });
    expect(new TextEncoder().encode(JSON.stringify(saved)).length).toBeLessThan(16384);
    const deductions = Array.from({ length: 60 }, (_, index) => ({
      stockId: uniqueId(index),
      foodId: lotId,
      quantity: 1,
      expectedQuantity: 2,
      remainingQuantity: 1,
      expectedFoodSignature: 'x'.repeat(700),
    }));
    expect(cookingRecordSchema.safeParse(record(deductions)).success).toBe(false);
    const oversized = {
      id: newLotId,
      command: {
        type: 'recipe.addMissing',
        recipeId: recipe.id,
        servings: 1,
        items: Array.from({ length: 40 }, (_, index) => ({
          id: uniqueId(index),
          name: 'x'.repeat(80),
          unit: 'items',
          quantity: 1,
          purchased: false,
          packageSize: 'x'.repeat(80),
          recipeNote: 'x'.repeat(160),
        })),
      },
    };
    expect(mutationSchema.safeParse(oversized).success).toBe(false);
  });
  it('validates source URLs without throwing on malformed imports', () => {
    for (const sourceUrl of [
      'not-a-url',
      'http://example.com/recipe',
      'https://me:secret@example.com/recipe',
      'javascript:alert(1)',
    ])
      expect(recipeSchema.safeParse({ ...recipe, sourceUrl }).success).toBe(false);
    expect(
      recipeSchema.safeParse({ ...recipe, sourceUrl: 'https://example.com/recipe' }).success,
    ).toBe(true);
  });
  it('persists cooking and its pending mutation atomically and safely replays acknowledged cook IDs', async () => {
    const key = crypto.randomUUID();
    const data = stockedKitchen();
    await changeKitchen(key, (current) => ({ ...current, data }));
    const mutation = mutationSchema.parse({
      id: newLotId,
      command: {
        type: 'recipe.cook',
        reviewed: true,
        record: record(previewCooking(data, recipe).deductions),
      },
    });
    await changeKitchen(key, (current) => ({
      ...current,
      data: reduceChecked(current.data, mutation.command),
      pending: [mutation],
    }));
    const stored = await readKitchen(key);
    expect(stored.data.stock[0]?.quantity).toBe(1.75);
    expect(stored.pending).toEqual([mutation]);
    expect(
      reconcile(stored, { data: stored.data, revision: 1 }, new Set()).data.stock[0]?.quantity,
    ).toBe(1.75);
    expect((await readKitchen(crypto.randomUUID())).data.cookingHistory).toBeUndefined();
  });
});
