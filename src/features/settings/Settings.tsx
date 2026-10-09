import { useState } from 'react';
import { ClassificationStatus } from '../standardization/ClassificationStatus';
import { Download, RefreshCw } from 'lucide-react';
import { AccountActions } from './AccountActions';
import { exportKitchen, restoreKitchen } from '../../data/backup';
import { getAccount, useKitchen } from '../../data/store';
import { syncKitchen } from '../../data/sync';
import { useSyncStatus } from '../../data/useSyncStatus';
import { SyncRecovery } from './SyncRecovery';
import { Modal } from '../../ui/Modal';
import { useAction } from '../../ui/useAction';
import { localTesting } from '../../local-testing';
import { LocalSample } from '../../development/LocalSample';
import { FullControls } from '../../development/full/Controls';

const localTools = import.meta.env.DEV ? <LocalSample /> : null;
const fullTools =
  import.meta.env.DEV && import.meta.env.VITE_LOCAL_FULL === 'true' ? <FullControls /> : null;

export function Settings({ onClose }: { onClose: () => void }) {
  const { syncedAt, pending } = useKitchen();
  const sync = useSyncStatus();
  const { run, error, busy } = useAction();
  const [storage, setStorage] = useState('');
  const local = getAccount() === 'local';
  const reconnect = !local && sync.status === 'signin';
  return (
    <Modal title="Your kitchen" onClose={onClose}>
      <section className="settings-section">
        {localTesting && <p>Local test kitchen</p>}
        <h3>{local ? 'Saved on this device' : 'Your connected kitchen'}</h3>
        <p className="muted">
          Inventory, shopping, and putting groceries away work offline after the app’s first load.
        </p>
        {syncedAt && <p className="muted">Last synced {new Date(syncedAt).toLocaleString()}</p>}
        {!local && <p>{pending.length} changes waiting to sync</p>}
        <AccountActions local={local} reconnect={reconnect} />
        {!local && (
          <button className="text-button full" onClick={() => void syncKitchen()}>
            <RefreshCw size={16} />
            Sync now
          </button>
        )}
        {sync.detail && (
          <p className="error" role="status">
            {sync.detail}
          </p>
        )}
        <SyncRecovery />
      </section>
      {localTools}
      {fullTools}
      <ClassificationStatus />
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
