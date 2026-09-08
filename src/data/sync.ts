import { getToken } from '../auth/session';
import { envelopeSchema, type Envelope } from '../domain/model';
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
async function request(path: string, token: string, body?: string): Promise<Envelope> {
  const response = await fetch(`${api}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body,
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  });
  if (response.status === 401)
    throw new Error('Sign in again to sync. Your changes are safe on this device.');
  if (!response.ok) {
    const error = (await response.json()) as { message?: string };
    throw new Error(error.message ?? 'Sync is unavailable. Your changes are saved on this device.');
  }
  return envelopeSchema.parse(await response.json());
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
  const token = await getToken();
  if (!token || getAccount() === 'local') {
    report('signin');
    return;
  }
  const account = getAccount();
  report('syncing');
  let envelope = await request('/v1/kitchen', token);
  const pending = [...getKitchen().pending];
  const acknowledged = new Set<string>();
  for (const mutation of pending) {
    if (getAccount() !== account) return;
    envelope = await request('/v1/mutations', token, JSON.stringify(mutation));
    acknowledged.add(mutation.id);
  }
  if (getAccount() !== account) return;
  await updateKitchen((current) => reconcile(current, envelope, acknowledged));
  report('synced');
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
    const token = await getToken();
    if (!api || !token || !navigator.onLine)
      throw new Error('Reconnect and sign in before using your cloud copy.');
    const account = getAccount();
    const discarded = new Set(getKitchen().pending.map((mutation) => mutation.id));
    const remote = await request('/v1/kitchen', token);
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
  const interval = window.setInterval(trigger, 30_000);
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
