import { expect, it } from 'vitest';
import {
  classificationBatch,
  classificationRequest,
} from '../../../src/domain/standardization/batch';
import { standardizationRequestSchema } from '../../../src/domain/standardization/model';
import type { ClassificationTarget } from '../../../src/domain/standardization/targets';

const targets = (details = ''): ClassificationTarget[] =>
  Array.from({ length: 26 }, (_, index) => ({
    key: `food:${index}`,
    fingerprint: 'a'.repeat(64),
    evidence: { name: `Unfamiliar product ${index}`, brand: '', context: 'product', details },
  }));
it('bounds requests at 25 and keeps the original ordered targets', () => {
  const all = targets();
  const selected = classificationBatch(all);
  expect(selected).toEqual(all.slice(0, 25));
  expect(standardizationRequestSchema.safeParse(classificationRequest(selected)).success).toBe(
    true,
  );
  expect(standardizationRequestSchema.safeParse(classificationRequest(all)).success).toBe(false);
  expect(classificationBatch([])).toEqual([]);
});
it('counts UTF-8 bytes, preserves metadata and leaves large items for subsequent batches', () => {
  const all = targets('米'.repeat(1500));
  const selected = classificationBatch(all);
  const bytes = (items: ClassificationTarget[]) =>
    new TextEncoder().encode(JSON.stringify(classificationRequest(items))).length;
  expect(selected.length).toBeGreaterThan(0);
  expect(selected.length).toBeLessThan(25);
  expect(bytes(selected)).toBeLessThanOrEqual(16_384);
  expect(bytes(all.slice(0, selected.length + 1))).toBeGreaterThan(16_384);
  expect(selected).toEqual(all.slice(0, selected.length));
  expect(classificationBatch(all.slice(selected.length))[0]).toEqual(all[selected.length]);
});
