import { randomUUID } from 'node:crypto';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { activeWorkerAccount } from '../access/worker-access';
import { AccessError, assertEnabled } from '../access/config';
import { changeStored, kitchenDb, kitchenTable } from '../kitchen-storage';
import { classificationTargets } from '../../src/domain/standardization/targets';
import {
  standardizationVersion,
  type SavedStandardization,
} from '../../src/domain/standardization/model';
import { resolveStandardization } from './resolve';
import { claimJob, finishJob, failJob } from './worker-state';
import { classificationBatch, classificationRequest } from '../../src/domain/standardization/batch';
import { classificationMetric, failureOutcome } from './metrics';

export async function processKitchen(owner: string): Promise<boolean> {
  assertEnabled();
  const identity = await activeWorkerAccount(owner);
  const lease = randomUUID();
  const claimed = await changeStored(owner, (data) => claimJob(data, lease, Date.now()), identity);
  const job = claimed.data.classificationJob;
  if (job?.lease !== lease) return false;
  const started = Date.now();
  try {
    const targets = classificationBatch(classificationTargets(claimed.data));
    const response = targets.length
      ? await resolveStandardization(owner, classificationRequest(targets))
      : { items: [] };
    const results = new Map<string, SavedStandardization>();
    for (const item of response.items) {
      if (!item.result) continue;
      results.set(item.key, {
        ...item.result,
        source: item.source,
        version: standardizationVersion,
        fingerprint: targets.find((target) => target.key === item.key)!.fingerprint,
      });
    }
    await activeWorkerAccount(owner);
    assertEnabled();
    await changeStored(
      owner,
      (data) => finishJob(data, { lease, generation: job.generation, results }, Date.now()),
      identity,
    );
    classificationMetric({
      event: 'worker',
      source: 'worker',
      outcome: 'success',
      queueAgeMs: started - job.firstQueuedAt,
      durationMs: Date.now() - started,
      retries: job.attempts,
      results: [...results.values()],
    });
  } catch (error) {
    const failed = await changeStored(owner, (data) =>
      failJob(data, { lease, generation: job.generation }, error, Date.now()),
    );
    classificationMetric({
      event: 'worker',
      source: 'worker',
      outcome: failureOutcome(error),
      queueAgeMs: started - job.firstQueuedAt,
      durationMs: Date.now() - started,
      retries: failed.data.classificationJob?.attempts,
    });
  }
  return true;
}
export async function handler(): Promise<void> {
  if (process.env.STANDARDIZATION_ENABLED !== 'true' || process.env.API_ENABLED === 'false') return;
  const { Items } = await kitchenDb.send(
    new QueryCommand({
      TableName: kitchenTable(),
      IndexName: 'classification-due',
      KeyConditionExpression: 'classificationQueue = :queue AND classificationDue <= :now',
      ExpressionAttributeValues: { ':queue': 'pending', ':now': Date.now() },
      Limit: 5,
    }),
  );
  for (const item of Items ?? []) {
    if (await tryKitchen(item.pk)) return;
  }
}
async function tryKitchen(key: unknown): Promise<boolean> {
  if (typeof key !== 'string' || !key.startsWith('user#')) return false;
  try {
    return await processKitchen(key.slice(5));
  } catch (error) {
    classificationMetric({ event: 'worker', source: 'worker', outcome: failureOutcome(error) });
    if (error instanceof AccessError && [401, 403].includes(error.status))
      await changeStored(key.slice(5), (data) =>
        data.classificationJob
          ? {
              ...data,
              classificationJob: {
                ...data.classificationJob,
                state: 'paused',
                lease: undefined,
                leaseUntil: undefined,
              },
            }
          : data,
      ).catch(() => undefined);
    return false;
  }
}
