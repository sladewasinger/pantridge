import { getAccount, useKitchen } from '../../data/store';
import { syncStatus, useCloudCopy } from '../../data/sync';
import { useAction } from '../../ui/useAction';
export function SyncRecovery() {
  const { pending } = useKitchen();
  const { run, busy, error } = useAction();
  if (getAccount() === 'local' || !pending.length || syncStatus().status !== 'error') return null;
  return (
    <details>
      <summary>Resolve unsynced changes</summary>
      <p className="muted">
        Using the cloud copy discards changes still waiting on this device. Export a backup first to
        keep a copy.
      </p>
      <button
        className="secondary full"
        disabled={busy}
        onClick={() => {
          if (window.confirm('Discard unsynced changes on this device and use the cloud copy?'))
            void run(useCloudCopy);
        }}
      >
        Use cloud copy
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </details>
  );
}
