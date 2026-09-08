import { useState } from 'react';
import { Download, LogIn, LogOut, RefreshCw } from 'lucide-react';
import { auth, googleSignIn, signOut } from '../../auth/session';
import { exportKitchen, restoreKitchen } from '../../data/backup';
import { getAccount, useKitchen } from '../../data/store';
import { syncKitchen, syncStatus } from '../../data/sync';
import { SyncRecovery } from './SyncRecovery';
import { Modal } from '../../ui/Modal';
import { useAction } from '../../ui/useAction';

export function Settings({ onClose }: { onClose: () => void }) {
  const { syncedAt, pending } = useKitchen();
  const { run, error, busy } = useAction();
  const [storage, setStorage] = useState('');
  const local = getAccount() === 'local';
  const signInLabel = googleSignIn ? 'Sign in with Google' : 'Sign in';
  return (
    <Modal title="Your kitchen" onClose={onClose}>
      <section className="settings-section">
        <h3>{local ? 'Saved on this device' : 'Your connected kitchen'}</h3>
        <p className="muted">
          Inventory, shopping, and putting groceries away work offline after the app’s first load.
        </p>
        {syncedAt && <p className="muted">Last synced {new Date(syncedAt).toLocaleString()}</p>}
        {!local && <p>{pending.length} changes waiting to sync</p>}
        {auth && (
          <button
            className="secondary full"
            onClick={() =>
              void run(async () => {
                if (local) await auth?.signinRedirect();
                else await signOut();
              })
            }
          >
            {local ? <LogIn size={17} /> : <LogOut size={17} />}
            {local ? signInLabel : 'Sign out'}
          </button>
        )}
        {auth && local && (
          <p className="muted">
            Your local and signed-in kitchens are separate. Export a backup here to restore into an
            empty signed-in kitchen.
          </p>
        )}
        {!local && (
          <button className="text-button full" onClick={() => void syncKitchen()}>
            <RefreshCw size={16} />
            Sync now
          </button>
        )}
        {syncStatus().detail && <p className="error">{syncStatus().detail}</p>}
        <SyncRecovery />
      </section>
      <section className="settings-section">
        <h3>Keep a backup</h3>
        <p className="muted">
          A backup preserves your food if you clear browser data or change devices.
        </p>
        <button className="secondary full" onClick={exportKitchen}>
          <Download size={17} />
          Export kitchen
        </button>
        <label className="file-label">
          Restore into an empty kitchen
          <input
            type="file"
            accept="application/json,.json"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                void run(async () => {
                  await restoreKitchen(file);
                  onClose();
                });
            }}
          />
        </label>
        <button
          className="text-button full"
          onClick={() =>
            void run(async () => {
              const granted = await navigator.storage?.persist?.();
              setStorage(
                granted
                  ? 'Persistent storage enabled.'
                  : 'Your browser manages storage automatically. Keep an exported backup.',
              );
            })
          }
        >
          Keep data on this device
        </button>
        {storage && (
          <p className="muted" role="status">
            {storage}
          </p>
        )}
      </section>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </Modal>
  );
}
