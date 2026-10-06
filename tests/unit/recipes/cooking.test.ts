import { describe, expect, it } from 'vitest';
import { commandSchema } from '../../../src/domain/commands';
import { stockSchema } from '../../../src/domain/model';
import { reduceChecked } from '../../../src/domain/reducer';
import { foodCookingSignature, previewCooking } from '../../../src/domain/recipes/cooking';
import { cookingRecordSchema } from '../../../src/domain/recipes/model';
import { lotId, newLotId, egg, kitchen } from '../fixtures';
import { recipe, stockedKitchen, record } from './fixtures';

describe('explicit reviewed cooking', () => {
  it('previews exact fractional package use and records before/after atomically', () => {
    const data = stockedKitchen();
    const preview = previewCooking(data, recipe);
    expect(preview.deductions).toEqual([
      {
        stockId: lotId,
        foodId: egg.id,
        quantity: 0.25,
        expectedQuantity: 2,
        expectedFoodSignature: foodCookingSignature(data.foods[0]!),
        remainingQuantity: 1.75,
      },
    ]);
    const command = {
      type: 'recipe.cook' as const,
      reviewed: true as const,
      record: record(preview.deductions),
    };
    const after = reduceChecked(data, command);
    expect(after.stock[0]?.quantity).toBe(1.75);
    expect(after.cookingHistory?.[0]?.deductions[0]?.remainingQuantity).toBe(1.75);
    expect(reduceChecked(after, command)).toEqual(after);
    expect(data.stock[0]?.quantity).toBe(2);
  });
  it('rejects concurrent package metadata edits and missing metadata review', () => {
    const data = stockedKitchen();
    const deductions = previewCooking(data, recipe).deductions;
    const changed = {
      ...data,
      foods: data.foods.map((food) => ({
        ...food,
        size: { amount: 24, measure: 'count' as const, packs: 1 },
      })),
    };
    expect(() =>
      reduceChecked(changed, { type: 'recipe.cook', reviewed: true, record: record(deductions) }),
    ).toThrow('details changed');
    const missing = deductions.map(
      ({ expectedFoodSignature: _signature, ...deduction }) => deduction,
    );
    expect(() =>
      reduceChecked(data, { type: 'recipe.cook', reviewed: true, record: record(missing) }),
    ).toThrow('details changed');
    expect(data.stock[0]?.quantity).toBe(2);
  });
  it('never rounds unrepresentable thirds or guesses unknown carton contents', () => {
    const data = stockedKitchen();
    data.foods[0]!.size!.amount = 9;
    expect(previewCooking(data, recipe)).toMatchObject({ deductions: [], needsReview: true });
    expect(previewCooking(kitchen(), recipe)).toMatchObject({ deductions: [], needsReview: true });
  });
  it('uses earliest dated lots first and never consumes optional ingredients silently', () => {
    const data = stockedKitchen();
    data.stock[0]!.quantity = 0.125;
    data.stock.push({ ...data.stock[0]!, id: newLotId, quantity: 2, expires: '2026-09-10' });
    expect(previewCooking(data, recipe).deductions[0]?.stockId).toBe(newLotId);
    expect(
      previewCooking(data, {
        ...recipe,
        ingredients: recipe.ingredients.map((item) => ({ ...item, optional: true })),
      }).deductions,
    ).toEqual([]);
  });
  it('rejects stale and missing lots without partially applying any deduction', () => {
    const data = stockedKitchen();
    data.stock[0]!.quantity = 0.125;
    data.stock.push({ ...data.stock[0]!, id: newLotId, quantity: 2, expires: '2026-09-14' });
    const command = {
      type: 'recipe.cook' as const,
      reviewed: true as const,
      record: record(previewCooking(data, recipe).deductions),
    };
    const stale = {
      ...data,
      stock: data.stock.map((lot) => (lot.id === newLotId ? { ...lot, quantity: 1 } : lot)),
    };
    expect(() => reduceChecked(stale, command)).toThrow('quantity changed');
    expect(stale.stock[0]?.quantity).toBe(0.125);
    const missing = { ...data, stock: data.stock.filter((lot) => lot.id !== newLotId) };
    expect(() => reduceChecked(missing, command)).toThrow('no longer exists');
    expect(missing.cookingHistory).toBeUndefined();
  });
  it('rejects supplies, wrong food IDs, excessive use and tampered remainders', () => {
    const data = stockedKitchen();
    const deductions = previewCooking(data, recipe).deductions;
    data.foods[0]!.kind = 'supply';
    expect(() =>
      reduceChecked(data, { type: 'recipe.cook', reviewed: true, record: record(deductions) }),
    ).toThrow('supplies');
    data.foods[0]!.kind = 'food';
    expect(() =>
      reduceChecked(data, {
        type: 'recipe.cook',
        reviewed: true,
        record: record([{ ...deductions[0]!, foodId: newLotId }]),
      }),
    ).toThrow('no longer exists');
    expect(
      cookingRecordSchema.safeParse(record([{ ...deductions[0]!, remainingQuantity: 2 }])).success,
    ).toBe(false);
    expect(
      cookingRecordSchema.safeParse(record([{ ...deductions[0]!, quantity: 3 }])).success,
    ).toBe(false);
    expect(cookingRecordSchema.safeParse(record([...deductions, ...deductions])).success).toBe(
      false,
    );
  });
  it('requires explicit review, supports consciously recording no deductions, and rejects cook-ID reuse', () => {
    expect(commandSchema.safeParse({ type: 'recipe.cook', record: record() }).success).toBe(false);
    const data = stockedKitchen();
    const after = reduceChecked(data, { type: 'recipe.cook', reviewed: true, record: record() });
    expect(after.stock).toEqual(data.stock);
    expect(() =>
      reduceChecked(after, {
        type: 'recipe.cook',
        reviewed: true,
        record: { ...record(), servings: 2 },
      }),
    ).toThrow('different details');
  });
  it('bounds fractions to six decimals while keeping shopping and ordinary adjust deltas integral', () => {
    expect(stockSchema.safeParse({ id: lotId, foodId: egg.id, quantity: 0.000001 }).success).toBe(
      true,
    );
    expect(stockSchema.safeParse({ id: lotId, foodId: egg.id, quantity: 0.0000001 }).success).toBe(
      false,
    );
    expect(
      commandSchema.safeParse({ type: 'stock.adjust', stockId: lotId, delta: 0.25 }).success,
    ).toBe(false);
    const data = stockedKitchen();
    data.stock[0]!.quantity = 0.2;
    expect(
      reduceChecked(data, { type: 'stock.adjust', stockId: lotId, delta: 1 }).stock[0]?.quantity,
    ).toBe(1.2);
    expect(
      reduceChecked(data, { type: 'stock.adjust', stockId: lotId, delta: -1 }).stock[0]?.quantity,
    ).toBe(0);
  });
});
