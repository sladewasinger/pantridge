import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { lookupSchema, type Lookup } from '../../src/domain/products/lookup';
import { ProductError } from './errors';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const table = () => process.env.PRODUCT_TABLE;
export async function cachedProduct(key: string): Promise<Lookup | null> {
  const { Item } = await client.send(new GetCommand({ TableName: table(), Key: { pk: key } }));
  if (!Item || Number(Item.ttl) <= Date.now() / 1000) return null;
  const result = lookupSchema.safeParse(Item.result);
  return result.success ? result.data : null;
}
export async function cacheProduct(key: string, result: Lookup): Promise<void> {
  const days = result.found ? 30 : 1;
  await client.send(
    new PutCommand({
      TableName: table(),
      Item: {
        pk: key,
        result,
        ttl: Math.floor(Date.now() / 1000) + days * 86400,
      },
    }),
  );
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
