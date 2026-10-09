import 'fake-indexeddb/auto';
import { User } from 'oidc-client-ts';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { emptySnapshot } from '../../../src/domain/model';
import { mutationSchema } from '../../../src/domain/commands';
import { reduceChecked } from '../../../src/domain/reducer';
import { egg, lotId, purchase } from '../fixtures';

const { getToken } = vi.hoisted(() => ({ getToken: vi.fn() }));
vi.mock('../../../src/auth/session', () => ({ getToken }));
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.stubEnv('VITE_API_URL', 'https://api.test');
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('BroadcastChannel', undefined);
  getToken.mockResolvedValue('access-token');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function editedKitchen() {
  const store = await import('../../../src/data/store');
  const account = crypto.randomUUID();
  await store.loadKitchen(account);
  await store.dispatchMany([
    { type: 'food.save', food: egg },
    { type: 'stock.add', stock: { id: lotId, foodId: egg.id, quantity: 2 } },
    { type: 'shopping.save', item: purchase },
  ]);
  return { store, account, before: structuredClone(store.getKitchen()) };
}
function credential(subject: string, token: string, expired: boolean) {
  return new User({
    profile: { sub: subject, iss: 'https://issuer.test', aud: 'client', iat: 1, exp: 9999999999 },
    access_token: token,
    refresh_token: `${token}-refresh`,
    token_type: 'Bearer',
    expires_at: Math.floor(Date.now() / 1000) + (expired ? -60 : 3600),
  });
}
function remoteKitchen() {
  let data = emptySnapshot();
  let revision = 0;
  const sent: string[] = [];
  const fetch = vi.fn(async (_url: string, request: RequestInit) => {
    if (request.body) {
      const mutation = mutationSchema.parse(JSON.parse(String(request.body)));
      sent.push(mutation.id);
      data = reduceChecked(data, mutation.command);
      revision++;
    }
    return Response.json({ revision, data });
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, sent };
}

it('preserves all pending edits after invalid_grant and retries the same IDs after same-account sign-in', async () => {
  const { store, account, before } = await editedKitchen();
  const { createTokenAccess } = await import('../../../src/auth/token-access');
  let stored = credential(account, 'old-access', true);
  const signinSilent = vi.fn().mockRejectedValue({ error: 'invalid_grant' });
  getToken.mockImplementation(createTokenAccess({ getUser: async () => stored, signinSilent }));
  const { syncKitchen, syncStatus } = await import('../../../src/data/sync');
  const remote = remoteKitchen();
  await syncKitchen();
  await syncKitchen();
  expect(syncStatus().status).toBe('signin');
  expect(signinSilent).toHaveBeenCalledTimes(1);
  expect(remote.fetch).not.toHaveBeenCalled();
  expect(store.getKitchen()).toEqual(before);
  const { readKitchen } = await import('../../../src/data/database');
  expect(await readKitchen(account)).toEqual(before);
  stored = credential(account, 'new-access', false);
  await syncKitchen();
  expect(remote.sent).toEqual(before.pending.map((mutation) => mutation.id));
  expect(store.getKitchen().data).toEqual(before.data);
  expect(store.getKitchen().pending).toEqual([]);
  expect(syncStatus().status).toBe('synced');
});

it('keeps one account outbox separate when a different subject signs in', async () => {
  const { store, account, before } = await editedKitchen();
  const { createTokenAccess } = await import('../../../src/auth/token-access');
  const other = crypto.randomUUID();
  const stored = credential(other, 'other-access', false);
  getToken.mockImplementation(
    createTokenAccess({ getUser: async () => stored, signinSilent: vi.fn() }),
  );
  const { syncKitchen } = await import('../../../src/data/sync');
  const remote = remoteKitchen();
  await syncKitchen();
  expect(remote.fetch).not.toHaveBeenCalled();
  expect(store.getKitchen()).toEqual(before);
  await store.loadKitchen(other);
  await syncKitchen();
  expect(store.getKitchen().pending).toEqual([]);
  expect(store.getKitchen().data.foods).toEqual([]);
  const { readKitchen } = await import('../../../src/data/database');
  expect(await readKitchen(account)).toEqual(before);
  expect(remote.sent).toEqual([]);
});

it('retains edits after a temporary renewal network error and retries without a sign-in latch', async () => {
  const { store, account, before } = await editedKitchen();
  const { createTokenAccess } = await import('../../../src/auth/token-access');
  let stored = credential(account, 'old-access', true);
  const signinSilent = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));
  signinSilent.mockImplementation(async () => {
    stored = credential(account, 'renewed-access', false);
    return stored;
  });
  getToken.mockImplementation(createTokenAccess({ getUser: async () => stored, signinSilent }));
  const { syncKitchen, syncStatus } = await import('../../../src/data/sync');
  const remote = remoteKitchen();
  await syncKitchen();
  expect(syncStatus().status).toBe('error');
  expect(store.getKitchen()).toEqual(before);
  await syncKitchen();
  expect(signinSilent).toHaveBeenCalledTimes(2);
  expect(remote.sent).toEqual(before.pending.map((mutation) => mutation.id));
  expect(syncStatus().status).toBe('synced');
});

it('preserves pending edits after API 401 and allows a new token immediately', async () => {
  const { store, before } = await editedKitchen();
  const { syncKitchen, syncStatus } = await import('../../../src/data/sync');
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
  vi.stubGlobal('fetch', fetch);
  await syncKitchen();
  expect(syncStatus().status).toBe('signin');
  expect(store.getKitchen()).toEqual(before);
  await syncKitchen();
  expect(fetch).toHaveBeenCalledTimes(1);
  getToken.mockResolvedValue('new-access-token');
  const remote = remoteKitchen();
  await syncKitchen();
  expect(remote.sent).toEqual(before.pending.map((mutation) => mutation.id));
  expect(syncStatus().status).toBe('synced');
});

it.each([403, 429])('retains HTTP %s throttling even when credentials change', async (status) => {
  const { account } = await editedKitchen();
  const { cloudRequest, syncAllowed } = await import('../../../src/data/sync-request');
  const fetch = vi.fn().mockResolvedValue(
    Response.json(
      { message: 'Paused' },
      {
        status,
        headers: { 'Retry-After': '120' },
      },
    ),
  );
  vi.stubGlobal('fetch', fetch);
  await expect(cloudRequest(account, '/v1/kitchen', 'old-token')).rejects.toThrow('Paused');
  expect(syncAllowed(account)).toBe(false);
  await expect(cloudRequest(account, '/v1/kitchen', 'new-token')).rejects.toThrow('paused');
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('ignores late auth failure and events from another account', async () => {
  const { store, account } = await editedKitchen();
  const { syncKitchen, syncStatus, startSync } = await import('../../../src/data/sync');
  remoteKitchen();
  await syncKitchen();
  expect(syncStatus().status).toBe('synced');
  let reject: ((error: unknown) => void) | undefined;
  getToken.mockImplementation(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  const syncing = syncKitchen();
  await vi.waitFor(() => expect(reject).toBeTypeOf('function'));
  await store.loadKitchen(crypto.randomUUID());
  const { SignInRequiredError } = await import('../../../src/auth/errors');
  reject?.(new SignInRequiredError());
  await syncing;
  expect(syncStatus().status).toBe('synced');
  getToken.mockResolvedValue('new-token');
  remoteKitchen();
  await syncKitchen();
  expect(syncStatus().status).toBe('synced');
  const clearInterval = vi.fn();
  Object.assign(window, { setInterval: vi.fn(() => 1), clearInterval });
  const stop = startSync();
  await syncKitchen();
  window.dispatchEvent(new CustomEvent('pantridge-signin', { detail: account }));
  expect(syncStatus().status).toBe('synced');
  stop();
  expect(clearInterval).toHaveBeenCalled();
});
