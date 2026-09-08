import { describe, expect, it } from 'vitest';
import { snapshotSchema } from '../../src/domain/model';
import { reduceChecked } from '../../src/domain/reducer';
import { expirationBadge } from '../../src/domain/expiration';
import { egg, kitchen, newLotId, shoppingId } from './fixtures';

describe('inventory integrity', () => {
  it('rejects duplicate IDs and orphaned backup references', () => {
    const data = kitchen();
    expect(snapshotSchema.safeParse({ ...data, foods: [egg, egg] }).success).toBe(false);
    expect(snapshotSchema.safeParse({ ...data, foods: [] }).success).toBe(false);
    expect(
      snapshotSchema.safeParse({ ...data, shopping: [{ ...data.shopping[0], foodId: newLotId }] })
        .success,
    ).toBe(false);
  });
  it('rejects put-away into another food or with different units without changing state', () => {
    const data = kitchen();
    for (const food of [
      { ...egg, id: newLotId },
      { ...egg, unit: 'items' as const },
    ]) {
      expect(() =>
        reduceChecked(data, {
          type: 'shopping.putAway',
          itemId: shoppingId,
          food,
          stock: { id: newLotId, foodId: food.id, quantity: 2 },
        }),
      ).toThrow('do not match');
    }
    expect(data).toEqual(kitchen());
  });
  it('updates the destination and stock together during put-away', () => {
    const data = reduceChecked(kitchen(), {
      type: 'shopping.putAway',
      itemId: shoppingId,
      food: { ...egg, frozen: true, shelf: 2 },
      stock: { id: newLotId, foodId: egg.id, quantity: 2 },
    });
    expect(data.foods[0]).toMatchObject({ frozen: true, shelf: 2 });
    expect(data.shopping).toEqual([]);
    expect(data.stock).toHaveLength(2);
  });
  it('labels dates by the local calendar day without making food-safety claims', () => {
    const today = new Date(2026, 8, 8, 23, 50);
    expect(expirationBadge('2026-09-08', today).label).toBe('Today');
    expect(expirationBadge('2026-09-09', today).label).toBe('Tomorrow');
    expect(expirationBadge('2026-09-07', today).tone).toBe('past');
    expect(expirationBadge('2026-09-12', today).tone).toBe('later');
  });
});
