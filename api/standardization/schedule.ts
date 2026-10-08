import type { Snapshot } from '../../src/domain/model';
import { classificationTargets } from '../../src/domain/standardization/targets';
import { matchHash } from '../../src/domain/ingredient-matching/hash';

export function classificationInput(data: Snapshot): string {
  return matchHash(
    JSON.stringify(
      classificationTargets(data)
        .map(({ key, fingerprint }) => [key, fingerprint])
        .sort(),
    ),
  );
}
export function scheduleClassification(previous: Snapshot, data: Snapshot, now: number): Snapshot {
  if (process.env.STANDARDIZATION_ENABLED !== 'true') return data;
  if (!classificationTargets(data).length) return { ...data, classificationJob: undefined };
  const input = classificationInput(data);
  const job = previous.classificationJob;
  if (job?.input === input) return data;
  const firstQueuedAt = job?.firstQueuedAt ?? now;
  return {
    ...data,
    classificationJob: {
      state: 'queued',
      input,
      generation: (job?.generation ?? 0) + 1,
      firstQueuedAt,
      dueAt: Math.max(Math.min(now + 600_000, firstQueuedAt + 1800_000), job?.leaseUntil ?? 0),
      attempts: 0,
      lease: job?.lease,
      leaseUntil: job?.leaseUntil,
    },
  };
}
export function classificationIndex(data: Snapshot) {
  const job = data.classificationJob;
  return job && !['failed', 'paused'].includes(job.state)
    ? {
        classificationQueue: 'pending',
        classificationDue: Math.max(job.dueAt, job.leaseUntil ?? 0),
      }
    : {};
}
