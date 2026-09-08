import { useSyncExternalStore } from 'react';
interface Notice {
  message: string;
  undo: () => Promise<void>;
}
let current: Notice | null = null;
const listeners = new Set<() => void>();
export function showUndo(message: string, undo: () => Promise<void>) {
  current = { message, undo };
  listeners.forEach((listener) => listener());
}
export function dismissNotice() {
  current = null;
  listeners.forEach((listener) => listener());
}
export function useNotice() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => current,
  );
}
