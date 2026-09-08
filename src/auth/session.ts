import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { revokeRefreshToken } from './revoke';
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
        userStore: new WebStorageStateStore({ store: window.localStorage }),
        automaticSilentRenew: true,
        extraQueryParams: googleSignIn ? { identity_provider: 'Google' } : {},
      })
    : null;

export async function initializeSession(): Promise<string> {
  if (!auth) return 'local';
  const query = new URLSearchParams(window.location.search);
  if (query.has('code') || query.has('error')) {
    try {
      await auth.signinRedirectCallback();
    } finally {
      window.history.replaceState({}, '', '/');
    }
  }
  const user = await auth.getUser();
  return user ? user.profile.sub : 'local';
}

export async function getToken(account: string): Promise<string | null> {
  if (!auth) return null;
  let user = await auth.getUser();
  if (user && user.profile.sub !== account)
    throw new Error('Your account changed. Reload to continue syncing.');
  if (user?.expired) user = await auth.signinSilent();
  if (user && user.profile.sub !== account)
    throw new Error('Your account changed. Reload to continue syncing.');
  return user?.access_token ?? null;
}

export async function signOut(): Promise<void> {
  if (!auth) return;
  auth.stopSilentRenew();
  const domain = import.meta.env.VITE_AUTH_DOMAIN as string | undefined;
  const user = await auth.getUser();
  if (domain && clientId && user?.refresh_token)
    await revokeRefreshToken(domain, clientId, user.refresh_token);
  await auth.removeUser();
  if (domain && clientId) {
    const url = new URL('/logout', domain);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('logout_uri', window.location.origin + '/');
    window.location.assign(url);
  } else window.location.reload();
}
