import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { lookupSchema, type Lookup } from '../../src/domain/products/lookup';
import { ProductError } from './errors';
import type { z } from 'zod';
import type { Evidence } from '../../src/domain/standardization/model';
import { matchesPublicEvidence } from '../standardization/public-evidence';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const table = () => process.env.PRODUCT_TABLE;
export async function cachedProduct(key: string): Promise<Lookup | null> {
  return cachedResult(key, lookupSchema);
}
export async function cachedResult<T>(key: string, schema: z.ZodType<T>): Promise<T | null> {
  const { Item } = await client.send(new GetCommand({ TableName: table(), Key: { pk: key } }));
  if (!Item || Number(Item.ttl) <= Date.now() / 1000) return null;
  const result = schema.safeParse(Item.result);
  return result.success ? result.data : null;
}
export async function cacheProduct(key: string, result: Lookup): Promise<void> {
  const days = result.found ? 30 : 1;
  return cacheResult(key, result, days);
}
export async function cacheCatalogEvidence(barcode: string, evidence: Evidence): Promise<void> {
  const rawKey = `product#raw-v2#${barcode}`;
  const raw = await cachedProduct(rawKey);
  if (!matchesPublicEvidence(raw, evidence)) return;
  const now = Math.floor(Date.now() / 1000);
  try {
    await client.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            ConditionCheck: {
              TableName: table(),
              Key: { pk: rawKey },
              ConditionExpression: '#result = :raw AND #ttl > :now',
              ExpressionAttributeNames: { '#result': 'result', '#ttl': 'ttl' },
              ExpressionAttributeValues: { ':raw': raw, ':now': now },
            },
          },
          {
            Put: {
              TableName: table(),
              Item: {
                pk: `catalog-evidence#${barcode}`,
                result: { source: 'openfoodfacts', evidence },
                ttl: now + 365 * 86400,
              },
            },
          },
        ],
      }),
    );
  } catch (error) {
    if (!(error instanceof Error) || error.name !== 'TransactionCanceledException') throw error;
    // A newer source record won. Keep its pointer; immutable versioned results remain reusable.
  }
}
export async function cacheResult(
  key: string,
  result: unknown,
  days: number,
  metadata: Record<string, string> = {},
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: table(),
      Item: {
        pk: key,
        result,
        ...metadata,
        ttl: Math.floor(Date.now() / 1000) + days * 86400,
      },
    }),
  );
}
export async function claimCache(key: string): Promise<boolean> {
  try {
    await client.send(
      new UpdateCommand({
        TableName: table(),
        Key: { pk: `lease#${key}` },
        UpdateExpression: 'SET #ttl = :until',
        ConditionExpression: 'attribute_not_exists(#ttl) OR #ttl < :now',
        ExpressionAttributeNames: { '#ttl': 'ttl' },
        ExpressionAttributeValues: {
          ':until': Math.floor(Date.now() / 1000) + 60,
          ':now': Math.floor(Date.now() / 1000),
        },
      }),
    );
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') return false;
    throw error;
  }
}
export async function findCatalog(nameKey: string): Promise<unknown[]> {
  const { Items } = await client.send(
    new QueryCommand({
      TableName: table(),
      IndexName: 'classification-name',
      KeyConditionExpression: 'classificationName = :name',
      ExpressionAttributeValues: { ':name': nameKey },
      Limit: 10,
    }),
  );
  return (Items ?? [])
    .filter((item) => Number(item.ttl) > Date.now() / 1000)
    .map((item) => item.result);
}
export async function takeQuota(key: string, limit: number): Promise<void> {
  if (limit <= 0) throw new ProductError(429, 'Daily limit reached.');
  try {
    await client.send(
      new UpdateCommand({
        TableName: table(),
        Key: { pk: `quota#${key}#${new Date().toISOString().slice(0, 10)}` },
        UpdateExpression: 'SET #ttl = :ttl ADD #used :one',
        ConditionExpression: 'attribute_not_exists(#used) OR #used < :limit',
        ExpressionAttributeNames: { '#used': 'used', '#ttl': 'ttl' },
        ExpressionAttributeValues: {
          ':one': 1,
          ':limit': limit,
          ':ttl': Math.floor(Date.now() / 1000) + 172800,
        },
      }),
    );
  } catch (error) {
    quotaError(error);
  }
}
export async function takeLookupSlot(): Promise<void> {
  try {
    await client.send(
      new UpdateCommand({
        TableName: table(),
        Key: { pk: 'upstream#openfoodfacts' },
        UpdateExpression: 'SET nextAllowed = :next',
        ConditionExpression: 'attribute_not_exists(nextAllowed) OR nextAllowed <= :now',
        ExpressionAttributeValues: { ':now': Date.now(), ':next': Date.now() + 4300 },
      }),
    );
  } catch (error) {
    quotaError(error, 'Lookup is busy. Try again in a few seconds.');
  }
}
function quotaError(
  error: unknown,
  message = 'Daily scanning limit reached. You can still add food manually.',
): never {
  if (error instanceof Error && error.name === 'ConditionalCheckFailedException')
    throw new ProductError(429, message);
  throw error;
}
