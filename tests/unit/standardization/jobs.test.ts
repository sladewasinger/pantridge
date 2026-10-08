import { afterEach, expect, it, vi } from 'vitest';
import { kitchen } from '../ingredient-matching/fixtures';
import { scheduleClassification, classificationIndex } from '../../../api/standardization/schedule';
import { claimJob, finishJob, failJob } from '../../../api/standardization/worker-state';
import { classificationTargets } from '../../../src/domain/standardization/targets';
import { ProductError } from '../../../api/products/errors';
import { AccessError } from '../../../api/access/config';
import type { SavedStandardization } from '../../../src/domain/standardization/model';
afterEach(() => vi.unstubAllEnvs());
function queued(now = 1000) {
  vi.stubEnv('STANDARDIZATION_ENABLED', 'true');
  const data = kitchen('Unfamiliar rice');
  return scheduleClassification(data, data, now);
}
it('persists a ten-minute debounce and does not postpone it on quantity changes', () => {
  const data = queued();
  expect(data.classificationJob?.dueAt).toBe(601000);
  const next = structuredClone(data);
  next.stock[0]!.quantity++;
  expect(scheduleClassification(data, next, 2000).classificationJob).toEqual(
    data.classificationJob,
  );
  expect(classificationIndex(JSON.parse(JSON.stringify(data)))).toEqual({
    classificationQueue: 'pending',
    classificationDue: 601000,
  });
});
it('caps edit debounce at thirty minutes and preserves active leases', () => {
  const data = queued();
  const claimed = claimJob(data, 'lease-a', 601000);
  const edited = structuredClone(claimed);
  edited.foods[0]!.name = 'Different unknown';
  const next = scheduleClassification(claimed, edited, 620000);
  expect(next.classificationJob?.lease).toBe('lease-a');
  expect(next.classificationJob?.generation).toBe(2);
  const later = structuredClone(next);
  later.foods[0]!.name = 'Another unknown';
  expect(scheduleClassification(next, later, 1799000).classificationJob?.dueAt).toBe(1801000);
});
it('recovers an expired lease after closure and rejects overlapping invocations', () => {
  const data = claimJob(queued(), 'lease-a', 601000);
  expect(claimJob(data, 'lease-b', 620000)).toBe(data);
  expect(classificationIndex(data).classificationDue).toBe(661000);
  expect(claimJob(data, 'lease-b', 661001).classificationJob?.lease).toBe('lease-b');
});
it('does not erase later edits when an older generation completes', () => {
  const claimed = claimJob(queued(), 'lease-a', 601000);
  const target = classificationTargets(claimed)[0]!;
  const saved: SavedStandardization = {
    version: '1',
    fingerprint: target.fingerprint,
    source: 'ai-private',
    status: 'recognized',
    identity: 'rice',
    preparation: 'dry',
    reason: '',
  };
  const edited = structuredClone(claimed);
  edited.foods[0]!.name = 'New unknown item';
  const next = scheduleClassification(claimed, edited, 620000);
  const finished = finishJob(
    next,
    { lease: 'lease-a', generation: 1, results: new Map([[target.key, saved]]) },
    630000,
  );
  expect(finished.foods[0]!.standardization).toBeUndefined();
  expect(finished.classificationJob?.generation).toBe(2);
  expect(finished.classificationJob?.dueAt).toBe(next.classificationJob?.dueAt);
  expect(finished.classificationJob?.lease).toBeUndefined();
});
it('keeps quota retries durable without spending retry attempts and pauses suspended accounts', () => {
  const data = claimJob(queued(), 'lease-a', 601000);
  const limited = failJob(data, 'lease-a', new ProductError(429, 'limit'), 602000);
  expect(limited.classificationJob?.attempts).toBe(0);
  expect(limited.classificationJob?.dueAt).toBe(86460000);
  const paused = failJob(data, 'lease-a', new AccessError(403, 'suspended'), 602000);
  expect(paused.classificationJob?.state).toBe('paused');
  expect(classificationIndex(paused)).toEqual({});
});
it('stops transient retries after three failed attempts without weakening quota gates', () => {
  let data = queued();
  for (let attempt = 0; attempt < 3; attempt++) {
    const now = data.classificationJob!.dueAt;
    data = failJob(claimJob(data, 'lease', now), 'lease', new Error('transport'), now);
  }
  expect(data.classificationJob?.state).toBe('failed');
  expect(classificationIndex(data)).toEqual({});
});
it('does not charge a newer edit with an older generation failure', () => {
  const claimed = claimJob(queued(), 'lease-a', 601000);
  const edited = structuredClone(claimed);
  edited.foods[0]!.name = 'New unknown item';
  const next = scheduleClassification(claimed, edited, 620000);
  const failed = failJob(next, { lease: 'lease-a', generation: 1 }, new Error('transport'), 630000);
  expect(failed.classificationJob).toMatchObject({
    state: 'queued',
    attempts: 0,
    generation: 2,
    dueAt: next.classificationJob!.dueAt,
  });
  expect(failed.classificationJob?.lease).toBeUndefined();
});
