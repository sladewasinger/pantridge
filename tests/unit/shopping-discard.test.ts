import { expect, it } from 'vitest';
import { applyCommand } from '../../src/domain/reducer';
import { kitchen, shoppingId } from './fixtures';

it('discards only checked rows, preserves inventory, and restores without overwriting a concurrent edit', () => {
  const before = kitchen();
  const item = before.shopping[0]!;
  const discarded = applyCommand(before, { type: 'shopping.discard', itemId: shoppingId });
  expect(discarded.shopping).toEqual([]);
  expect(discarded.stock).toBe(before.stock);
  expect(discarded.foods).toBe(before.foods);
  const restored = applyCommand(discarded, { type: 'shopping.restore', item });
  expect(restored.shopping).toMatchObject([item]);
  const edited = { ...restored, shopping: [{ ...item, purchased: false, quantity: 5 }] };
  expect(applyCommand(edited, { type: 'shopping.discard', itemId: shoppingId })).toEqual(edited);
  expect(applyCommand(edited, { type: 'shopping.restore', item })).toBe(edited);
});
it('restores a discarded item as one-time shopping if its food was deleted', () => {
  const before = kitchen();
  const item = before.shopping[0]!;
  const removed = { ...before, foods: [], stock: [], shopping: [] };
  const restored = applyCommand(removed, { type: 'shopping.restore', item });
  expect(restored.shopping[0]).not.toHaveProperty('foodId');
  expect(restored.shopping[0]?.name).toBe(item.name);
});
