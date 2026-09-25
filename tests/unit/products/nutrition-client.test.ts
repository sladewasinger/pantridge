import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const token = vi.hoisted(() => vi.fn());
vi.mock('../../../src/auth/session', () => ({ getToken: token }));
const request = { kind: 'nutrition' as const, name: 'Ground beef', details: '' };
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('VITE_API_URL', 'https://example.test');
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('BroadcastChannel', undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it('blocks anonymous and offline requests before obtaining a token', async () => {
  const store = await import('../../../src/data/store');
  const { requestNutrition } = await import('../../../src/features/nutrition/estimate-client');
  await store.loadKitchen('local');
  await expect(requestNutrition(request, 'local', new AbortController().signal)).rejects.toThrow(
    'Google',
  );
  await store.loadKitchen('owner');
  vi.stubGlobal('navigator', { onLine: false });
  await expect(requestNutrition(request, 'owner', new AbortController().signal)).rejects.toThrow(
    'internet',
  );
  expect(token).not.toHaveBeenCalled();
});
it('does not start a canceled request or send a token after the active account changes', async () => {
  const store = await import('../../../src/data/store');
  const { requestNutrition } = await import('../../../src/features/nutrition/estimate-client');
  await store.loadKitchen('owner');
  const abort = new AbortController();
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  token.mockImplementation(async () => {
    abort.abort();
    return 'token';
  });
  await expect(requestNutrition(request, 'owner', abort.signal)).rejects.toThrow();
  token.mockImplementation(async () => {
    await store.loadKitchen('other');
    return 'token';
  });
  await expect(requestNutrition(request, 'owner', new AbortController().signal)).rejects.toThrow(
    'Google',
  );
  expect(fetcher).not.toHaveBeenCalled();
});
it('rejects responses after an account change and responses for a different food', async () => {
  const store = await import('../../../src/data/store');
  const { requestNutrition } = await import('../../../src/features/nutrition/estimate-client');
  await store.loadKitchen('owner');
  token.mockResolvedValue('token');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async () => {
      await store.loadKitchen('other');
      return Response.json({ estimate: null });
    }),
  );
  await expect(requestNutrition(request, 'owner', new AbortController().signal)).rejects.toThrow(
    'Google',
  );
  await store.loadKitchen('owner');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      Response.json({
        estimate: {
          name: 'Other',
          source: 'ai',
          details: '',
          estimatedAt: '2026-09-25T00:00:00Z',
          basis: 'g',
          assumptions: 'Test',
          per100: {
            calories: 100,
            fat: 1,
            saturatedFat: null,
            carbohydrates: 1,
            sugars: null,
            fiber: null,
            protein: 1,
            sodium: null,
          },
        },
      }),
    ),
  );
  await expect(requestNutrition(request, 'owner', new AbortController().signal)).rejects.toThrow(
    'does not match',
  );
});
