import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { getUser, signinSilent } = vi.hoisted(() => ({ getUser: vi.fn(), signinSilent: vi.fn() }));
vi.mock('oidc-client-ts', () => ({
  UserManager: class {
    getUser = getUser;
    signinSilent = signinSilent;
  },
  WebStorageStateStore: class {},
}));
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.stubEnv('VITE_AUTHORITY', 'https://issuer.test');
  vi.stubEnv('VITE_CLIENT_ID', 'client');
  vi.stubGlobal('window', { location: { origin: 'https://app.test' }, localStorage: {} });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it('does not hand another account token to the kitchen sync layer', async () => {
  getUser.mockResolvedValue({ profile: { sub: 'other' }, access_token: 'never-send' });
  const { getToken } = await import('../../src/auth/session');
  await expect(getToken('owner')).rejects.toThrow('account changed');
  expect(signinSilent).not.toHaveBeenCalled();
});
it('checks the account again after an asynchronous token refresh', async () => {
  getUser.mockResolvedValue({ profile: { sub: 'owner' }, expired: true });
  signinSilent.mockResolvedValue({ profile: { sub: 'other' }, access_token: 'never-send' });
  const { getToken } = await import('../../src/auth/session');
  await expect(getToken('owner')).rejects.toThrow('account changed');
});
it('returns only the matching account token', async () => {
  getUser.mockResolvedValue({ profile: { sub: 'owner' }, access_token: 'owner-token' });
  const { getToken } = await import('../../src/auth/session');
  expect(await getToken('owner')).toBe('owner-token');
});
