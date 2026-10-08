import type { Snapshot } from '../../src/domain/model';
import type { SavedStandardization } from '../../src/domain/standardization/model';
import {
  classificationTargets,
  applyClassifications,
} from '../../src/domain/standardization/targets';
import { classificationInput } from './schedule';
import { ProductError } from '../products/errors';
import { AccessError } from '../access/config';

export function claimJob(data: Snapshot, lease: string, now: number): Snapshot {
  const job = data.classificationJob;
  if (
    !job ||
    ['failed', 'paused'].includes(job.state) ||
    job.dueAt > now ||
    (job.leaseUntil ?? 0) > now
  )
    return data;
  return {
    ...data,
    classificationJob: { ...job, state: 'processing', lease, leaseUntil: now + 60_000 },
  };
}
export function finishJob(
  data: Snapshot,
  work: { lease: string; generation: number; results: Map<string, SavedStandardization> },
  now: number,
): Snapshot {
  const job = data.classificationJob;
  if (job?.lease !== work.lease) return data;
  const next = applyClassifications(data, work.results);
  const pending = classificationTargets(next).length;
  return {
    ...next,
    classificationJob: pending
      ? {
          ...job,
          state: 'queued',
          lease: undefined,
          leaseUntil: undefined,
          attempts: 0,
          input: classificationInput(next),
          dueAt: job.generation === work.generation ? now + 60_000 : job.dueAt,
        }
      : undefined,
  };
}
export function failJob(
  data: Snapshot,
  work: string | { lease: string; generation: number },
  error: unknown,
  now: number,
): Snapshot {
  const job = data.classificationJob;
  const { lease, generation } =
    typeof work === 'string' ? { lease: work, generation: undefined } : work;
  if (job?.lease !== lease) return data;
  if (generation !== undefined && job.generation !== generation)
    return {
      ...data,
      classificationJob: { ...job, state: 'queued', lease: undefined, leaseUntil: undefined },
    };
  const quota =
    (error instanceof ProductError || error instanceof AccessError) && error.status === 429;
  const busy = error instanceof ProductError && error.status === 409;
  const attempts = job.attempts + (quota || busy ? 0 : 1);
  const paused = error instanceof AccessError && [401, 403].includes(error.status);
  const dueAt = quota
    ? (Math.floor(now / 86400_000) + 1) * 86400_000 + 60_000
    : now + 60_000 * 2 ** attempts;
  return {
    ...data,
    classificationJob: {
      ...job,
      state: paused ? 'paused' : attempts >= 3 ? 'failed' : 'retry',
      attempts,
      dueAt,
      lease: undefined,
      leaseUntil: undefined,
    },
  };
}
