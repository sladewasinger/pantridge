import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { kitchen } from '../ingredient-matching/fixtures';
import type { Snapshot } from '../../../src/domain/model';
import { classificationTargets } from '../../../src/domain/standardization/targets';
import type { SavedStandardization } from '../../../src/domain/standardization/model';
import { scheduleClassification } from '../../../api/standardization/schedule';
const mocks = vi.hoisted(() => ({
  cachedProduct: vi.fn(),
  cachedResult: vi.fn(),
  activeWorkerAccount: vi.fn(),
  changeStored: vi.fn(),
}));
vi.mock('../../../api/products/cache', () => mocks);
vi.mock('../../../api/standardization/catalog', () => ({ catalogEvidence: vi.fn() }));
vi.mock('../../../api/access/worker-access', () => mocks);
vi.mock('../../../api/kitchen-storage', () => mocks);
import {
  applyCachedClassifications,
  reuseClassificationCache,
} from '../../../api/standardization/sync-cache';
let previous: Snapshot;
let data: Snapshot;
const recognized = { status: 'recognized', identity: 'rice', preparation: 'dry', reason: '' };
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('STANDARDIZATION_ENABLED', 'true');
  vi.stubEnv('API_ENABLED', 'true');
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  previous = kitchen('Unknown grocery');
  data = structuredClone(previous);
  data.foods[0]!.name = 'Different unfamiliar grocery';
  data = scheduleClassification(previous, data, Date.now());
  mocks.cachedProduct.mockResolvedValue(null);
  mocks.cachedResult.mockResolvedValue(recognized);
  mocks.activeWorkerAccount.mockResolvedValue('Google_private-owner');
  mocks.changeStored.mockImplementation(async (_owner, change: (value: Snapshot) => Snapshot) => ({
    revision: 3,
    data: change(data),
  }));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
it('reuses cached annotations immediately with a single guarded write and clears an empty queue', async () => {
  const result = await reuseClassificationCache('private-owner', previous, { revision: 2, data });
  expect(result.revision).toBe(3);
  expect(result.data.foods[0]!.standardization).toMatchObject(recognized);
  expect(result.data.classificationJob).toBeUndefined();
  expect(mocks.changeStored).toHaveBeenCalledWith(
    'private-owner',
    expect.any(Function),
    'Google_private-owner',
    { attempts: 1, signal: expect.any(AbortSignal) },
  );
  expect(mocks.cachedResult).toHaveBeenCalledTimes(1);
});
it('misses preserve the saved envelope and do not access accounts or write', async () => {
  mocks.cachedResult.mockResolvedValue(null);
  const saved = { revision: 2, data };
  expect(await reuseClassificationCache('owner', previous, saved)).toBe(saved);
  expect(mocks.activeWorkerAccount).not.toHaveBeenCalled();
  expect(mocks.changeStored).not.toHaveBeenCalled();
  expect(saved.data.classificationJob?.dueAt).toBeGreaterThan(Date.now() + 590000);
});
it('does not repeat cache reads for quantity edits or unchanged unresolved evidence', async () => {
  const unchanged = structuredClone(previous);
  unchanged.stock[0]!.quantity++;
  await reuseClassificationCache('owner', previous, { revision: 2, data: unchanged });
  expect(mocks.cachedResult).not.toHaveBeenCalled();
});
it('cache failures, suspension and conflicting enrichment writes cannot fail committed edits', async () => {
  const saved = { revision: 2, data };
  mocks.cachedResult.mockRejectedValueOnce(new Error('private error text'));
  expect(await reuseClassificationCache('owner', previous, saved)).toBe(saved);
  mocks.activeWorkerAccount.mockRejectedValueOnce(new Error('suspended private owner'));
  expect(await reuseClassificationCache('owner', previous, saved)).toBe(saved);
  mocks.changeStored.mockRejectedValueOnce(new Error('concurrent write'));
  expect(await reuseClassificationCache('owner', previous, saved)).toBe(saved);
});
it('returns the committed edit within the deadline even if a cache read stalls', async () => {
  const saved = { revision: 2, data };
  let finish: ((value: unknown) => void) | undefined;
  mocks.cachedResult.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const started = Date.now();
  expect(await reuseClassificationCache('owner', previous, saved)).toBe(saved);
  expect(Date.now() - started).toBeLessThan(1500);
  finish?.(recognized);
  await Promise.resolve();
  expect(mocks.changeStored).not.toHaveBeenCalled();
});
it('limits a large import to 25 new fingerprints', async () => {
  data.foods = Array.from({ length: 26 }, (_, index) => ({
    ...data.foods[0]!,
    id: `food-${index}`,
    name: `Unknown imported grocery ${index}`,
  }));
  data.stock = [];
  await reuseClassificationCache('owner', previous, { revision: 2, data });
  expect(mocks.cachedResult).toHaveBeenCalledTimes(25);
});
it('rejects a public cache hit when server product metadata changes during lookup', async () => {
  previous = kitchen('Rice');
  data = structuredClone(previous);
  data.stock[0]!.product = {
    barcode: '012345678905',
    name: 'Store specialty rice',
    brand: 'Store',
  };
  data = scheduleClassification(previous, data, Date.now());
  const product = { name: 'Store specialty rice', brand: 'Store' };
  mocks.cachedProduct
    .mockResolvedValueOnce({ found: true, source: 'openfoodfacts', product })
    .mockResolvedValueOnce({
      found: true,
      source: 'openfoodfacts',
      product: { ...product, name: 'Different product' },
    });
  const saved = { revision: 2, data };
  expect(await reuseClassificationCache('owner', previous, saved)).toBe(saved);
  expect(mocks.cachedProduct).toHaveBeenCalledTimes(2);
  expect(mocks.changeStored).not.toHaveBeenCalled();
});
it('preserves newer names, manual choices, measurements and other queued debounce dates', () => {
  const target = classificationTargets(data)[0]!;
  const result: SavedStandardization = {
    ...recognized,
    status: 'recognized',
    identity: 'rice',
    preparation: 'dry',
    fingerprint: target.fingerprint,
    version: '1',
    source: 'ai-private',
  };
  const results = new Map([[target.key, result]]);
  const renamed = structuredClone(data);
  renamed.foods[0]!.name = 'Another grocery';
  expect(applyCachedClassifications(renamed, results)).toBe(renamed);
  const manual = structuredClone(data);
  manual.foods[0]!.ingredient = { id: 'brown-rice', preparation: 'cooked', basis: 'as-sold' };
  expect(applyCachedClassifications(manual, results)).toBe(manual);
  const mixed = structuredClone(data);
  mixed.foods.push({ ...mixed.foods[0]!, id: 'miss', name: 'An uncached grocery' });
  mixed.foods[0]!.size = { amount: 12, measure: 'g', packs: 1 };
  const cached = applyCachedClassifications(mixed, results);
  expect(cached.foods[0]!.size).toEqual(mixed.foods[0]!.size);
  expect(cached.classificationJob?.dueAt).toBe(mixed.classificationJob?.dueAt);
  expect(classificationTargets(cached).map((item) => item.key)).toEqual(['food:miss']);
});
