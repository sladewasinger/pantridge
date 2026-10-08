import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  emptySnapshot,
  envelopeSchema,
  snapshotSchema,
  type Envelope,
  type Snapshot,
} from '../src/domain/model';
import { reserveWriteBudget } from './access/write-budget';
import { classificationIndex } from './standardization/schedule';
import { activeAccountChecks } from './access/worker-write';

export const kitchenDb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
export function kitchenTable(): string {
  const name = process.env.TABLE_NAME;
  if (!name) throw new Error('Table configuration is missing.');
  return name;
}
export const kitchenKey = (owner: string, sk = 'kitchen') => ({ pk: `user#${owner}`, sk });
export async function readStored(owner: string): Promise<Envelope> {
  const { Item } = await kitchenDb.send(
    new GetCommand({ TableName: kitchenTable(), Key: kitchenKey(owner), ConsistentRead: true }),
  );
  return Item ? envelopeSchema.parse(Item) : { revision: 0, data: emptySnapshot() };
}
export function kitchenPut(owner: string, current: Envelope, next: Envelope) {
  return {
    TableName: kitchenTable(),
    Item: { ...kitchenKey(owner), ...next, ...classificationIndex(next.data) },
    ConditionExpression:
      current.revision === 0 ? 'attribute_not_exists(pk)' : 'revision = :previous',
    ...(current.revision ? { ExpressionAttributeValues: { ':previous': current.revision } } : {}),
  };
}
export async function changeStored(
  owner: string,
  change: (data: Snapshot) => Snapshot,
  identity?: string,
): Promise<Envelope> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await readStored(owner);
    const changed = change(current.data);
    if (changed === current.data) return current;
    const next = { revision: current.revision + 1, data: snapshotSchema.parse(changed) };
    if (Buffer.byteLength(JSON.stringify(next.data)) > 280_000)
      throw new Error('Kitchen storage is full.');
    await reserveWriteBudget(next);
    try {
      const put = kitchenPut(owner, current, next);
      if (identity)
        await kitchenDb.send(
          new TransactWriteCommand({
            TransactItems: [{ Put: put }, ...activeAccountChecks(owner, identity)],
          }),
        );
      else await kitchenDb.send(new PutCommand(put));
      return next;
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !['ConditionalCheckFailedException', 'TransactionCanceledException'].includes(error.name)
      )
        throw error;
    }
  }
  throw new Error('Kitchen changed during classification.');
}
