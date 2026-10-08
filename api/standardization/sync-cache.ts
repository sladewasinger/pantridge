import type { Envelope, Snapshot } from '../../src/domain/model';
import {
  applyClassifications,
  classificationTargets,
} from '../../src/domain/standardization/targets';
import { classificationBatch } from '../../src/domain/standardization/batch';
import {
  resultSchema,
  standardizationVersion,
  type SavedStandardization,
} from '../../src/domain/standardization/model';
import { cachedResult } from '../products/cache';
import { activeWorkerAccount } from '../access/worker-access';
import { assertEnabled } from '../access/config';
import { changeStored } from '../kitchen-storage';
import { cacheInput } from './cache-input';
import { classificationInput, scheduleClassification } from './schedule';
import { classificationMetric, failureOutcome } from './metrics';

export function applyCachedClassifications(
  data: Snapshot,
  results: Map<string, SavedStandardization>,
): Snapshot {
  const next = applyClassifications(data, results);
  if (next === data) return data;
  if (!classificationTargets(next).length) return { ...next, classificationJob: undefined };
  const job = data.classificationJob;
  return job
    ? {
        ...next,
        classificationJob: {
          ...job,
          input: classificationInput(next),
          generation: job.generation + 1,
        },
      }
    : scheduleClassification(data, next, Date.now());
}
export async function reuseClassificationCache(
  owner: string,
  previous: Snapshot,
  saved: Envelope,
): Promise<Envelope> {
  if (process.env.STANDARDIZATION_ENABLED !== 'true') return saved;
  const old = new Map(classificationTargets(previous).map((item) => [item.key, item.fingerprint]));
  const targets = classificationBatch(
    classificationTargets(saved.data).filter((item) => old.get(item.key) !== item.fingerprint),
  );
  if (!targets.length) return saved;
  const started = Date.now();
  const signal = AbortSignal.timeout(750);
  let hits = 0;
  const enrich = async () => {
    const results = new Map<string, SavedStandardization>();
    await Promise.all(
      targets.map(async (target) => {
        const input = await cacheInput(owner, target, signal);
        signal.throwIfAborted();
        const result = await cachedResult(input.key, resultSchema, signal);
        if (result && input.barcode) {
          const current = await cacheInput(owner, target, signal);
          if (current.key !== input.key || current.source !== input.source) return;
        }
        signal.throwIfAborted();
        if (result)
          results.set(target.key, {
            ...result,
            source: input.source,
            fingerprint: target.fingerprint,
            version: standardizationVersion,
          });
      }),
    );
    hits = results.size;
    signal.throwIfAborted();
    if (!hits) return saved;
    const identity = await activeWorkerAccount(owner, signal);
    assertEnabled();
    return changeStored(owner, (data) => applyCachedClassifications(data, results), identity, {
      signal,
      attempts: 1,
    });
  };
  let expired: (() => void) | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    expired = () => reject(signal.reason);
    signal.addEventListener('abort', expired, { once: true });
  });
  try {
    const next = await Promise.race([enrich(), timeout]);
    classificationMetric({
      event: 'cache',
      source: 'sync',
      outcome: 'success',
      hits,
      misses: targets.length - hits,
      durationMs: Date.now() - started,
    });
    return next;
  } catch (error) {
    classificationMetric({
      event: 'cache',
      source: 'sync',
      outcome: signal.aborted ? 'timeout' : failureOutcome(error),
      hits,
      misses: targets.length - hits,
      durationMs: Date.now() - started,
    });
    return saved;
  } finally {
    if (expired) signal.removeEventListener('abort', expired);
  }
}
