import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { kitchen } from '../ingredient-matching/fixtures';
import { evidenceFingerprint, foodEvidence } from '../../../src/domain/standardization/evidence';
vi.mock('../../../src/auth/session', () => ({ getToken: async () => 'token' }));
let poll: () => void;
const visibility = { hidden: false };
const connectivity = { onLine: true };
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-08T04:31:00Z'));
  vi.stubEnv('VITE_API_URL', 'https://example.test');
  vi.stubGlobal(
    'window',
    Object.assign(new EventTarget(), {
      setInterval: (callback: () => void, ms: number) => {
        expect(ms).toBe(30_000);
        poll = callback;
        return 1;
      },
      clearInterval: vi.fn(),
    }),
  );
  visibility.hidden = false;
  connectivity.onLine = true;
  vi.stubGlobal('document', visibility);
  vi.stubGlobal('navigator', connectivity);
  vi.stubGlobal('BroadcastChannel', undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it('fetches and persists completed recognition within the next poll, then returns to the idle cadence', async () => {
  const store = await import('../../../src/data/store');
  const { startSync, syncKitchen } = await import('../../../src/data/sync');
  await store.loadKitchen(crypto.randomUUID());
  const data = kitchen('Brown Rice (microwaveable)');
  data.classificationJob = {
    state: 'queued',
    input: 'test',
    generation: 1,
    firstQueuedAt: Date.now(),
    dueAt: 0,
    attempts: 0,
  };
  const fetcher = vi.fn().mockImplementation(async () => Response.json({ revision: 1, data }));
  vi.stubGlobal('fetch', fetcher);
  const stop = startSync();
  try {
    await syncKitchen();
    expect(store.getKitchen().pending).toEqual([]);
    visibility.hidden = true;
    poll();
    expect(fetcher).toHaveBeenCalledTimes(1);
    visibility.hidden = false;
    connectivity.onLine = false;
    poll();
    await syncKitchen();
    expect(fetcher).toHaveBeenCalledTimes(1);
    connectivity.onLine = true;
    const recognized = {
      status: 'recognized' as const,
      identity: 'brown-rice',
      preparation: 'cooked' as const,
      reason: '',
      version: '1',
      source: 'ai-private' as const,
      fingerprint: evidenceFingerprint(foodEvidence(data.foods[0]!)),
    };
    fetcher.mockResolvedValue(
      Response.json({
        revision: 2,
        data: {
          ...data,
          classificationJob: undefined,
          foods: [{ ...data.foods[0], standardization: recognized }],
        },
      }),
    );
    vi.setSystemTime(Date.now() + 30_000);
    poll();
    await vi.waitFor(() =>
      expect(store.getKitchen().data.foods[0]?.standardization).toEqual(recognized),
    );
    expect(store.getKitchen().data.classificationJob).toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(2);
    vi.setSystemTime(Date.now() + 30_000);
    poll();
    expect(fetcher).toHaveBeenCalledTimes(2);
    vi.setSystemTime(Date.now() + 270_000);
    fetcher.mockImplementation(async () =>
      Response.json({ revision: 2, data: store.getKitchen().data }),
    );
    poll();
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
  } finally {
    stop();
  }
});
