import 'fake-indexeddb/auto';
import { afterEach, expect, it, vi } from 'vitest';
import { emptySnapshot } from '../../../src/domain/model';
import { purchase } from '../fixtures';
const { getToken } = vi.hoisted(() => ({ getToken: vi.fn().mockResolvedValue('token') }));
vi.mock('../../../src/auth/session', () => ({ getToken }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});
it('retains the exact persistent outbox and local data when a mutation requires an app update', async () => {
  vi.stubEnv('VITE_API_URL', 'https://api.test');
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('BroadcastChannel', undefined);
  const store = await import('../../../src/data/store');
  const owner = crypto.randomUUID();
  await store.loadKitchen(owner);
  await store.dispatch({ type: 'shopping.save', item: { ...purchase, foodId: undefined } });
  const before = structuredClone(store.getKitchen());
  expect(before.pending.every((item) => item.catalogRevision === 2)).toBe(true);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url, request: RequestInit) =>
      request.body
        ? Response.json(
            {
              message:
                'Update the app to sync this kitchen. Your changes are saved on this device.',
            },
            { status: 426 },
          )
        : Response.json({ revision: 0, data: emptySnapshot() }),
    ),
  );
  const { syncKitchen, syncStatus } = await import('../../../src/data/sync');
  await syncKitchen();
  expect(syncStatus()).toMatchObject({
    status: 'error',
    detail: expect.stringContaining('Update the app'),
  });
  expect(store.getKitchen()).toMatchObject({
    data: before.data,
    pending: before.pending,
    revision: before.revision,
  });
  const { readKitchen } = await import('../../../src/data/database');
  expect(await readKitchen(owner)).toMatchObject({
    data: before.data,
    pending: before.pending,
    revision: before.revision,
  });
});
it('advertises the catalog revision for reads and writes without changing mutation IDs or headers', async () => {
  vi.stubEnv('VITE_API_URL', 'https://api.test');
  const fetcher = vi
    .fn()
    .mockImplementation(async () => Response.json({ revision: 0, data: emptySnapshot() }));
  vi.stubGlobal('fetch', fetcher);
  const { cloudRequest } = await import('../../../src/data/sync-request');
  const body = JSON.stringify({
    id: crypto.randomUUID(),
    command: { type: 'classification.retry' },
  });
  await cloudRequest('owner', '/v1/kitchen', 'token');
  await cloudRequest('owner', '/v1/mutations', 'token', body);
  expect(fetcher.mock.calls[0]![0]).toBe('https://api.test/v1/kitchen?catalogRevision=2');
  expect(fetcher.mock.calls[1]).toEqual([
    'https://api.test/v1/mutations?catalogRevision=2',
    expect.objectContaining({
      body,
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
    }),
  ]);
});
