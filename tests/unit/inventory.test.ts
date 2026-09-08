import { describe, expect, it } from 'vitest';
import { commandSchema } from '../../src/domain/commands';
import { reduceChecked } from '../../src/domain/reducer';
import { countFood, foodLots, stockedFoods } from '../../src/domain/selectors';
import { egg, kitchen, lotId, newLotId, shoppingId } from './fixtures';

describe('inventory and shopping rules', () => {
  it('hides depleted food but keeps its identity and never goes negative', () => {
    const result = reduceChecked(kitchen(), { type: 'stock.adjust', stockId: lotId, delta: -20 });
    expect(stockedFoods(result)).toEqual([]);
    expect(result.foods).toEqual([egg]);
    expect(result.stock[0]?.quantity).toBe(0);
  });
  it('keeps differently dated lots under the same shelf item', () => {
    const result = reduceChecked(kitchen(), {
      type: 'stock.add',
      stock: { id: newLotId, foodId: egg.id, quantity: 1, expires: '2026-09-10' },
    });
    expect(countFood(result, egg.id)).toBe(3);
    expect(foodLots(result, egg.id).map((lot) => lot.expires)).toEqual([
      '2026-09-10',
      '2026-09-12',
    ]);
  });
  it('checking off purchases does not change inventory', () => {
    const result = reduceChecked(kitchen(), {
      type: 'shopping.purchase',
      itemId: shoppingId,
      purchased: true,
    });
    expect(countFood(result, egg.id)).toBe(2);
  });
  it('put-away consumes a purchased entry exactly once and retains expiration', () => {
    const command = {
      type: 'shopping.putAway' as const,
      itemId: shoppingId,
      food: egg,
      stock: { id: newLotId, foodId: egg.id, quantity: 2, expires: '2026-09-20' },
    };
    const result = reduceChecked(kitchen(), command);
    expect(countFood(result, egg.id)).toBe(4);
    expect(result.shopping).toEqual([]);
    expect(reduceChecked(result, command)).toEqual(result);
  });
  it('rejects a stale put-away quantity instead of silently losing an edit', () => {
    expect(() =>
      reduceChecked(kitchen(), {
        type: 'shopping.putAway',
        itemId: shoppingId,
        food: egg,
        stock: { id: newLotId, foodId: egg.id, quantity: 1 },
      }),
    ).toThrow('quantity changed');
  });
  it('one-time purchases do not create food catalog entries', () => {
    const result = reduceChecked(kitchen(), {
      type: 'shopping.save',
      item: {
        id: newLotId,
        name: 'Birthday candles',
        unit: 'packs',
        quantity: 1,
        purchased: false,
      },
    });
    expect(result.foods).toHaveLength(1);
    expect(result.shopping[1]?.foodId).toBeUndefined();
  });
  it('validates dates and rejects fractional counts', () => {
    expect(
      commandSchema.safeParse({ type: 'stock.date', stockId: lotId, expires: '2026-02-30' })
        .success,
    ).toBe(false);
    expect(
      commandSchema.safeParse({ type: 'stock.adjust', stockId: lotId, delta: 0.5 }).success,
    ).toBe(false);
  });
});
