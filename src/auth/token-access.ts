import type { User, UserManager } from 'oidc-client-ts';
import { requestSignIn, requiresSignIn } from './errors';
import { withSessionLock } from './session-lock';

function assertAccount(user: User | null, account: string) {
  if (user && user.profile.sub !== account)
    throw new Error('Your account changed. Reload to continue syncing.');
}

export function createTokenAccess(manager: Pick<UserManager, 'getUser' | 'signinSilent'>) {
  let rejectedCredential: string | undefined;
  return (account: string): Promise<string | null> =>
    withSessionLock(async () => {
      let user = await manager.getUser();
      assertAccount(user, account);
      if (!user) {
        if (account === 'local') return null;
        throw requestSignIn(account);
      }
      const credential = user.refresh_token ?? user.access_token;
      if (rejectedCredential && credential === rejectedCredential) throw requestSignIn(account);
      if (user.expired || (user.expires_in !== undefined && user.expires_in < 30)) {
        if (!user.refresh_token) throw requestSignIn(account);
        try {
          user = await manager.signinSilent();
        } catch (error) {
          if (requiresSignIn(error)) {
            rejectedCredential = credential;
            throw requestSignIn(account);
          }
          throw new Error(
            'Sign-in renewal is temporarily unavailable. Your changes are saved on this device.',
            { cause: error },
          );
        }
        assertAccount(user, account);
      }
      if (!user?.access_token) throw requestSignIn(account);
      rejectedCredential = undefined;
      return user.access_token;
    });
}
