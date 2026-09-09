import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
vi.mock('../../../src/auth/session', () => ({ getToken: async () => 'token' }));
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_API_URL', 'https://example.test');
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('BroadcastChannel', undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it('honors Retry-After without retry loops or losing the pending shopping cart', async () => {
  const store = await import('../../../src/data/store');
  const { syncKitchen } = await import('../../../src/data/sync');
  await store.loadKitchen(crypto.randomUUID());
  await store.dispatch({
    type: 'shopping.save',
    item: {
      id: crypto.randomUUID(),
      name: 'Cart item',
      unit: 'items',
      quantity: 1,
      purchased: false,
    },
  });
  const pending = store.getKitchen().pending;
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json(
        { message: 'Wait a minute' },
        { status: 429, headers: { 'Retry-After': '60' } },
      ),
    );
  vi.stubGlobal('fetch', fetcher);
  await syncKitchen();
  await syncKitchen();
  await syncKitchen();
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(store.getKitchen().pending).toEqual(pending);
  expect(store.getKitchen().data.shopping).toHaveLength(1);
});
