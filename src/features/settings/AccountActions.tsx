import { LogIn, LogOut } from 'lucide-react';
import { auth, googleSignIn, signOut } from '../../auth/session';
import { useAction } from '../../ui/useAction';

export function AccountActions({ local, reconnect }: { local: boolean; reconnect: boolean }) {
  const { run, busy, error } = useAction();
  if (!auth) return null;
  const signIn = local || reconnect;
  const label = local ? (googleSignIn ? 'Sign in with Google' : 'Sign in') : 'Sign in again';
  return (
    <>
      <button
        className="secondary full"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            if (signIn) await auth?.signinRedirect();
            else await signOut();
          })
        }
      >
        {signIn ? <LogIn size={17} /> : <LogOut size={17} />}
        {signIn ? label : 'Sign out'}
      </button>
      {reconnect && (
        <button className="text-button full" disabled={busy} onClick={() => void run(signOut)}>
          <LogOut size={17} /> Sign out
        </button>
      )}
      {local && (
        <p className="muted">
          Your local and signed-in kitchens are separate. Export a backup here to restore into an
          empty signed-in kitchen.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </>
  );
}
