import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { egg } from '../fixtures';
const token = vi.hoisted(() => vi.fn());
vi.mock('../../../src/auth/session', () => ({ getToken: token }));
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_API_URL', 'https://example.test');
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('navigator', { onLine: false });
  vi.stubGlobal('BroadcastChannel', undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it('requires sign-in even for cached codes and remembers confirmed stock offline across reloads', async () => {
  const store = await import('../../../src/data/store');
  const { resolveBarcode } = await import('../../../src/features/scanning/client');
  await store.loadKitchen('local');
  await expect(resolveBarcode('3017620422003', 'local')).rejects.toThrow('Google');
  const account = crypto.randomUUID();
  await store.loadKitchen(account);
  await store.dispatch({
    type: 'stock.scan',
    food: egg,
    stock: {
      id: crypto.randomUUID(),
      foodId: egg.id,
      quantity: 1,
      product: { barcode: '03017620422003', brand: 'Test', name: 'Test Eggs' },
    },
  });
  expect(store.getKitchen().pending).toHaveLength(1);
  await store.loadKitchen(account);
  expect((await resolveBarcode('3017620422003', account)).suggestion.name).toBe('Eggs');
  await expect(resolveBarcode('012345678905', account)).rejects.toThrow('internet');
});
it('stops a lookup if the active account changes while refreshing its token', async () => {
  vi.stubGlobal('navigator', { onLine: true });
  const store = await import('../../../src/data/store');
  const { resolveBarcode } = await import('../../../src/features/scanning/client');
  const account = crypto.randomUUID();
  await store.loadKitchen(account);
  token.mockImplementation(async () => {
    await store.loadKitchen('other');
    return 'token';
  });
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  await expect(resolveBarcode('3017620422003', account)).rejects.toThrow('Google');
  expect(fetcher).not.toHaveBeenCalled();
});
