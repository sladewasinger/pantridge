import { useEffect, useState } from 'react';
import { CloudCheck, CloudOff, HardDrive, RefreshCw } from 'lucide-react';
import { syncStatus } from '../data/sync';
import { useKitchen } from '../data/store';
export function SyncIndicator({ onClick }: { onClick: () => void }) {
  const [state, setState] = useState(syncStatus);
  const { pending } = useKitchen();
  useEffect(() => {
    const update = () => setState(syncStatus());
    window.addEventListener('pantridge-sync', update);
    return () => window.removeEventListener('pantridge-sync', update);
  }, []);
  const labels = {
    local: 'Saved on this device',
    offline: 'Offline · saved on this device',
    syncing: 'Syncing your kitchen',
    synced: 'Kitchen synced',
    error: 'Saved here · sync needs attention',
    signin: 'Saved here · sign in to sync',
  };
  const Icon = {
    local: HardDrive,
    offline: CloudOff,
    syncing: RefreshCw,
    synced: CloudCheck,
    error: CloudOff,
    signin: HardDrive,
  }[state.status];
  return (
    <button className="sync-indicator" onClick={onClick} aria-live="polite">
      <Icon size={13} />
      <span>
        {state.status === 'synced' && pending.length > 0
          ? `${pending.length} changes waiting to sync`
          : labels[state.status]}
      </span>
    </button>
  );
}
