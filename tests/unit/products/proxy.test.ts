import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { resolveProduct } from '../../../api/products/resolve';
import { lookupOpenFoodFacts } from '../../../api/products/openfoodfacts';
import { classifyRules } from '../../../api/products/rules';
import { boundedJson } from '../../../api/products/errors';
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
  mocks.cachedProduct.mockResolvedValue(null);
  mocks.classifyProduct.mockResolvedValue(null);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it('only requests barcode data from a fixed upstream, reuses cache, and skips AI for ordinary beans', async () => {
  const fetcher = vi.fn().mockResolvedValue(
    Response.json({
      product: { product_name: 'Heinz Black Beans', brands: 'Heinz', quantity: '15 oz' },
    }),
  );
  vi.stubGlobal('fetch', fetcher);
  const result = await resolveProduct('owner', JSON.stringify({ barcode: '3017620422003' }));
  expect(result.suggestion.name).toBe('Black Beans');
  expect(result.size?.amount).toBe(15);
  expect(mocks.classifyProduct).not.toHaveBeenCalled();
  expect(String(fetcher.mock.calls[0]?.[0])).toContain(
    'https://world.openfoodfacts.org/api/v3/product/',
  );
  expect(mocks.takeQuota).toHaveBeenCalledWith('scan#owner', 200);
  mocks.cachedProduct.mockResolvedValue(result);
  await resolveProduct('owner', JSON.stringify({ barcode: '3017620422003' }));
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('rejects client URLs, invalid codes and extra owner/model fields before upstream access', async () => {
  await expect(
    resolveProduct('owner', JSON.stringify({ barcode: '3017620422003', model: 'expensive' })),
  ).rejects.toThrow();
  await expect(
    resolveProduct('owner', JSON.stringify({ barcode: 'https://evil.test' })),
  ).rejects.toThrow();
  expect(mocks.takeLookupSlot).not.toHaveBeenCalled();
});
it('provides manual entry for missing products, and does not cache upstream failures as missing food', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
  expect((await lookupOpenFoodFacts('03017620422003')).result.found).toBe(false);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
  await expect(lookupOpenFoodFacts('03017620422003')).rejects.toThrow('unavailable');
});
it('preserves meaningful distinctions and rejects excessive upstream payloads', async () => {
  expect(classifyRules('Nutella', 'Nutella, Ferrero', '').suggestion.name).toBe('Nutella');
  expect(classifyRules('Heinz Dried Black Beans', 'Heinz', '').suggestion.name).toBe(
    'Dried Black Beans',
  );
  expect(
    classifyRules('Great Value Low Sodium Black Beans', 'Great Value', '').suggestion.name,
  ).toBe('Low Sodium Black Beans');
  await expect(boundedJson(Response.json({ content: 'x'.repeat(70000) }))).rejects.toThrow(
    'too much',
  );
});
