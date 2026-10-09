import { GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { Envelope } from '../src/domain/model';
import type { Mutation } from '../src/domain/commands';
import { reduceChecked } from '../src/domain/reducer';
import { starterMutationId } from '../src/domain/starter';
import { reserveWriteBudget } from './access/write-budget';
import {
  kitchenDb as client,
  kitchenKey as key,
  kitchenTable as table,
  kitchenPut,
  readStored,
  changeStored,
} from './kitchen-storage';
import { scheduleClassification } from './standardization/schedule';
import { reuseClassificationCache } from './standardization/sync-cache';
import { classificationMetric } from './standardization/metrics';
import { assertCatalogWritable } from './catalog-compatibility';
import { catalogRevision } from '../src/domain/ingredient-matching/catalog-version';
import { compatibleMutationCommand } from '../src/domain/ingredient-matching/mutation-compatibility';

export async function read(owner: string): Promise<Envelope> {
  const current = await readStored(owner);
  if (
    current.data.starterVersion &&
    JSON.stringify(scheduleClassification(current.data, current.data, Date.now())) ===
      JSON.stringify(current.data)
  )
    return current;
  return current.data.starterVersion
    ? changeStored(owner, (data) => {
        const scheduled = scheduleClassification(data, data, Date.now());
        return JSON.stringify(scheduled) === JSON.stringify(data) ? data : scheduled;
      })
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
export async function mutate(
  owner: string,
  mutation: Mutation,
  revision = catalogRevision,
): Promise<Envelope> {
  for (let attempt = 0; attempt < 5; attempt++) {
    if (await wasApplied(owner, mutation.id)) return readStored(owner);
    const current = await readStored(owner);
    assertCatalogWritable(current.data, revision);
    const next = {
      revision: current.revision + 1,
      data: scheduleClassification(
        current.data,
        reduceChecked(current.data, compatibleMutationCommand(current.data, mutation)),
        Date.now(),
      ),
    };
    assertCatalogWritable(next.data, revision);
    try {
      await reserveWriteBudget(next);
      await client.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: kitchenPut(owner, current, next),
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
      if (mutation.command.type === 'classification.review')
        classificationMetric({
          event: 'review',
          source: 'sync',
          outcome: 'success',
          clarifications: 1,
        });
      return reuseClassificationCache(owner, current.data, next).catch(() => next);
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'TransactionCanceledException') throw error;
    }
  }
  throw new Error('Your kitchen changed on another device. Retry sync in a moment.');
}
