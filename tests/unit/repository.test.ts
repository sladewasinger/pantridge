import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import type * as DocumentSdk from '@aws-sdk/lib-dynamodb';
import { mutate } from '../../api/repository';
import { egg, kitchen, lotId } from './fixtures';
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('@aws-sdk/lib-dynamodb', async (original) => ({
  ...(await original<typeof DocumentSdk>()),
  DynamoDBDocumentClient: { from: () => ({ send }) },
}));
beforeEach(() => {
  send.mockReset();
  vi.stubEnv('TABLE_NAME', 'test-kitchen');
});
describe('cloud mutation receipts', () => {
  it('returns the current snapshot for an already-applied mutation without writing again', async () => {
    send
      .mockResolvedValueOnce({ Item: { appliedAt: '2026-09-08' } })
      .mockResolvedValueOnce({ Item: { revision: 4, data: kitchen() } });
    const result = await mutate('owner', {
      id: crypto.randomUUID(),
      command: { type: 'stock.adjust', stockId: lotId, delta: 2 },
    });
    expect(result.revision).toBe(4);
    expect(send.mock.calls.every(([command]) => command instanceof GetCommand)).toBe(true);
  });
  it('commits a revision condition and a permanent receipt in the same transaction', async () => {
    send
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { revision: 3, data: kitchen() } })
      .mockResolvedValueOnce({});
    const result = await mutate('owner', {
      id: crypto.randomUUID(),
      command: { type: 'stock.adjust', stockId: lotId, delta: 1 },
    });
    expect(result.data.stock[0]?.quantity).toBe(3);
    const command: unknown = send.mock.calls[2]?.[0];
    expect(command).toBeInstanceOf(TransactWriteCommand);
    if (!(command instanceof TransactWriteCommand)) throw new Error('Missing transaction');
    expect(command.input.TransactItems?.[0]?.Put?.ConditionExpression).toBe('revision = :previous');
    expect(command.input.TransactItems?.[1]?.Put?.ConditionExpression).toBe(
      'attribute_not_exists(pk)',
    );
    expect(command.input.TransactItems?.[1]?.Put?.Item?.pk).toBe('user#owner');
  });
  it('re-reads and rebases after a concurrent device wins the transaction', async () => {
    const conflict = Object.assign(new Error('Conflict'), { name: 'TransactionCanceledException' });
    const newer = kitchen();
    newer.stock[0]!.quantity = 5;
    send
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { revision: 3, data: kitchen() } })
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { revision: 4, data: newer } })
      .mockResolvedValueOnce({});
    const result = await mutate('owner', {
      id: crypto.randomUUID(),
      command: { type: 'stock.adjust', stockId: lotId, delta: 1 },
    });
    expect(result.revision).toBe(5);
    expect(result.data.stock[0]?.quantity).toBe(6);
    expect(result.data.foods[0]).toEqual(egg);
  });
});
