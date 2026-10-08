import type { StandardizationResult } from '../../src/domain/standardization/model';
import { ProductError } from '../products/errors';
import { AccessError } from '../access/config';

type Outcome = 'success' | 'failed' | 'timeout' | 'quota' | 'busy' | 'paused';
type Metric = {
  event: 'cache' | 'provider' | 'worker' | 'review';
  source: 'sync' | 'lookup' | 'resolve' | 'worker' | 'provider';
  outcome: Outcome;
  hits?: number;
  misses?: number;
  durationMs?: number;
  queueAgeMs?: number;
  retries?: number;
  clarifications?: number;
  results?: readonly StandardizationResult[];
};
const bounded = (value = 0, maximum = 25) =>
  Number.isFinite(value) ? Math.max(0, Math.min(maximum, Math.floor(value))) : 0;
export function failureOutcome(error: unknown): Outcome {
  if (error instanceof ProductError || error instanceof AccessError) {
    if (error.status === 429) return 'quota';
    if (error.status === 409) return 'busy';
    if ([401, 403].includes(error.status)) return 'paused';
  }
  return 'failed';
}
export function classificationMetric(metric: Metric) {
  // Explicit numeric projection: never log account IDs, evidence, reasons or error text.
  const statuses = ['recognized', 'uncertain', 'unknown', 'taxonomy-gap', 'composite', 'nonfood'];
  console.log(
    JSON.stringify({
      metric: 'FoodRecognition',
      event: metric.event,
      source: metric.source,
      outcome: metric.outcome,
      hits: bounded(metric.hits),
      misses: bounded(metric.misses),
      durationMs: bounded(metric.durationMs, 60000),
      queueAgeMs: bounded(metric.queueAgeMs, 7 * 86400000),
      retries: bounded(metric.retries, 3),
      clarifications: bounded(metric.clarifications, 1),
      failures: metric.outcome === 'success' ? 0 : 1,
      statuses: Object.fromEntries(
        statuses.map((status) => [
          status,
          bounded(metric.results?.filter((result) => result.status === status).length),
        ]),
      ),
    }),
  );
}
