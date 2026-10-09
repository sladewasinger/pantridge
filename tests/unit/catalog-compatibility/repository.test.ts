import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import type * as DocumentSdk from '@aws-sdk/lib-dynamodb';
import { kitchen, lotId } from '../fixtures';
import { expandedKitchen } from './fixtures';
const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  reuseClassificationCache: vi.fn(),
  reserveWriteBudget: vi.fn(),
}));
vi.mock('@aws-sdk/lib-dynamodb', async (original) => ({
  ...(await original<typeof DocumentSdk>()),
  DynamoDBDocumentClient: { from: () => ({ send: mocks.send }) },
}));
vi.mock('../../../api/access/write-budget', () => mocks);
vi.mock('../../../api/standardization/sync-cache', () => mocks);
import { mutate } from '../../../api/repository';
const mutation = {
  id: crypto.randomUUID(),
  command: { type: 'stock.adjust' as const, stockId: lotId, delta: 1 },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('TABLE_NAME', 'test');
  vi.stubEnv('STANDARDIZATION_ENABLED', 'false');
  mocks.reuseClassificationCache.mockImplementation(async (_owner, _before, saved) => saved);
});
afterEach(() => vi.unstubAllEnvs());
it('rejects a new legacy mutation before touching quota, snapshot or receipt', async () => {
  const current = { revision: 9, data: expandedKitchen() };
  const original = structuredClone(current);
  mocks.send.mockResolvedValueOnce({}).mockResolvedValueOnce({ Item: current });
  await expect(mutate('owner', mutation, 1)).rejects.toMatchObject({ status: 426 });
  expect(mocks.send).toHaveBeenCalledTimes(2);
  expect(mocks.reserveWriteBudget).not.toHaveBeenCalled();
  expect(current).toEqual(original);
});
it('checks compatibility again after a concurrent revision changes the kitchen', async () => {
  mocks.send
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({ Item: { revision: 1, data: kitchen() } })
    .mockRejectedValueOnce(
      Object.assign(new Error('conflict'), { name: 'TransactionCanceledException' }),
    )
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({ Item: { revision: 2, data: expandedKitchen() } });
  await expect(mutate('owner', mutation, 1)).rejects.toMatchObject({ status: 426 });
  expect(
    mocks.send.mock.calls.filter(([command]) => command instanceof TransactWriteCommand),
  ).toHaveLength(1);
  expect(mocks.reuseClassificationCache).not.toHaveBeenCalled();
});
it('keeps legacy-only kitchens writable and current clients able to edit new classifications', async () => {
  for (const [data, revision] of [
    [kitchen(), 1],
    [expandedKitchen(), 2],
  ] as const) {
    mocks.send
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { revision: 3, data } })
      .mockResolvedValueOnce({});
    const saved = await mutate('owner', mutation, revision);
    expect(saved.revision).toBe(4);
    expect(saved.data.stock[0]!.quantity).toBe(data.stock[0]!.quantity + 1);
  }
});
it('acknowledges an already applied receipt without rewriting or requiring a new mutation ID', async () => {
  const current = { revision: 9, data: expandedKitchen() };
  mocks.send
    .mockResolvedValueOnce({ Item: { appliedAt: 'before upgrade' } })
    .mockResolvedValueOnce({ Item: current });
  expect(await mutate('owner', mutation, 1)).toEqual(current);
  expect(mocks.reserveWriteBudget).not.toHaveBeenCalled();
  expect(mocks.send).toHaveBeenCalledTimes(2);
});
it('accepts an old queued ordinary edit after app update while preserving the newer server manual classification', async () => {
  const current = { revision: 9, data: expandedKitchen() };
  const originalFood = current.data.foods[0]!;
  const pending = {
    id: crypto.randomUUID(),
    command: {
      type: 'food.save' as const,
      food: {
        ...originalFood,
        ingredient: undefined,
        standardization: undefined,
        location: 'pantry' as const,
      },
    },
  };
  const originalPending = structuredClone(pending);
  mocks.send
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({ Item: current })
    .mockResolvedValueOnce({});
  const saved = await mutate('owner', pending, 2);
  expect(saved.data.foods[0]).toMatchObject({
    location: 'pantry',
    ingredient: originalFood.ingredient,
    standardization: originalFood.standardization,
  });
  expect(saved.revision).toBe(10);
  expect(pending).toEqual(originalPending);
  const transaction = mocks.send.mock.calls.find(
    ([command]) => command instanceof TransactWriteCommand,
  )![0] as TransactWriteCommand;
  expect(transaction.input.TransactItems![1]!.Put!.Item!.sk).toBe(`mutation#${pending.id}`);
});
