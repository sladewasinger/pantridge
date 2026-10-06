import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const token = vi.hoisted(() => vi.fn());
vi.mock('../../../src/auth/session', () => ({ getToken: token }));
const request = {
  kind: 'recipe' as const,
  useUp: false,
  inventory: [{ name: 'Eggs', quantity: 6, unit: 'count' as const, useSoon: false }],
};
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
it('blocks anonymous, offline and pre-canceled requests without sending data', async () => {
  const store = await import('../../../src/data/store');
  const { requestRecipeSuggestions } =
    await import('../../../src/features/recipe-suggestions/client');
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  await store.loadKitchen('local');
  await expect(
    requestRecipeSuggestions(request, 'local', new AbortController().signal),
  ).rejects.toThrow('Google');
  await store.loadKitchen('owner');
  vi.stubGlobal('navigator', { onLine: false });
  await expect(
    requestRecipeSuggestions(request, 'owner', new AbortController().signal),
  ).rejects.toThrow('internet');
  vi.stubGlobal('navigator', { onLine: true });
  token.mockResolvedValue('token');
  const controller = new AbortController();
  controller.abort();
  await expect(requestRecipeSuggestions(request, 'owner', controller.signal)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
it('rejects account changes both during token refresh and after network response', async () => {
  const store = await import('../../../src/data/store');
  const { requestRecipeSuggestions } =
    await import('../../../src/features/recipe-suggestions/client');
  await store.loadKitchen('owner');
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  token.mockImplementation(async () => {
    await store.loadKitchen('other');
    return 'token';
  });
  await expect(
    requestRecipeSuggestions(request, 'owner', new AbortController().signal),
  ).rejects.toThrow('Google');
  expect(fetcher).not.toHaveBeenCalled();
  await store.loadKitchen('owner');
  token.mockResolvedValue('token');
  fetcher.mockImplementation(async () => {
    await store.loadKitchen('other');
    return Response.json({ recipes: [] });
  });
  await expect(
    requestRecipeSuggestions(request, 'owner', new AbortController().signal),
  ).rejects.toThrow('Google');
});
it('validates errors and payloads without writing recipes or inventory', async () => {
  const store = await import('../../../src/data/store');
  const { requestRecipeSuggestions } =
    await import('../../../src/features/recipe-suggestions/client');
  await store.loadKitchen('suggestion-test-owner');
  token.mockResolvedValue('token');
  const before = JSON.stringify(store.getKitchen());
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ recipes: [] }))
    .mockResolvedValueOnce(Response.json({ message: 'Daily AI limit reached.' }, { status: 429 }))
    .mockResolvedValueOnce(Response.json({ recipes: [{ title: 'Incomplete' }] }));
  vi.stubGlobal('fetch', fetcher);
  expect(
    await requestRecipeSuggestions(request, 'suggestion-test-owner', new AbortController().signal),
  ).toEqual([]);
  expect(JSON.parse(fetcher.mock.calls[0]![1].body as string)).toEqual(request);
  await expect(
    requestRecipeSuggestions(request, 'suggestion-test-owner', new AbortController().signal),
  ).rejects.toThrow('Daily AI limit');
  await expect(
    requestRecipeSuggestions(request, 'suggestion-test-owner', new AbortController().signal),
  ).rejects.toThrow();
  expect(JSON.stringify(store.getKitchen())).toBe(before);
});
it('discards a response canceled while the provider was working', async () => {
  const store = await import('../../../src/data/store');
  const { requestRecipeSuggestions } =
    await import('../../../src/features/recipe-suggestions/client');
  await store.loadKitchen('owner');
  token.mockResolvedValue('token');
  const controller = new AbortController();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => {
      controller.abort();
      return Response.json({ recipes: [] });
    }),
  );
  await expect(requestRecipeSuggestions(request, 'owner', controller.signal)).rejects.toThrow();
});
