import type { Envelope } from '../domain/model';
import { reduceChecked } from '../domain/reducer';
import type { StoredKitchen } from './database';
export function reconcile(
  current: StoredKitchen,
  remote: Envelope,
  acknowledged: Set<string>,
): StoredKitchen {
  // Another tab may already have committed a newer response to IndexedDB.
  if (remote.revision < current.revision) return current;
  const pending = current.pending.filter((mutation) => !acknowledged.has(mutation.id));
  return {
    data: pending.reduce((data, mutation) => reduceChecked(data, mutation.command), remote.data),
    pending,
    revision: remote.revision,
    syncedAt: new Date().toISOString(),
  };
}
