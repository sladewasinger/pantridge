import type { Envelope } from '../domain/model';
import { cloudRequest } from './sync-request';
import { reconcile } from './reconcile';
import { getAccount, getKitchen, updateKitchen } from './store';

export async function syncBatch(account: string, token: string, initial: Envelope): Promise<void> {
  let envelope = initial;
  const pending = getKitchen().pending.slice(0, 20);
  const acknowledged = new Set<string>();
  try {
    for (const mutation of pending) {
      if (getAccount() !== account) return;
      envelope = await cloudRequest(account, '/v1/mutations', token, JSON.stringify(mutation));
      acknowledged.add(mutation.id);
    }
  } finally {
    // Keep progress when a later request is throttled or interrupted. Retry only
    // unacknowledged IDs, preserving edits made during this batch.
    if (getAccount() === account)
      await updateKitchen((current) => reconcile(current, envelope, acknowledged));
  }
}
