import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { changeKitchen, readKitchen } from '../../src/data/database';
import { reduceChecked } from '../../src/domain/reducer';
import { kitchen, lotId } from './fixtures';
describe('durable local transactions', () => {
  it('serializes concurrent tab updates without losing a quantity change', async () => {
    const key = crypto.randomUUID();
    await changeKitchen(key, (current) => ({ ...current, data: kitchen() }));
    const increment = () =>
      changeKitchen(key, (current) => ({
        ...current,
        data: reduceChecked(current.data, { type: 'stock.adjust', stockId: lotId, delta: 1 }),
      }));
    await Promise.all([increment(), increment(), increment()]);
    expect((await readKitchen(key)).data.stock[0]?.quantity).toBe(5);
  });
  it('leaves both data and outbox intact when an update throws', async () => {
    const key = crypto.randomUUID();
    await changeKitchen(key, (current) => ({ ...current, data: kitchen() }));
    await expect(
      changeKitchen(key, () => {
        throw new Error('Simulated interrupted edit');
      }),
    ).rejects.toThrow('interrupted');
    expect((await readKitchen(key)).data).toEqual(kitchen());
    expect((await readKitchen(key)).pending).toEqual([]);
  });
  it('keeps different accounts separate', async () => {
    const key = crypto.randomUUID();
    await changeKitchen(key, (current) => ({ ...current, data: kitchen() }));
    expect((await readKitchen(crypto.randomUUID())).data.foods).toEqual([]);
  });
});
