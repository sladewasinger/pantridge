import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import type * as DocumentSdk from '@aws-sdk/lib-dynamodb';
import { admitAccount, reserveIdentity } from '../../../api/access/admission';
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('@aws-sdk/lib-dynamodb', async (original) => ({
  ...(await original<typeof DocumentSdk>()),
  DynamoDBDocumentClient: { from: () => ({ send }) },
}));
beforeEach(() => {
  send.mockReset();
  vi.stubEnv('ACCESS_TABLE', 'access');
});
afterEach(() => vi.unstubAllEnvs());
const conflict = () =>
  Object.assign(new Error('Conflict'), { name: 'TransactionCanceledException' });

it('reserves capacity and identity in one conditional transaction, then binds the verified subject', async () => {
  send.mockResolvedValue({});
  await admitAccount('verified-sub', 'Google_123');
  const reserve = send.mock.calls[2]![0] as TransactWriteCommand;
  expect(reserve).toBeInstanceOf(TransactWriteCommand);
  expect(reserve.input.TransactItems?.[0]?.Update).toMatchObject({
    Key: { pk: 'capacity' },
    ConditionExpression: 'attribute_not_exists(used) OR used < :limit',
    ExpressionAttributeValues: { ':one': 1, ':limit': 100 },
  });
  expect(reserve.input.TransactItems?.[1]?.Put?.ConditionExpression).toBe(
    'attribute_not_exists(pk)',
  );
  const bind = send.mock.calls[3]![0] as TransactWriteCommand;
  expect(bind.input.TransactItems?.[1]?.Put?.Item).toMatchObject({
    pk: 'account#verified-sub',
    identity: 'Google_123',
  });
  expect(bind.input.TransactItems?.[0]?.Update?.ConditionExpression).toContain('owner = :owner');
});
it('does not admit a new identity when capacity is exhausted', async () => {
  send.mockResolvedValueOnce({}).mockRejectedValueOnce(conflict()).mockResolvedValueOnce({});
  await expect(reserveIdentity('Google_new')).rejects.toThrow('user limit');
  expect(send).toHaveBeenCalledTimes(3);
});
it('handles concurrent signup retries without reserving a second slot', async () => {
  send
    .mockResolvedValueOnce({})
    .mockRejectedValueOnce(conflict())
    .mockResolvedValueOnce({ Item: { status: 'active' } });
  await expect(reserveIdentity('Google_same')).resolves.toBeUndefined();
  expect(
    send.mock.calls.filter(([command]) => command instanceof TransactWriteCommand),
  ).toHaveLength(1);
});
it('lets admitted users return at capacity and immediately rejects suspended accounts', async () => {
  vi.stubEnv('MAX_USERS', '1');
  send.mockResolvedValueOnce({ Item: { status: 'active' } });
  await admitAccount('known', 'Google_known');
  expect(send.mock.calls[0]![0]).toBeInstanceOf(GetCommand);
  expect(send).toHaveBeenCalledTimes(1);
  send.mockResolvedValueOnce({ Item: { status: 'suspended' } });
  await expect(admitAccount('known', 'Google_known')).rejects.toThrow('suspended');
});
it('fails closed if protections are missing or the global kill switch is set', async () => {
  vi.stubEnv('ACCESS_TABLE', '');
  await expect(admitAccount('owner', 'Google_1')).rejects.toThrow('not configured');
  vi.stubEnv('API_ENABLED', 'false');
  await expect(reserveIdentity('Google_1')).rejects.toThrow('paused');
  expect(send).not.toHaveBeenCalled();
});
