import { beforeEach, expect, it, vi } from 'vitest';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import type * as DocumentSdk from '@aws-sdk/lib-dynamodb';
import { kitchen } from '../fixtures';
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('@aws-sdk/lib-dynamodb', async (original) => ({
  ...(await original<typeof DocumentSdk>()),
  DynamoDBDocumentClient: { from: () => ({ send }) },
}));
vi.mock('../../../api/access/write-budget', () => ({ reserveWriteBudget: vi.fn() }));
import { changeStored } from '../../../api/kitchen-storage';
beforeEach(() => {
  send.mockReset();
  vi.stubEnv('TABLE_NAME', 'test-kitchen');
  vi.stubEnv('ACCESS_TABLE', 'test-access');
});
it('atomically binds classification writes to revision, active owner and active identity', async () => {
  send.mockResolvedValueOnce({ Item: { revision: 4, data: kitchen() } }).mockResolvedValueOnce({});
  await changeStored('owner', (data) => ({ ...data }), 'Google_owner');
  const transaction = send.mock.calls[1]![0] as TransactWriteCommand;
  expect(transaction).toBeInstanceOf(TransactWriteCommand);
  expect(transaction.input.TransactItems?.[0]?.Put).toMatchObject({
    ConditionExpression: 'revision = :previous',
    ExpressionAttributeValues: { ':previous': 4 },
  });
  expect(transaction.input.TransactItems?.slice(1).map((item) => item.ConditionCheck)).toEqual([
    expect.objectContaining({
      Key: { pk: 'account#owner' },
      ConditionExpression: '#status = :active AND #identity = :identity',
      ExpressionAttributeValues: { ':active': 'active', ':identity': 'Google_owner' },
    }),
    expect.objectContaining({
      Key: { pk: 'identity#Google_owner' },
      ConditionExpression: '#status = :active AND #owner = :owner',
      ExpressionAttributeValues: { ':active': 'active', ':owner': 'owner' },
    }),
  ]);
});
it('cannot fall back to an unconditional write after suspension rejects the transaction', async () => {
  send.mockImplementation(async (command) => {
    if (command instanceof TransactWriteCommand)
      throw Object.assign(new Error('suspended'), { name: 'TransactionCanceledException' });
    return { Item: { revision: 4, data: kitchen() } };
  });
  await expect(changeStored('owner', (data) => ({ ...data }), 'Google_owner')).rejects.toThrow(
    'Kitchen changed',
  );
  expect(
    send.mock.calls.filter(([command]) => command instanceof TransactWriteCommand),
  ).toHaveLength(5);
  expect(
    send.mock.calls.every(([command]) =>
      ['GetCommand', 'TransactWriteCommand'].includes(command.constructor.name),
    ),
  ).toBe(true);
});
