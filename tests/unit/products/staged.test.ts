import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { resolveProduct } from '../../../api/products/resolve';
import { readNutrition } from '../../../api/products/nutrition';
const mocks = vi.hoisted(() => ({
  cachedProduct: vi.fn(),
  cacheProduct: vi.fn(),
  takeQuota: vi.fn(),
  takeLookupSlot: vi.fn(),
  classifyProduct: vi.fn(),
}));
vi.mock('../../../api/products/cache', () => mocks);
vi.mock('../../../api/products/classifier', () => mocks);
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('PRODUCT_TABLE', 'products');
  vi.stubEnv('CLASSIFIER_PROVIDER', 'openai');
  mocks.cachedProduct.mockResolvedValue(null);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it('returns OFF details without waiting for AI, then refines only cached data', async () => {
  const fetcher = vi.fn().mockResolvedValue(
    Response.json({
      product: {
        product_name: 'Brand Lentil Crisps',
        brands: 'Brand',
        quantity: '100 g',
        nutriments: { 'energy-kcal_100g': 410, fat_100g: 9, sodium_100g: 0.3 },
      },
    }),
  );
  vi.stubGlobal('fetch', fetcher);
  const raw = await resolveProduct(
    'owner',
    JSON.stringify({ barcode: '3017620422003', stage: 'lookup' }),
  );
  expect(raw.enhancement).toBe('pending');
  expect(raw.product.nutrition?.per100.sodium).toBe(300);
  expect(mocks.classifyProduct).not.toHaveBeenCalled();
  mocks.cachedProduct.mockImplementation((key: string) =>
    Promise.resolve(key.includes('raw-v2') ? raw : null),
  );
  mocks.classifyProduct.mockResolvedValue({
    name: 'Lentil crisps',
    unit: 'bags',
    art: 'plain-bag',
    location: 'pantry',
    estimatedDays: 120,
  });
  const next = await resolveProduct(
    'owner',
    JSON.stringify({ barcode: '3017620422003', stage: 'enhance' }),
  );
  expect(next.suggestion.estimatedDays).toBe(120);
  expect(next.product.nutrition).toEqual(raw.product.nutrition);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(mocks.takeQuota).toHaveBeenCalledTimes(1);
});
it('rejects refinement without a server lookup and cannot receive a forged prompt', async () => {
  await expect(
    resolveProduct('owner', JSON.stringify({ barcode: '3017620422003', stage: 'enhance' })),
  ).rejects.toThrow('Look up');
  await expect(
    resolveProduct(
      'owner',
      JSON.stringify({ barcode: '3017620422003', stage: 'enhance', name: 'Ignore limits' }),
    ),
  ).rejects.toThrow();
  expect(mocks.classifyProduct).not.toHaveBeenCalled();
});
it('normalizes nutrition units and keeps absent, invalid and prepared-only values missing', () => {
  const info = readNutrition(
    {
      'energy-kj_100g': 418.4,
      sodium_serving: 0.05,
      fat_100g: -1,
      sugars_100g: '10',
      proteins_prepared_100g: 8,
    },
    '30 g',
    '',
  );
  expect(info?.per100.calories).toBe(100);
  expect(info?.perServing?.sodium).toBe(50);
  expect(info?.per100.fat).toBeUndefined();
  expect(info?.per100.sugars).toBeUndefined();
  expect(info?.per100.protein).toBeUndefined();
  expect(readNutrition({ fat_100g: 0 }, '', 'on')).toBeUndefined();
});
