import { beforeEach, expect, it, vi } from 'vitest';
import { kitchen } from '../ingredient-matching/fixtures';
import type { Snapshot } from '../../../src/domain/model';
import { scheduleClassification } from '../../../api/standardization/schedule';
import { AccessError } from '../../../api/access/config';
import { classificationTargets } from '../../../src/domain/standardization/targets';
const mocks = vi.hoisted(() => ({
  activeWorkerAccount: vi.fn(),
  changeStored: vi.fn(),
  resolveStandardization: vi.fn(),
  send: vi.fn(),
}));
vi.mock('../../../api/access/worker-access', () => mocks);
vi.mock('../../../api/kitchen-storage', () => ({
  ...mocks,
  kitchenDb: { send: mocks.send },
  kitchenTable: () => 'test',
}));
vi.mock('../../../api/standardization/resolve', () => mocks);
import { processKitchen, handler } from '../../../api/standardization/worker';
let data: Snapshot;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('STANDARDIZATION_ENABLED', 'true');
  data = kitchen('Unknown rice');
  data = scheduleClassification(data, data, Date.now() - 700000);
  mocks.activeWorkerAccount.mockResolvedValue('Google_test');
  mocks.changeStored.mockImplementation(
    async (_owner: string, change: (value: Snapshot) => Snapshot) => {
      data = change(data);
      return { data, revision: 1 };
    },
  );
  mocks.resolveStandardization.mockImplementation(
    async (_owner: string, request: { items: { key: string }[] }) => ({
      items: request.items.map((item) => ({
        key: item.key,
        source: 'ai-private',
        result: { status: 'recognized', identity: 'rice', preparation: 'dry', reason: '' },
      })),
    }),
  );
});
it('processes a persisted due kitchen without any browser and commits with account conditions', async () => {
  expect(await processKitchen('owner')).toBe(true);
  expect(data.foods[0]!.standardization?.identity).toBe('rice');
  expect(data.classificationJob).toBeUndefined();
  expect(mocks.activeWorkerAccount).toHaveBeenCalledTimes(2);
  expect(mocks.changeStored.mock.calls[0]![2]).toBe('Google_test');
  expect(mocks.changeStored.mock.calls[1]![2]).toBe('Google_test');
});
it('makes no provider call for a suspended account', async () => {
  mocks.activeWorkerAccount.mockRejectedValue(new AccessError(403, 'suspended'));
  await expect(processKitchen('owner')).rejects.toMatchObject({ status: 403 });
  expect(mocks.resolveStandardization).not.toHaveBeenCalled();
});
it('persists the first 25 results and retains the remaining item for the next worker tick', async () => {
  const base = data.foods[0]!;
  data.foods = Array.from({ length: 26 }, (_, index) => ({
    ...base,
    id: `food-${index}`,
    name: `Unfamiliar grocery ${index}`,
  }));
  data.stock = [];
  data = scheduleClassification(data, data, Date.now() - 700000);
  await processKitchen('owner');
  expect(mocks.resolveStandardization.mock.calls[0]![1].items).toHaveLength(25);
  expect(data.foods.filter((food) => food.standardization)).toHaveLength(25);
  expect(classificationTargets(data).map((target) => target.key)).toEqual(['food:food-25']);
  expect(data.classificationJob?.state).toBe('queued');
  data.classificationJob!.dueAt = Date.now() - 1;
  await processKitchen('owner');
  expect(mocks.resolveStandardization.mock.calls[1]![1].items).toHaveLength(1);
  expect(classificationTargets(data)).toHaveLength(0);
  expect(data.classificationJob).toBeUndefined();
});
it('rejects results after suspension during the provider call', async () => {
  mocks.activeWorkerAccount
    .mockResolvedValueOnce('Google_test')
    .mockRejectedValueOnce(new AccessError(403, 'suspended'));
  await processKitchen('owner');
  expect(data.foods[0]!.standardization).toBeUndefined();
  expect(data.classificationJob?.state).toBe('paused');
});
it('skips stale index entries and continues to the next due kitchen', async () => {
  mocks.send.mockResolvedValue({ Items: [{ pk: 'user#stale' }, { pk: 'user#current' }] });
  const current = mocks.changeStored.getMockImplementation()!;
  mocks.changeStored.mockImplementation(
    async (owner: string, change: (value: Snapshot) => Snapshot, identity?: string) =>
      owner === 'stale' ? { data: kitchen('Rice'), revision: 1 } : current(owner, change, identity),
  );
  await handler();
  expect(mocks.resolveStandardization).toHaveBeenCalledWith('current', expect.anything());
});
