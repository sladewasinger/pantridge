import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  showUndo,
  useNotice,
  pauseNotice,
  resumeNotice,
  dismissNotice,
} from '../../../src/ui/notice';
vi.mock('react', () => ({
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));
beforeEach(() => {
  vi.useFakeTimers();
  dismissNotice();
});
afterEach(() => {
  dismissNotice();
  vi.useRealTimers();
});
it('dismisses after ten seconds, pauses for interaction, and keeps newer notices', () => {
  showUndo('First', async () => {});
  const first = useNotice()!;
  vi.advanceTimersByTime(9000);
  expect(useNotice()?.message).toBe('First');
  pauseNotice();
  vi.advanceTimersByTime(20000);
  expect(useNotice()).not.toBeNull();
  resumeNotice();
  vi.advanceTimersByTime(10000);
  expect(useNotice()).toBeNull();
  showUndo('Second', async () => {});
  dismissNotice(first);
  expect(useNotice()?.message).toBe('Second');
  vi.advanceTimersByTime(10000);
  expect(useNotice()).toBeNull();
});
