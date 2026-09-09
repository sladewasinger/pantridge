import { getToken } from '../auth/session';
import { cloudRequest, syncAllowed } from './sync-request';
import { syncBatch } from './sync-batch';
import { reconcile } from './reconcile';
import { getAccount, getKitchen, updateKitchen } from './store';

const api = import.meta.env.VITE_API_URL as string | undefined;
let running: Promise<void> | null = null;
export type SyncStatus = 'local' | 'offline' | 'syncing' | 'synced' | 'error' | 'signin';
let status: SyncStatus = api ? 'signin' : 'local';
let detail = '';
export const syncStatus = () => ({ status, detail });
function report(next: SyncStatus, message = '') {
  status = next;
  detail = message;
  window.dispatchEvent(new Event('pantridge-sync'));
}
async function performSync(): Promise<void> {
  if (!api) {
    report('local');
    return;
  }
  if (!navigator.onLine) {
    report('offline');
    return;
  }
  const account = getAccount();
  if (!syncAllowed(account)) return;
  const token = await getToken(account);
  if (getAccount() !== account) return;
  if (!token || getAccount() === 'local') {
    report('signin');
    return;
  }
  report('syncing');
  const envelope = await cloudRequest(account, '/v1/kitchen', token);
  if (getAccount() !== account) return;
  await syncBatch(account, token, envelope);
  if (getAccount() !== account) return;
  report(getKitchen().pending.length ? 'syncing' : 'synced');
}
export function syncKitchen(): Promise<void> {
  running ??= performSync()
    .catch((error: unknown) => {
      report(
        'error',
        error instanceof Error ? error.message : 'Sync failed. Your changes remain on this device.',
      );
    })
    .finally(() => {
      running = null;
    });
  return running;
}

export async function useCloudCopy(): Promise<void> {
  await running;
  const reset = async () => {
    const account = getAccount();
    const token = await getToken(account);
    if (getAccount() !== account) throw new Error('Your account changed. Please try again.');
    if (!api || !token || !navigator.onLine)
      throw new Error('Reconnect and sign in before using your cloud copy.');
    const discarded = new Set(getKitchen().pending.map((mutation) => mutation.id));
    const remote = await cloudRequest(account, '/v1/kitchen', token);
    if (account !== getAccount()) throw new Error('Your account changed. Please try again.');
    await updateKitchen((current) => reconcile(current, remote, discarded));
    report('synced');
  };
  running = reset().finally(() => {
    running = null;
  });
  return running;
}
export function startSync(): () => void {
  const trigger = () => {
    void syncKitchen();
  };
  const offline = () => report('offline');
  let lastPoll = 0;
  const interval = window.setInterval(() => {
    if (document.hidden || !syncAllowed(getAccount())) return;
    if (getKitchen().pending.length || Date.now() - lastPoll >= 300_000) {
      lastPoll = Date.now();
      trigger();
    }
  }, 30_000);
  window.addEventListener('online', trigger);
  window.addEventListener('offline', offline);
  window.addEventListener('pantridge-change', trigger);
  window.addEventListener('focus', trigger);
  trigger();
  return () => {
    window.clearInterval(interval);
    window.removeEventListener('online', trigger);
    window.removeEventListener('offline', offline);
    window.removeEventListener('pantridge-change', trigger);
    window.removeEventListener('focus', trigger);
  };
}
