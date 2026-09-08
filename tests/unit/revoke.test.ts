import { afterEach, expect, it, vi } from 'vitest';
import { revokeRefreshToken } from '../../src/auth/revoke';
afterEach(() => vi.unstubAllGlobals());
it('sends refresh revocation in a POST body, never in URLs or cookies', async () => {
  const request = vi.fn().mockResolvedValue(new Response());
  vi.stubGlobal('fetch', request);
  await revokeRefreshToken('https://auth.example.test', 'public-client', 'private-token');
  const [url, options] = request.mock.calls[0]!;
  expect(String(url)).toBe('https://auth.example.test/oauth2/revoke');
  expect(options).toMatchObject({ method: 'POST', credentials: 'omit' });
  expect(options.body.get('token')).toBe('private-token');
  expect(options.body.get('client_id')).toBe('public-client');
});
it('does not prevent local sign-out when revocation cannot connect', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
  await expect(
    revokeRefreshToken('https://auth.example.test', 'client', 'token'),
  ).resolves.toBeUndefined();
});
