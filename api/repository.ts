import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { emptySnapshot, envelopeSchema, type Envelope } from '../src/domain/model';
import type { Mutation } from '../src/domain/commands';
import { reduceChecked } from '../src/domain/reducer';
import { starterMutationId } from '../src/domain/starter';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
function table(): string {
  const name = process.env.TABLE_NAME;
  if (!name) throw new Error('Table configuration is missing.');
  return name;
}
const key = (owner: string, sk = 'kitchen') => ({ pk: `user#${owner}`, sk });
async function readStored(owner: string): Promise<Envelope> {
  const response = await client.send(
    new GetCommand({ TableName: table(), Key: key(owner), ConsistentRead: true }),
  );
  return response.Item
    ? envelopeSchema.parse(response.Item)
    : { revision: 0, data: emptySnapshot() };
}
export async function read(owner: string): Promise<Envelope> {
  const current = await readStored(owner);
  return current.data.starterVersion
    ? current
    : mutate(owner, {
        id: starterMutationId,
        command: { type: 'kitchen.initialize' },
      });
}
async function wasApplied(owner: string, mutationId: string): Promise<boolean> {
  const result = await client.send(
    new GetCommand({
      TableName: table(),
      Key: key(owner, `mutation#${mutationId}`),
      ConsistentRead: true,
    }),
  );
  return !!result.Item;
}
export async function mutate(owner: string, mutation: Mutation): Promise<Envelope> {
  for (let attempt = 0; attempt < 5; attempt++) {
    if (await wasApplied(owner, mutation.id)) return readStored(owner);
    const current = await readStored(owner);
    const next = {
      revision: current.revision + 1,
      data: reduceChecked(current.data, mutation.command),
    };
    try {
      await client.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: table(),
                Item: { ...key(owner), ...next },
                ConditionExpression:
                  current.revision === 0 ? 'attribute_not_exists(pk)' : 'revision = :previous',
                ...(current.revision
                  ? { ExpressionAttributeValues: { ':previous': current.revision } }
                  : {}),
              },
            },
            {
              Put: {
                TableName: table(),
                Item: {
                  ...key(owner, `mutation#${mutation.id}`),
                  appliedAt: new Date().toISOString(),
                },
                ConditionExpression: 'attribute_not_exists(pk)',
              },
            },
          ],
        }),
      );
      return next;
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'TransactionCanceledException') throw error;
    }
  }
  throw new Error('Your kitchen changed on another device. Retry sync in a moment.');
}
