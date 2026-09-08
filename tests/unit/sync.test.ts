import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptySnapshot, type Snapshot } from '../../src/domain/model';
import { mutationSchema } from '../../src/domain/commands';
import { reduceChecked } from '../../src/domain/reducer';
import { egg, lotId } from './fixtures';
vi.mock('../../src/auth/session', () => ({ getToken: async () => 'test-access-token' }));
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
describe('sync after interrupted requests', () => {
  it('retries a lost response without duplicating stock and retains local data until acknowledged', async () => {
    const store = await import('../../src/data/store');
    const { syncKitchen, syncStatus } = await import('../../src/data/sync');
    await store.loadKitchen(crypto.randomUUID());
    await store.dispatchMany([
      { type: 'food.save', food: egg },
      { type: 'stock.add', stock: { id: lotId, foodId: egg.id, quantity: 2 } },
    ]);
    let remote: Snapshot = emptySnapshot();
    let revision = 0;
    let loseResponse = true;
    const receipts = new Set<string>();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, request: RequestInit) => {
        if (request.body) {
          const mutation = mutationSchema.parse(JSON.parse(String(request.body)));
          if (!receipts.has(mutation.id)) {
            remote = reduceChecked(remote, mutation.command);
            revision++;
            receipts.add(mutation.id);
          }
          if (loseResponse && mutation.command.type === 'stock.add') {
            loseResponse = false;
            throw new Error('Connection lost after server commit');
          }
        }
        return Response.json({ revision, data: remote });
      }),
    );
    await syncKitchen();
    expect(syncStatus().status).toBe('error');
    expect(store.getKitchen().data.stock[0]?.quantity).toBe(2);
    expect(store.getKitchen().pending).toHaveLength(2);
    await syncKitchen();
    expect(store.getKitchen().pending).toEqual([]);
    expect(store.getKitchen().data.stock[0]?.quantity).toBe(2);
    expect(revision).toBe(2);
  });
  it('preserves edits made while a snapshot request is in flight', async () => {
    const store = await import('../../src/data/store');
    const { syncKitchen } = await import('../../src/data/sync');
    await store.loadKitchen(crypto.randomUUID());
    let resolveGet: ((response: Response) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, request: RequestInit) => {
        if (!request.body)
          return new Promise<Response>((resolve) => {
            resolveGet = resolve;
          });
        const mutation = mutationSchema.parse(JSON.parse(String(request.body)));
        return Promise.resolve(
          Response.json({ revision: 1, data: reduceChecked(emptySnapshot(), mutation.command) }),
        );
      }),
    );
    const syncing = syncKitchen();
    await vi.waitFor(() => expect(resolveGet).toBeTypeOf('function'));
    await store.dispatch({ type: 'food.save', food: egg });
    resolveGet?.(Response.json({ revision: 0, data: emptySnapshot() }));
    await syncing;
    expect(store.getKitchen().data.foods).toEqual([egg]);
  });
  it('commits a local batch atomically when its final command is invalid', async () => {
    const store = await import('../../src/data/store');
    await store.loadKitchen(crypto.randomUUID());
    await expect(
      store.dispatchMany([
        { type: 'food.save', food: egg },
        { type: 'stock.add', stock: { id: lotId, foodId: crypto.randomUUID(), quantity: 1 } },
      ]),
    ).rejects.toThrow('no longer exists');
    expect(store.getKitchen().data.foods).toEqual([]);
    expect(store.getKitchen().pending).toEqual([]);
  });
});
