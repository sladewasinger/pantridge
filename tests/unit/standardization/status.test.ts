import { expect, it } from 'vitest';
import { classificationStatusCopy } from '../../../src/features/standardization/status-copy';
import {
  classificationDueSoon,
  type ClassificationJob,
} from '../../../src/domain/standardization/job';

const now = new Date(2026, 9, 7, 22, 31).getTime();
const job: ClassificationJob = {
  state: 'queued',
  input: 'test',
  generation: 1,
  firstQueuedAt: now,
  dueAt: 0,
  attempts: 0,
};
it.each([0, now - 60_000, now])(
  'renders immediate or overdue eligibility without a misleading time (%s)',
  (dueAt) => {
    expect(classificationStatusCopy({ ...job, dueAt }, 0, 1, { now })).toBe(
      'Queued for processing. You can close the app.',
    );
  },
);
it('distinguishes synced recognition work from edits that still need syncing', () => {
  expect(classificationStatusCopy(job, 1, 1, { now })).toContain('Waiting for');
  expect(classificationStatusCopy(job, 0, 1, { now })).toContain('Queued for processing');
  expect(classificationStatusCopy(undefined, 0, 0, { now })).toBe('No food recognition pending.');
});
it('includes the date for a future-day retry and the local time for same-day work', () => {
  const tomorrow = new Date(now + 86400_000);
  expect(
    classificationStatusCopy({ ...job, state: 'retry', dueAt: tomorrow.getTime() }, 0, 1, { now }),
  ).toContain(tomorrow.toLocaleDateString([], { month: 'short', day: 'numeric' }));
  const soon = new Date(now + 600_000);
  expect(classificationStatusCopy({ ...job, dueAt: soon.getTime() }, 0, 1, { now })).toContain(
    soon.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  );
});
it('fast-polls only active due or near-due work, not paused/failed/distant jobs', () => {
  expect(classificationDueSoon(job, now)).toBe(true);
  expect(classificationDueSoon({ ...job, state: 'processing' }, now)).toBe(true);
  expect(classificationDueSoon({ ...job, state: 'retry', dueAt: now + 30_000 }, now)).toBe(true);
  for (const state of ['failed', 'paused'] as const)
    expect(classificationDueSoon({ ...job, state }, now)).toBe(false);
  expect(classificationDueSoon({ ...job, state: 'retry', dueAt: now + 86400_000 }, now)).toBe(
    false,
  );
  expect(classificationDueSoon(undefined, now)).toBe(false);
});
