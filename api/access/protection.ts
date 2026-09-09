import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { admitAccount } from './admission';
import { AccessError, limit } from './config';
import { accessDb, accessTable, countRequest, deadline, getRecord } from './store';

async function suspend(owner: string, reason: string): Promise<never> {
  const account = await getRecord(`account#${owner}`);
  if (!account?.identity) throw new Error('Missing admitted account.');
  const updates = [`account#${owner}`, `identity#${String(account.identity)}`].map((pk) => ({
    Update: {
      TableName: accessTable(),
      Key: { pk },
      UpdateExpression: 'SET #status = :status, reason = :reason, suspendedAt = :now',
      ConditionExpression: 'attribute_exists(pk)',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'suspended',
        ':reason': reason,
        ':now': new Date().toISOString(),
      },
    },
  }));
  await accessDb.send(new TransactWriteCommand({ TransactItems: updates }), deadline());
  console.warn('AccountSuspended', { owner, reason });
  throw new AccessError(
    403,
    'This account is suspended. Contact the app owner to restore cloud access.',
  );
}
export async function protectRequest(owner: string, username?: string): Promise<void> {
  await admitAccount(owner, username);
  const seconds = Math.floor(Date.now() / 1000);
  const minute = Math.floor(seconds / 60);
  const used = await countRequest(`minute#${owner}#${minute}`, seconds + 3600);
  if (used > limit('ABUSE_REQUESTS_PER_MINUTE', 600)) return suspend(owner, 'request-flood');
  const minuteLimit = limit('USER_REQUESTS_PER_MINUTE', 240);
  if (used === minuteLimit + 1) {
    const bursts = await countRequest(
      `bursts#${owner}#${Math.floor(seconds / 600)}`,
      seconds + 3600,
    );
    if (bursts >= 3) return suspend(owner, 'sustained-request-flood');
  }
  if (used > minuteLimit)
    throw new AccessError(429, 'Too many requests. Please wait a minute.', 60 - (seconds % 60));
  const day = Math.floor(seconds / 86400);
  await countRequest(
    `day#${owner}#${day}`,
    seconds + 172800,
    limit('USER_REQUESTS_PER_DAY', 10000),
  );
  await countRequest(`global#${day}`, seconds + 172800, limit('API_REQUESTS_PER_DAY', 100000));
}
export async function recordMalformed(owner: string): Promise<void> {
  const seconds = Math.floor(Date.now() / 1000);
  const used = await countRequest(`invalid#${owner}#${Math.floor(seconds / 600)}`, seconds + 3600);
  if (used >= limit('ABUSE_INVALID_REQUESTS', 10))
    return suspend(owner, 'repeated-malformed-requests');
}
