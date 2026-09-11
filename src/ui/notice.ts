import { useSyncExternalStore } from 'react';
export interface Notice {
  message: string;
  undo: () => Promise<void>;
}
let current: Notice | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
export function pauseNotice() {
  clearTimeout(timer);
}
export function resumeNotice() {
  pauseNotice();
  const notice = current;
  if (notice) timer = setTimeout(() => dismissNotice(notice), 10000);
}
export function showUndo(message: string, undo: () => Promise<void>) {
  current = { message, undo };
  resumeNotice();
  listeners.forEach((listener) => listener());
}
export function dismissNotice(expected?: Notice) {
  if (expected && expected !== current) return;
  pauseNotice();
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
