import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { writeFile } from 'node:fs/promises';

const table = process.env.PRODUCT_TABLE;
if (!table || !/^pantridge-[a-z0-9-]+-products$/.test(table))
  throw new Error('Set PRODUCT_TABLE to the Pantridge product cache table.');
const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const products = [];
let cursor;
do {
  const page = await client.send(
    new ScanCommand({
      TableName: table,
      ExclusiveStartKey: cursor,
      FilterExpression: 'begins_with(pk, :prefix)',
      ProjectionExpression: '#result',
      ExpressionAttributeNames: { '#result': 'result' },
      ExpressionAttributeValues: { ':prefix': 'product#' },
    }),
  );
  for (const item of page.Items ?? []) products.push(item.result);
  cursor = page.LastEvaluatedKey;
} while (cursor);
await writeFile(
  'artifacts/product-catalog.json',
  JSON.stringify(
    {
      attribution: 'Open Food Facts contributors; Pantridge classification suggestions',
      license: 'https://opendatacommons.org/licenses/odbl/1-0/',
      products,
    },
    null,
    2,
  ),
);
console.log(`Exported ${products.length} public cache records to artifacts/product-catalog.json.`);
