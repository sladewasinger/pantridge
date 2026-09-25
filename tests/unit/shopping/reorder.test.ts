import { expect, it } from 'vitest';
import { emptySnapshot, type ShoppingItem } from '../../../src/domain/model';
import { reduceChecked } from '../../../src/domain/reducer';
import { mutationSchema } from '../../../src/domain/commands';
import { blankKitchen } from '../../../src/data/database';
import { reconcile } from '../../../src/data/reconcile';
import { keyboardTarget } from '../../../src/features/shopping/reorder-target';

const item = (name: string, purchased = false): ShoppingItem => ({
  id: crypto.randomUUID(),
  name,
  unit: 'items',
  quantity: 1,
  purchased,
});
const [beef, onion, berries, done] = [
  item('Beef'),
  item('Red onion'),
  item('Raspberries'),
  item('Milk', true),
] as [ShoppingItem, ShoppingItem, ShoppingItem, ShoppingItem];
const data = { ...emptySnapshot(), shopping: [beef, onion, berries, done] };
it('moves a shopping row without losing its metadata, quantity or purchased status', () => {
  const sized = { ...beef, packageSize: '3 lb', quantity: 2, art: 'plain-box' as const };
  const next = reduceChecked(
    { ...data, shopping: [sized, onion, berries, done] },
    { type: 'shopping.move', itemId: beef.id, beforeId: done.id },
  );
  expect(next.shopping).toEqual([sized, onion, berries, done]);
  const moved = reduceChecked(next, {
    type: 'shopping.move',
    itemId: beef.id,
    beforeId: berries.id,
  });
  expect(moved.shopping).toEqual([onion, sized, berries, done]);
  const edited = reduceChecked(moved, { type: 'shopping.save', item: { ...sized, quantity: 3 } });
  expect(edited.shopping.map((entry) => entry.id)).toEqual(moved.shopping.map((entry) => entry.id));
  expect(edited.shopping[1]?.packageSize).toBe('3 lb');
});
it('replays relative moves around concurrent additions and ignores removed targets', () => {
  const extra = item('Bread');
  const mutation = mutationSchema.parse({
    id: crypto.randomUUID(),
    command: { type: 'shopping.move', itemId: berries.id, beforeId: beef.id },
  });
  const current = { ...blankKitchen(), data, pending: [mutation] };
  const remote = { revision: 1, data: { ...data, shopping: [extra, ...data.shopping] } };
  const next = reconcile(current, remote, new Set());
  expect(next.data.shopping).toEqual([extra, berries, beef, onion, done]);
  expect(next.pending[0]?.id).toBe(mutation.id);
  const missing = { ...data, shopping: [onion, berries, done] };
  expect(reduceChecked(missing, mutation.command).shopping).toEqual(missing.shopping);
  expect(
    reduceChecked({ ...data, shopping: [beef, onion, done] }, mutation.command).shopping,
  ).toEqual([beef, onion, done]);
});
it('supports keyboard positions inside each checked or unchecked group', () => {
  expect(keyboardTarget(data.shopping, berries, 'ArrowUp')).toBe(onion.id);
  expect(keyboardTarget(data.shopping, onion, 'ArrowDown')).toBe(null);
  expect(keyboardTarget(data.shopping, berries, 'Home')).toBe(beef.id);
  expect(keyboardTarget(data.shopping, beef, 'ArrowUp')).toBeUndefined();
  expect(keyboardTarget(data.shopping, done, 'ArrowUp')).toBeUndefined();
});
