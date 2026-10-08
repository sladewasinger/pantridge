import { beforeEach, expect, it, vi } from 'vitest';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import type * as DocumentSdk from '@aws-sdk/lib-dynamodb';
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('@aws-sdk/lib-dynamodb', async (original) => ({
  ...(await original<typeof DocumentSdk>()),
  DynamoDBDocumentClient: { from: () => ({ send }) },
}));
import { cacheCatalogEvidence } from '../../../api/products/cache';
const barcode = '00012345678905';
const evidence = {
  name: 'Brown rice',
  brand: 'Brand',
  details: 'cooked rice',
  context: 'product' as const,
  sourceId: barcode,
};
const raw = {
  product: { barcode, name: evidence.name, brand: evidence.brand },
  found: true,
  suggestion: { name: 'Rice', location: 'pantry', unit: 'bags', art: 'rice' },
  packageText: '',
  source: 'openfoodfacts',
  classifiedBy: 'rules',
  categoryHints: evidence.details,
};
beforeEach(() => {
  send.mockReset();
  vi.stubEnv('PRODUCT_TABLE', 'test-products');
  send.mockImplementation(async (command) =>
    command instanceof TransactWriteCommand
      ? {}
      : { Item: { result: raw, ttl: Date.now() / 1000 + 100 } },
  );
});
it('does not roll back newer barcode evidence when the older classification completes last', async () => {
  await cacheCatalogEvidence(barcode, evidence);
  await cacheCatalogEvidence(barcode, { ...evidence, details: 'dry rice' });
  const writes = send.mock.calls.filter(([command]) => command instanceof TransactWriteCommand);
  expect(writes).toHaveLength(1);
  expect(writes[0]![0].input.TransactItems[0].ConditionCheck).toMatchObject({
    Key: { pk: `product#raw-v2#${barcode}` },
    ConditionExpression: '#result = :raw AND #ttl > :now',
    ExpressionAttributeValues: { ':raw': raw },
  });
  expect(writes[0]![0].input.TransactItems[1].Put.Item.result.evidence).toEqual(evidence);
});
it('retains the winning pointer if raw metadata changes between read and commit', async () => {
  send.mockImplementation(async (command) => {
    if (command instanceof TransactWriteCommand)
      throw Object.assign(new Error('newer raw metadata'), {
        name: 'TransactionCanceledException',
      });
    return { Item: { result: raw, ttl: Date.now() / 1000 + 100 } };
  });
  await expect(cacheCatalogEvidence(barcode, evidence)).resolves.toBeUndefined();
  expect(send).toHaveBeenCalledTimes(2);
});
