import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { AccessError } from './config';

export const accessDb = DynamoDBDocumentClient.from(new DynamoDBClient({ maxAttempts: 1 }));
export function accessTable() {
  if (!process.env.ACCESS_TABLE) throw new Error('Account protection is not configured.');
  return process.env.ACCESS_TABLE;
}
export const deadline = () => ({ abortSignal: AbortSignal.timeout(2000) });
export async function getRecord(pk: string) {
  const result = await accessDb.send(
    new GetCommand({ TableName: accessTable(), Key: { pk }, ConsistentRead: true }),
    deadline(),
  );
  return result.Item;
}
export function conditionalFailure(error: unknown) {
  return (
    error instanceof Error &&
    ['ConditionalCheckFailedException', 'TransactionCanceledException'].includes(error.name)
  );
}
export async function countRequest(
  pk: string,
  ttl: number,
  cap?: number,
  weight = 1,
): Promise<number> {
  if (cap && weight > cap) throw new AccessError(429, 'Daily cloud limit reached.', 86400);
  try {
    const result = await accessDb.send(
      new UpdateCommand({
        TableName: accessTable(),
        Key: { pk },
        UpdateExpression: 'SET #ttl = :ttl ADD used :one',
        ExpressionAttributeNames: { '#ttl': 'ttl' },
        ExpressionAttributeValues: {
          ':ttl': ttl,
          ':one': weight,
          ...(cap ? { ':cap': cap - weight } : {}),
        },
        ...(cap ? { ConditionExpression: 'attribute_not_exists(used) OR used <= :cap' } : {}),
        ReturnValues: 'UPDATED_NEW',
      }),
      deadline(),
    );
    const used = Number(result.Attributes?.used);
    if (!Number.isSafeInteger(used) || used < 1) throw new Error('Invalid quota counter response.');
    return used;
  } catch (error) {
    if (conditionalFailure(error))
      throw new AccessError(
        429,
        'Daily cloud limit reached. Your edits remain on this device.',
        86400 - (Math.floor(Date.now() / 1000) % 86400),
      );
    throw error;
  }
}
