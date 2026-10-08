import { afterEach, expect, it, vi } from 'vitest';
import { classificationMetric, failureOutcome } from '../../../api/standardization/metrics';
import { ProductError } from '../../../api/products/errors';
import { AccessError } from '../../../api/access/config';
afterEach(() => vi.restoreAllMocks());
it('logs only bounded aggregate numbers and fixed status buckets', () => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  classificationMetric({
    event: 'provider',
    source: 'worker',
    outcome: 'success',
    hits: 999,
    misses: -2,
    durationMs: Infinity,
    queueAgeMs: 999999999999,
    retries: 99,
    results: [
      { status: 'unknown', identity: null, preparation: 'unknown', reason: 'PRIVATE REASON' },
    ],
  });
  const serialized = log.mock.calls[0]![0] as string;
  expect(serialized).not.toContain('PRIVATE REASON');
  expect(JSON.parse(serialized)).toEqual({
    metric: 'FoodRecognition',
    event: 'provider',
    source: 'worker',
    outcome: 'success',
    hits: 25,
    misses: 0,
    durationMs: 0,
    queueAgeMs: 604800000,
    retries: 3,
    clarifications: 0,
    failures: 0,
    statuses: {
      recognized: 0,
      uncertain: 0,
      unknown: 1,
      'taxonomy-gap': 0,
      composite: 0,
      nonfood: 0,
    },
  });
});
it('reduces private provider errors to a fixed outcome without message or name', () => {
  expect(failureOutcome(new Error('private-owner and private food'))).toBe('failed');
  expect(failureOutcome(new ProductError(429, 'private quota'))).toBe('quota');
  expect(failureOutcome(new ProductError(409, 'private lease'))).toBe('busy');
  expect(failureOutcome(new AccessError(403, 'private account'))).toBe('paused');
});
