import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { setTimeout } from 'node:timers/promises';
const client = new DynamoDBClient({
  endpoint: 'http://127.0.0.1:8006',
  region: 'us-west-2',
  credentials: { accessKeyId: 'localdevelopment', secretAccessKey: 'localdevelopment' },
  maxAttempts: 1,
});
const attribute = (name, type = 'S') => ({ AttributeName: name, AttributeType: type });
const key = (name, type = 'HASH') => ({ AttributeName: name, KeyType: type });
export async function prepareDatabase(mode) {
  if (!['fixture', 'fixture-test', 'real'].includes(mode))
    throw new Error('Invalid local database mode.');
  const prefix = `pantridge-local-${mode}`;
  const tables = [
    {
      TableName: `${prefix}-kitchen`,
      KeySchema: [key('pk'), key('sk', 'RANGE')],
      AttributeDefinitions: [
        attribute('pk'),
        attribute('sk'),
        attribute('classificationQueue'),
        attribute('classificationDue', 'N'),
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'classification-due',
          KeySchema: [key('classificationQueue'), key('classificationDue', 'RANGE')],
          Projection: { ProjectionType: 'KEYS_ONLY' },
        },
      ],
    },
    {
      TableName: `${prefix}-access`,
      KeySchema: [key('pk')],
      AttributeDefinitions: [attribute('pk')],
    },
    {
      TableName: `${prefix}-products`,
      KeySchema: [key('pk')],
      AttributeDefinitions: [attribute('pk'), attribute('classificationName')],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'classification-name',
          KeySchema: [key('classificationName')],
          Projection: { ProjectionType: 'ALL' },
        },
      ],
    },
  ];
  for (const table of tables) {
    for (let attempt = 0; attempt < 30; attempt++) {
      try {
        await client.send(new CreateTableCommand({ ...table, BillingMode: 'PAY_PER_REQUEST' }));
        break;
      } catch (error) {
        if (error.name === 'ResourceInUseException') break;
        if (attempt === 29) throw error;
        await setTimeout(500);
      }
    }
    const { Table } = await client.send(new DescribeTableCommand({ TableName: table.TableName }));
    if (Table?.TableStatus !== 'ACTIVE') throw new Error('Local database is not active.');
    const keys = (values) =>
      JSON.stringify(values?.map((item) => [item.AttributeName, item.KeyType]).sort());
    if (keys(Table.KeySchema) !== keys(table.KeySchema))
      throw new Error('Local table key schema mismatch.');
    for (const expected of table.GlobalSecondaryIndexes ?? []) {
      const actual = Table.GlobalSecondaryIndexes?.find(
        (index) => index.IndexName === expected.IndexName,
      );
      if (
        actual?.IndexStatus !== 'ACTIVE' ||
        keys(actual.KeySchema) !== keys(expected.KeySchema) ||
        actual.Projection.ProjectionType !== expected.Projection.ProjectionType
      )
        throw new Error(
          `Local index schema mismatch: ${expected.IndexName}. Migrate the local index before continuing.`,
        );
    }
  }
}
