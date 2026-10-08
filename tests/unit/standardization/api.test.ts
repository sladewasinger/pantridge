import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  cachedProduct: vi.fn(),
  cachedResult: vi.fn(),
  cacheResult: vi.fn(),
  cacheCatalogEvidence: vi.fn(),
  claimCache: vi.fn(),
  takeQuota: vi.fn(),
  findCatalog: vi.fn(),
  classifyBatch: vi.fn(),
}));
vi.mock('../../../api/products/cache', () => mocks);
vi.mock('../../../api/standardization/classify', () => mocks);
import { resolveStandardization } from '../../../api/standardization/resolve';
const recognized = {
  status: 'recognized',
  identity: 'brown-rice',
  preparation: 'cooked',
  reason: '',
};
const item = {
  key: 'one',
  evidence: { name: 'Ready Brown Rice', brand: 'Brand', details: '', context: 'product' },
  barcode: '012345678905',
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  mocks.cachedProduct.mockResolvedValue(null);
  mocks.cachedResult.mockResolvedValue(null);
  mocks.claimCache.mockResolvedValue(true);
  mocks.cacheResult.mockResolvedValue(undefined);
  mocks.takeQuota.mockResolvedValue(undefined);
  mocks.classifyBatch.mockResolvedValue([recognized]);
});
it('keys cached recognition by its effective effort independently of interactive calls', async () => {
  const request = { kind: 'standardization', items: [item] };
  vi.stubEnv('CLASSIFIER_REASONING_EFFORT', 'low');
  vi.stubEnv('STANDARDIZATION_REASONING_EFFORT', 'low');
  await resolveStandardization('owner', request);
  const low = mocks.cachedResult.mock.calls.at(-1)![0];
  vi.stubEnv('STANDARDIZATION_REASONING_EFFORT', 'medium');
  await resolveStandardization('owner', request);
  const medium = mocks.cachedResult.mock.calls.at(-1)![0];
  expect(medium).not.toBe(low);
  vi.stubEnv('CLASSIFIER_REASONING_EFFORT', 'high');
  await resolveStandardization('owner', request);
  expect(mocks.cachedResult.mock.calls.at(-1)![0]).toBe(medium);
});
it('lookup misses never call AI and cached results avoid provider calls', async () => {
  const request = { kind: 'standardization', items: [item] };
  expect((await resolveStandardization('owner', request)).items[0]!.result).toBeNull();
  expect(mocks.classifyBatch).not.toHaveBeenCalled();
  mocks.cachedResult.mockResolvedValue(recognized);
  expect(
    (await resolveStandardization('owner', { ...request, mode: 'resolve' })).items[0]!.reused,
  ).toBe(true);
  expect(mocks.classifyBatch).not.toHaveBeenCalled();
});
it('keeps arbitrary names and recipe text in owner-specific caches', async () => {
  const request = { kind: 'standardization', mode: 'resolve', items: [item] };
  await resolveStandardization('owner-a', request);
  const first = mocks.cacheResult.mock.calls[0]![0];
  await resolveStandardization('owner-b', request);
  const second = mocks.cacheResult.mock.calls[1]![0];
  expect(first).not.toBe(second);
  expect(mocks.takeQuota).not.toHaveBeenCalled();
  expect(mocks.cacheResult).toHaveBeenCalledTimes(2);
});
it('shares only server-obtained public evidence and ignores forged source metadata', async () => {
  mocks.cachedProduct.mockResolvedValue({
    found: true,
    source: 'openfoodfacts',
    product: { name: item.evidence.name, brand: 'Brand' },
    categoryHints: 'microwave ready rice',
  });
  const request = {
    kind: 'standardization',
    mode: 'resolve',
    items: [{ ...item, evidence: { ...item.evidence, sourceId: 'private information' } }],
  };
  const response = await resolveStandardization('owner', request);
  expect(response.items[0]!.source).toBe('ai-catalog');
  expect(mocks.classifyBatch.mock.calls[0]![1][0]).toEqual({
    ...item.evidence,
    sourceId: '00012345678905',
    details: 'microwave ready rice',
  });
  expect(mocks.takeQuota).toHaveBeenCalledWith('catalog-user#owner', 100);
  expect(mocks.takeQuota).toHaveBeenCalledWith('catalog-global', 1000);
  expect(mocks.cacheResult.mock.calls[1]![3]).toHaveProperty('classificationName');
  await resolveStandardization('owner', {
    ...request,
    items: [{ ...item, evidence: { ...item.evidence, details: 'Private kitchen note' } }],
  });
  expect(mocks.cacheResult).toHaveBeenCalledTimes(3);
});
it('reuses public results after the shorter raw metadata cache expires', async () => {
  const evidence = { ...item.evidence, sourceId: '00012345678905', details: 'cooked rice' };
  mocks.cachedResult.mockImplementation(async (key: string) =>
    key.startsWith('catalog-evidence#') ? { source: 'openfoodfacts', evidence } : recognized,
  );
  const response = await resolveStandardization('another-owner', {
    kind: 'standardization',
    mode: 'resolve',
    items: [item],
  });
  expect(response.items[0]).toMatchObject({
    reused: true,
    source: 'ai-catalog',
    result: recognized,
  });
  expect(mocks.classifyBatch).not.toHaveBeenCalled();
});
it('deduplicates repeated semantic inputs within a batch', async () => {
  await resolveStandardization('owner', {
    kind: 'standardization',
    mode: 'resolve',
    items: [item, { ...item, key: 'two' }],
  });
  expect(mocks.classifyBatch.mock.calls[0]![1]).toHaveLength(1);
  expect(mocks.cacheResult).toHaveBeenCalledTimes(1);
});
it('bounds batches and refuses concurrent cache fills without extra AI spending', async () => {
  const request = { kind: 'standardization', mode: 'resolve', items: [item] };
  await expect(
    resolveStandardization('owner', { ...request, items: Array(26).fill(item) }),
  ).rejects.toThrow();
  mocks.claimCache.mockResolvedValue(false);
  await expect(resolveStandardization('owner', request)).rejects.toMatchObject({ status: 409 });
  expect(mocks.classifyBatch).not.toHaveBeenCalled();
});
