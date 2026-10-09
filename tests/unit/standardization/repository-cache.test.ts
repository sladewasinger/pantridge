import { standardizationVersion } from '../../../src/domain/standardization/model';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import type * as DocumentSdk from '@aws-sdk/lib-dynamodb';
import { kitchen, lotId } from '../fixtures';
import { recognitionReviews } from '../../../src/domain/standardization/review';
import { evidenceFingerprint, foodEvidence } from '../../../src/domain/standardization/evidence';
import { snapshotSchema } from '../../../src/domain/model';
const mocks = vi.hoisted(() => ({ send: vi.fn(), reuseClassificationCache: vi.fn() }));
vi.mock('@aws-sdk/lib-dynamodb', async (original) => ({
  ...(await original<typeof DocumentSdk>()),
  DynamoDBDocumentClient: { from: () => ({ send: mocks.send }) },
}));
vi.mock('../../../api/access/write-budget', () => ({ reserveWriteBudget: vi.fn() }));
vi.mock('../../../api/standardization/sync-cache', () => mocks);
import { mutate, read } from '../../../api/repository';
beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv('TABLE_NAME', 'test');
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  mocks.reuseClassificationCache.mockImplementation(async (_owner, _before, saved) => saved);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
it('saves the edit and receipt before cache enrichment and returns its newer revision', async () => {
  const current = { revision: 3, data: kitchen() };
  mocks.send
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({ Item: current })
    .mockResolvedValueOnce({});
  mocks.reuseClassificationCache.mockImplementation(async (_owner, _before, saved) => {
    expect(mocks.send.mock.calls[2]![0]).toBeInstanceOf(TransactWriteCommand);
    return { ...saved, revision: 5 };
  });
  const result = await mutate('owner', {
    id: crypto.randomUUID(),
    command: { type: 'stock.adjust', stockId: lotId, delta: 1 },
  });
  expect(result.revision).toBe(5);
  expect(result.data.stock[0]!.quantity).toBe(3);
});
it('does not fail an acknowledged edit if the optional enrichment unexpectedly rejects', async () => {
  mocks.send
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({ Item: { revision: 3, data: kitchen() } })
    .mockResolvedValueOnce({});
  mocks.reuseClassificationCache.mockRejectedValue(new Error('cache unavailable'));
  const result = await mutate('owner', {
    id: crypto.randomUUID(),
    command: { type: 'stock.adjust', stockId: lotId, delta: 1 },
  });
  expect(result.revision).toBe(4);
  expect(result.data.stock[0]!.quantity).toBe(3);
});
it('GET and duplicate mutation receipts do not retry cache enrichment', async () => {
  const current = { revision: 3, data: { ...kitchen(), starterVersion: 1 } };
  mocks.send.mockResolvedValueOnce({ Item: current });
  await read('owner');
  mocks.send
    .mockResolvedValueOnce({ Item: { appliedAt: 'now' } })
    .mockResolvedValueOnce({ Item: current });
  await mutate('owner', {
    id: crypto.randomUUID(),
    command: { type: 'stock.adjust', stockId: lotId, delta: 1 },
  });
  expect(mocks.reuseClassificationCache).not.toHaveBeenCalled();
});
it('counts a successful clarification once without logging its private target or evidence', async () => {
  const data = kitchen();
  data.foods[0] = { ...data.foods[0]!, name: 'PRIVATE GROCERY' };
  const food = data.foods[0]!;
  food.standardization = {
    fingerprint: evidenceFingerprint(foodEvidence(food)),
    version: standardizationVersion,
    source: 'ai-private',
    status: 'unknown',
    identity: null,
    preparation: 'unknown',
    reason: 'PRIVATE REASON',
  };
  const review = recognitionReviews(snapshotSchema.parse(data))[0]!;
  mocks.send
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({ Item: { revision: 3, data } })
    .mockResolvedValueOnce({});
  const mutation = {
    id: crypto.randomUUID(),
    command: {
      type: 'classification.review' as const,
      key: review.key,
      expected: review.signature,
      ingredient: { id: 'rice', preparation: 'dry' as const, basis: 'as-sold' as const },
    },
  };
  const saved = await mutate('PRIVATE OWNER', mutation);
  expect(saved.data.foods[0]!.ingredient?.id).toBe('rice');
  const record = vi.mocked(console.log).mock.calls[0]![0] as string;
  expect(JSON.parse(record)).toMatchObject({ event: 'review', clarifications: 1 });
  expect(record).not.toContain('PRIVATE');
  expect(record).not.toContain(review.key);
  mocks.send
    .mockResolvedValueOnce({ Item: { appliedAt: 'now' } })
    .mockResolvedValueOnce({ Item: saved });
  await mutate('PRIVATE OWNER', mutation);
  expect(console.log).toHaveBeenCalledTimes(1);
});
