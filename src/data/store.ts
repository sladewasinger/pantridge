import { useSyncExternalStore } from 'react';
import { mutationSchema, type Command } from '../domain/commands';
import { reduceChecked } from '../domain/reducer';
import { blankKitchen, changeKitchen, readKitchen, type StoredKitchen } from './database';
import { initializeStarter } from '../domain/starter';

let account = 'local';
let current: StoredKitchen = blankKitchen();
let ready = false;
const listeners = new Set<() => void>();
const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('pantridge');
function publish(next: StoredKitchen) {
  current = next;
  listeners.forEach((listener) => listener());
}
export const getAccount = () => account;
export const getKitchen = () => current;
export const isReady = () => ready;
export async function loadKitchen(key = account): Promise<void> {
  account = key;
  let next = await readKitchen(key);
  if (key === 'local' && !next.data.starterVersion) {
    next = await changeKitchen(key, (stored) => ({
      ...stored,
      data: initializeStarter(stored.data),
    }));
  }
  if (key !== account) return;
  ready = true;
  publish(next);
}
channel?.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (event.data === account) void loadKitchen().catch(console.error);
});
export async function updateKitchen(
  change: (value: StoredKitchen) => StoredKitchen,
): Promise<void> {
  const key = account;
  const next = await changeKitchen(key, change);
  if (key === account) publish(next);
  channel?.postMessage(key);
}
export async function dispatch(command: Command): Promise<void> {
  return dispatchMany([command]);
}
export async function dispatchMany(commands: Command[], requireEmpty = false): Promise<void> {
  if (!ready) throw new Error('Your kitchen is still opening.');
  const mutations = commands.map((command) =>
    mutationSchema.parse({ id: crypto.randomUUID(), command }),
  );
  await updateKitchen((value) => {
    if (requireEmpty && (value.data.foods.length || value.data.shopping.length))
      throw new Error('Restore into an empty kitchen to avoid overwriting your food.');
    return {
      ...value,
      data: mutations.reduce((data, mutation) => reduceChecked(data, mutation.command), value.data),
      pending: [...value.pending, ...mutations],
    };
  });
  window.dispatchEvent(new Event('pantridge-change'));
}
export function useKitchen(): StoredKitchen {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, getKitchen);
}
