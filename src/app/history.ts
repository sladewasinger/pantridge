import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { id, shoppingSchema } from '../domain/model';
import type { Overlay, Page, StoragePage } from './navigation';

const frameSchema = z.object({
  version: z.literal(1),
  account: z.string(),
  depth: z.number().int().nonnegative(),
  page: z.enum(['kitchen', 'shopping']),
  location: z.enum(['fridge', 'pantry', 'freezer']).nullable(),
  query: z.string(),
  overlay: z
    .discriminatedUnion('type', [
      z.object({ type: z.literal('food'), id }),
      z.object({ type: z.literal('add'), shelf: z.number().int().min(0).max(2).optional() }),
      z.object({ type: z.literal('shopping'), item: shoppingSchema.optional() }),
      z.object({ type: z.literal('put-away') }),
      z.object({ type: z.literal('settings') }),
    ])
    .nullable(),
});
type Frame = z.infer<typeof frameSchema>;
const home = { page: 'kitchen', location: null, query: '', overlay: null } as const;
let current: Frame = { ...home, version: 1, account: 'local', depth: 0 };
let traversing = false;
const listeners = new Set<() => void>();

function emit(next: Frame) {
  current = next;
  listeners.forEach((listener) => listener());
}
function savedFrame(): Frame | null {
  const state: unknown = window.history.state;
  const parsed = z.object({ pantridge: frameSchema }).safeParse(state);
  return parsed.success && parsed.data.pantridge.account === current.account
    ? parsed.data.pantridge
    : null;
}
function write(next: Frame, replace = false) {
  const state = { pantridge: next };
  if (replace) window.history.replaceState(state, '');
  else window.history.pushState(state, '');
  emit(next);
}
function onPopState() {
  traversing = false;
  const saved = savedFrame();
  if (saved) emit(saved);
  else write({ ...current, ...home, depth: 0 }, true);
}

// Run after authentication so history from another account cannot restore its UI.
export function initializeNavigation(account: string) {
  current = { ...home, version: 1, account, depth: 0 };
  write(savedFrame() ?? current, true);
  window.addEventListener('popstate', onPopState);
}
function push(next: Partial<Frame>) {
  if (!traversing) write({ ...current, ...next, depth: current.depth + 1 });
}
function back(distance = 1) {
  if (traversing || current.depth < distance) return;
  traversing = true;
  window.history.go(-distance);
}
export function navigate(page: Page) {
  if (page === 'kitchen') {
    if (current.depth) back(current.depth);
    return;
  }
  if (current.page !== page) push({ ...home, page });
}
export function openLocation(location: StoragePage) {
  push({ ...home, location });
}
export function openOverlay(overlay: Overlay) {
  if (current.overlay || traversing) return;
  push({ overlay });
}
export function closeOverlay() {
  if (current.overlay) back();
}
export function search(query: string) {
  if (traversing || query === current.query) return;
  if (!query) back();
  else if (current.query) write({ ...current, query }, true);
  else push({ query });
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useNavigation() {
  return useSyncExternalStore(subscribe, () => current);
}
