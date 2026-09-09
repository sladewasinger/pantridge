import { TransactWriteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { accessDb, accessTable, deadline, getRecord } from '../../api/access/store';

export async function listAccounts() {
  const accounts = [];
  let cursor;
  do {
    const page = await accessDb.send(
      new ScanCommand({
        TableName: accessTable(),
        ExclusiveStartKey: cursor,
        FilterExpression: 'begins_with(pk, :prefix)',
        ExpressionAttributeValues: { ':prefix': 'account#' },
      }),
      deadline(),
    );
    accounts.push(...(page.Items ?? []));
    cursor = page.LastEvaluatedKey;
  } while (cursor);
  return { capacity: await getRecord('capacity'), accounts };
}
export async function setStatus(owner, status) {
  const account = await getRecord(`account#${owner}`);
  if (!account?.identity) throw new Error('Account not found.');
  const now = Math.floor(Date.now() / 1000);
  const changes = [`account#${owner}`, `identity#${account.identity}`].map((pk) => ({
    Update: {
      TableName: accessTable(),
      Key: { pk },
      ConditionExpression: 'attribute_exists(pk)',
      UpdateExpression: 'SET #status = :status REMOVE reason, suspendedAt',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status },
    },
  }));
  if (status === 'active')
    for (const pk of [
      `minute#${owner}#${Math.floor(now / 60)}`,
      `invalid#${owner}#${Math.floor(now / 600)}`,
      `bursts#${owner}#${Math.floor(now / 600)}`,
    ])
      changes.push({ Delete: { TableName: accessTable(), Key: { pk } } });
  await accessDb.send(new TransactWriteCommand({ TransactItems: changes }), deadline());
}
export async function releaseReservation(identity) {
  if (!identity?.startsWith('Google_'))
    throw new Error('Specify the exact reserved Google identity.');
  await accessDb.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: accessTable(),
            Key: { pk: `identity#${identity}` },
            ConditionExpression: 'attribute_exists(pk) AND attribute_not_exists(#owner)',
            ExpressionAttributeNames: { '#owner': 'owner' },
          },
        },
        {
          Update: {
            TableName: accessTable(),
            Key: { pk: 'capacity' },
            UpdateExpression: 'ADD used :minus',
            ConditionExpression: 'used >= :one',
            ExpressionAttributeValues: { ':minus': -1, ':one': 1 },
          },
        },
      ],
    }),
    deadline(),
  );
}
