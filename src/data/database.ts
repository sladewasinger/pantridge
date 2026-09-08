import { openDB, type DBSchema } from 'idb';
import type { Mutation } from '../domain/commands';
import { emptySnapshot, type Snapshot } from '../domain/model';

export interface StoredKitchen {
  data: Snapshot;
  pending: Mutation[];
  revision: number;
  syncedAt: string | null;
}
interface KitchenDatabase extends DBSchema {
  kitchens: { key: string; value: StoredKitchen };
}
const database = () =>
  openDB<KitchenDatabase>('pantridge-v1', 1, {
    upgrade(db) {
      db.createObjectStore('kitchens');
    },
  });
export const blankKitchen = (): StoredKitchen => ({
  data: emptySnapshot(),
  pending: [],
  revision: 0,
  syncedAt: null,
});

export async function readKitchen(key: string): Promise<StoredKitchen> {
  const db = await database();
  try {
    return (await db.get('kitchens', key)) ?? blankKitchen();
  } finally {
    db.close();
  }
}

// A single read/write transaction serializes edits across tabs and commits the
// rendered data together with its outbox, including when the browser terminates.
export async function changeKitchen(
  key: string,
  change: (current: StoredKitchen) => StoredKitchen,
): Promise<StoredKitchen> {
  const db = await database();
  try {
    const tx = db.transaction('kitchens', 'readwrite');
    const next = change((await tx.store.get(key)) ?? blankKitchen());
    await tx.store.put(next, key);
    await tx.done;
    return next;
  } finally {
    db.close();
  }
}
