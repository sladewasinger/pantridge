import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { accessDb, accessTable, conditionalFailure, deadline, getRecord } from './store';
import { AccessError, assertActive, assertEnabled, limit } from './config';

export async function reserveIdentity(username: string): Promise<void> {
  assertEnabled();
  if (!username.startsWith('Google_')) throw new AccessError(403, 'Sign in with Google.');
  const pk = `identity#${username}`;
  const existing = await getRecord(pk);
  if (existing) {
    assertActive(existing.status);
    return;
  }
  try {
    await accessDb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: accessTable(),
              Key: { pk: 'capacity' },
              UpdateExpression: 'ADD used :one',
              ConditionExpression: 'attribute_not_exists(used) OR used < :limit',
              ExpressionAttributeValues: { ':one': 1, ':limit': limit('MAX_USERS', 100) },
            },
          },
          {
            Put: {
              TableName: accessTable(),
              Item: { pk, status: 'active', createdAt: new Date().toISOString() },
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
        ],
      }),
      deadline(),
    );
  } catch (error) {
    if (!conditionalFailure(error)) throw error;
    const raced = await getRecord(pk);
    if (raced) {
      assertActive(raced.status);
      return;
    }
    throw new AccessError(
      403,
      'Pantridge is at its user limit. You can still use it without signing in.',
    );
  }
}

export async function admitAccount(owner: string, username?: string): Promise<void> {
  assertEnabled();
  const existing = await getRecord(`account#${owner}`);
  if (existing) {
    assertActive(existing.status);
    return;
  }
  if (!username) throw new AccessError(401, 'Sign in again to enable protected cloud access.');
  await reserveIdentity(username);
  try {
    await accessDb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: accessTable(),
              Key: { pk: `identity#${username}` },
              UpdateExpression: 'SET #owner = :owner',
              ConditionExpression:
                '#status = :active AND (attribute_not_exists(#owner) OR #owner = :owner)',
              ExpressionAttributeNames: { '#status': 'status', '#owner': 'owner' },
              ExpressionAttributeValues: { ':owner': owner, ':active': 'active' },
            },
          },
          {
            Put: {
              TableName: accessTable(),
              Item: { pk: `account#${owner}`, identity: username, status: 'active' },
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
        ],
      }),
      deadline(),
    );
  } catch (error) {
    if (!conditionalFailure(error)) throw error;
    const raced = await getRecord(`account#${owner}`);
    if (!raced) throw new AccessError(403, 'This identity needs review by the app owner.');
    assertActive(raced.status);
  }
}
