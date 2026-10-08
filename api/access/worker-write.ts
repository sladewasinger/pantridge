import { accessTable } from './store';
import type { TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
export function activeAccountChecks(
  owner: string,
  identity: string,
): NonNullable<TransactWriteCommandInput['TransactItems']> {
  return [
    {
      ConditionCheck: {
        TableName: accessTable(),
        Key: { pk: `account#${owner}` },
        ConditionExpression: '#status = :active AND #identity = :identity',
        ExpressionAttributeNames: { '#status': 'status', '#identity': 'identity' },
        ExpressionAttributeValues: { ':active': 'active', ':identity': identity },
      },
    },
    {
      ConditionCheck: {
        TableName: accessTable(),
        Key: { pk: `identity#${identity}` },
        ConditionExpression: '#status = :active AND #owner = :owner',
        ExpressionAttributeNames: { '#status': 'status', '#owner': 'owner' },
        ExpressionAttributeValues: { ':active': 'active', ':owner': owner },
      },
    },
  ];
}
