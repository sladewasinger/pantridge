import { User } from 'oidc-client-ts';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createTokenAccess } from '../../../src/auth/token-access';
import { SignInRequiredError } from '../../../src/auth/errors';

function credential({
  subject = 'owner',
  token = 'private-access',
  refresh = 'private-refresh' as string | undefined,
  expired = true,
} = {}) {
  return new User({
    profile: { sub: subject, iss: 'https://issuer.test', aud: 'client', iat: 1, exp: 9999999999 },
    access_token: token,
    refresh_token: refresh,
    token_type: 'Bearer',
    expires_at: Math.floor(Date.now() / 1000) + (expired ? -60 : 3600),
  });
}
let stored: User | null;
const getUser = vi.fn<() => Promise<User | null>>();
const signinSilent = vi.fn<() => Promise<User | null>>();
let getToken: ReturnType<typeof createTokenAccess>;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('navigator', {});
  stored = credential();
  getUser.mockImplementation(async () => stored);
  signinSilent.mockImplementation(async () => {
    stored = credential({ token: 'renewed-access', expired: false });
    return stored;
  });
  getToken = createTokenAccess({ getUser, signinSilent });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('serializes simultaneous calls and rereads stored credentials instead of refreshing twice', async () => {
  expect(await Promise.all([getToken('owner'), getToken('owner'), getToken('owner')])).toEqual([
    'renewed-access',
    'renewed-access',
    'renewed-access',
  ]);
  expect(signinSilent).toHaveBeenCalledTimes(1);
});
it('uses the browser lock path when available and rereads storage after acquiring it', async () => {
  const request = vi.fn(async (_name: string, callback: () => Promise<string | null>) => {
    stored = credential({ token: 'other-tab-renewed-access', expired: false });
    return callback();
  });
  vi.stubGlobal('navigator', { locks: { request } });
  expect(await getToken('owner')).toBe('other-tab-renewed-access');
  expect(request).toHaveBeenCalled();
  expect(signinSilent).not.toHaveBeenCalled();
});
it.each([
  'invalid_grant',
  'login_required',
  'interaction_required',
  'consent_required',
  'account_selection_required',
])(
  'latches structured terminal %s until credentials change and emits only the account',
  async (error) => {
    const event = vi.fn();
    window.addEventListener('pantridge-signin', event);
    signinSilent.mockRejectedValue({ error, error_description: 'private-refresh private-access' });
    await expect(getToken('owner')).rejects.toBeInstanceOf(SignInRequiredError);
    await expect(getToken('owner')).rejects.toBeInstanceOf(SignInRequiredError);
    expect(signinSilent).toHaveBeenCalledTimes(1);
    expect(event).toHaveBeenCalled();
    for (const [notification] of event.mock.calls)
      expect((notification as CustomEvent<string>).detail).toBe('owner');
  },
);
it('does not treat arbitrary error text or a temporary network failure as terminal', async () => {
  signinSilent.mockRejectedValueOnce(new TypeError('Network request failed'));
  await expect(getToken('owner')).rejects.not.toBeInstanceOf(SignInRequiredError);
  expect(await getToken('owner')).toBe('renewed-access');
  expect(signinSilent).toHaveBeenCalledTimes(2);
});
it('does not latch a configuration error as a renewal failure', async () => {
  signinSilent.mockRejectedValue({
    error: 'invalid_client',
    error_description: 'client setup wrong',
  });
  await expect(getToken('owner')).rejects.not.toBeInstanceOf(SignInRequiredError);
  await expect(getToken('owner')).rejects.not.toBeInstanceOf(SignInRequiredError);
  expect(signinSilent).toHaveBeenCalledTimes(2);
});
it('fresh same-subject credentials clear the terminal latch and can renew normally', async () => {
  signinSilent.mockRejectedValueOnce({ error: 'invalid_grant' });
  await expect(getToken('owner')).rejects.toBeInstanceOf(SignInRequiredError);
  stored = credential({ token: 'fresh-access', refresh: 'fresh-refresh' });
  expect(await getToken('owner')).toBe('renewed-access');
  expect(signinSilent).toHaveBeenCalledTimes(2);
});
it('an older terminal failure cannot poison fresh same-account credentials', async () => {
  let fail: ((reason: unknown) => void) | undefined;
  signinSilent.mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
  );
  const first = getToken('owner').catch((error: unknown) => error);
  await vi.waitFor(() => expect(fail).toBeTypeOf('function'));
  stored = credential({ token: 'fresh-access', refresh: 'fresh-refresh', expired: false });
  fail?.({ error: 'invalid_grant' });
  await first;
  expect(await getToken('owner')).toBe('fresh-access');
  expect(signinSilent).toHaveBeenCalledTimes(1);
});
it('rejects account mismatch before renewal without exposing the other token', async () => {
  stored = credential({ subject: 'other', token: 'never-send', expired: false });
  await expect(getToken('owner')).rejects.toThrow('account changed');
  expect(signinSilent).not.toHaveBeenCalled();
});
it('rejects a changed subject after renewal', async () => {
  signinSilent.mockResolvedValueOnce(
    credential({ subject: 'other', token: 'never-send', expired: false }),
  );
  await expect(getToken('owner')).rejects.toThrow('account changed');
});
it('rejects a changed subject when another tab signs in while awaiting the browser lock', async () => {
  vi.stubGlobal('navigator', {
    locks: {
      request: async (_name: string, callback: () => Promise<string | null>) => {
        stored = credential({ subject: 'other', token: 'never-send', expired: false });
        return callback();
      },
    },
  });
  await expect(getToken('owner')).rejects.toThrow('account changed');
  expect(signinSilent).not.toHaveBeenCalled();
});
it('requires interactive sign-in for expired credentials without a refresh token', async () => {
  stored = credential();
  stored.refresh_token = undefined;
  await expect(getToken('owner')).rejects.toBeInstanceOf(SignInRequiredError);
  expect(signinSilent).not.toHaveBeenCalled();
});
it('requires sign-in for a missing signed account while keeping local use available', async () => {
  stored = null;
  await expect(getToken('owner')).rejects.toBeInstanceOf(SignInRequiredError);
  expect(await getToken('local')).toBeNull();
  expect(signinSilent).not.toHaveBeenCalled();
});
it('requires sign-in when a renewal returns no user', async () => {
  stored = credential();
  signinSilent.mockResolvedValueOnce(null);
  await expect(getToken('owner')).rejects.toBeInstanceOf(SignInRequiredError);
});
it('requires sign-in rather than returning an empty access token', async () => {
  stored = credential({ token: '', expired: false });
  await expect(getToken('owner')).rejects.toBeInstanceOf(SignInRequiredError);
});
it('does not infer terminal errors from raw provider text', async () => {
  signinSilent.mockRejectedValueOnce(new Error('invalid_grant private-refresh'));
  await expect(getToken('owner')).rejects.toThrow('temporarily unavailable');
  expect(await getToken('owner')).toBe('renewed-access');
});
it('serializes separate token-access instances sharing one stored session', async () => {
  const secondTokenAccess = createTokenAccess({ getUser, signinSilent });
  expect(await Promise.all([getToken('owner'), secondTokenAccess('owner')])).toEqual([
    'renewed-access',
    'renewed-access',
  ]);
  expect(signinSilent).toHaveBeenCalledTimes(1);
});
