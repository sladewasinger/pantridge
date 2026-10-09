import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { revokeRefreshToken } from './revoke';
import { createTokenAccess } from './token-access';
import { withSessionLock } from './session-lock';
import { requestSignIn } from './errors';
import { localTesting, localToken } from '../local-testing';
const authority = import.meta.env.VITE_AUTHORITY as string | undefined;
const clientId = import.meta.env.VITE_CLIENT_ID as string | undefined;
export const googleSignIn = import.meta.env.VITE_IDENTITY_PROVIDER === 'Google';
export const auth =
  authority && clientId
    ? new UserManager({
        authority,
        client_id: clientId,
        redirect_uri: window.location.origin + '/',
        response_type: 'code',
        scope: 'openid email profile',
        userStore: new WebStorageStateStore({
          store: window.localStorage,
          prefix: localTesting ? 'oidc.local-test.' : 'oidc.',
        }),
        automaticSilentRenew: false,
        requestTimeoutInSeconds: 15,
        extraQueryParams: googleSignIn ? { identity_provider: 'Google' } : {},
      })
    : null;
const tokenAccess = auth ? createTokenAccess(auth) : null;
let failedCallbackCredential: string | undefined;

export async function initializeSession(): Promise<string> {
  if (!auth) return 'local';
  const query = new URLSearchParams(window.location.search);
  if (query.has('code') || query.has('error')) {
    try {
      await withSessionLock(async () => {
        try {
          await auth!.signinRedirectCallback();
        } catch {
          // A canceled or failed login must not prevent access to saved offline edits.
          const user = await auth!.getUser();
          failedCallbackCredential = user?.access_token ?? '';
        }
      });
    } finally {
      window.history.replaceState({}, '', '/');
    }
  }
  const user = await auth.getUser();
  return user ? user.profile.sub : 'local';
}

export async function getToken(account: string): Promise<string | null> {
  if (localTesting && account === 'local') return localToken();
  if (!auth) return null;
  if (failedCallbackCredential !== undefined) {
    const user = await auth.getUser();
    if ((user?.access_token ?? '') === failedCallbackCredential) throw requestSignIn(account);
    failedCallbackCredential = undefined;
  }
  return tokenAccess!(account);
}

export async function signOut(): Promise<void> {
  if (!auth) return;
  auth.stopSilentRenew();
  const domain = import.meta.env.VITE_AUTH_DOMAIN as string | undefined;
  await withSessionLock(async () => {
    const user = await auth!.getUser();
    if (domain && clientId && user?.refresh_token)
      await revokeRefreshToken(domain, clientId, user.refresh_token);
    await auth!.removeUser();
  });
  if (domain && clientId) {
    const url = new URL('/logout', domain);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('logout_uri', window.location.origin + '/');
    window.location.assign(url);
  } else window.location.reload();
}
