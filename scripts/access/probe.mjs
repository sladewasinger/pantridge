import process from 'node:process';
import console from 'node:console';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { admitAccount, reserveIdentity } from '../../api/access/admission';
import { protectRequest, recordMalformed } from '../../api/access/protection';
import { reserveWriteBudget } from '../../api/access/write-budget';
import { accessDb, accessTable, deadline, getRecord } from '../../api/access/store';
import { setStatus } from './management.mjs';

async function cleanup(identity) {
  const record = await getRecord(`identity#${identity}`);
  if (!record) return;
  const changes = [
    {
      Delete: {
        TableName: accessTable(),
        Key: { pk: `identity#${identity}` },
        ConditionExpression: 'attribute_exists(pk)',
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
  ];
  if (record.owner)
    changes.push({ Delete: { TableName: accessTable(), Key: { pk: `account#${record.owner}` } } });
  await accessDb.send(new TransactWriteCommand({ TransactItems: changes }), deadline());
}
export async function probe() {
  const stamp = randomUUID();
  const identities = [`Google_probe_${stamp}_a`, `Google_probe_${stamp}_b`];
  const used = Number((await getRecord('capacity'))?.used ?? 0);
  process.env.MAX_USERS = String(used + 1);
  try {
    const admissions = await Promise.allSettled(identities.map(reserveIdentity));
    assert.equal(admissions.filter((result) => result.status === 'fulfilled').length, 1);
    const index = admissions.findIndex((result) => result.status === 'fulfilled');
    const identity = identities[index];
    const owner = `probe-${stamp}`;
    await admitAccount(owner, identity);
    process.env.USER_REQUESTS_PER_MINUTE = '3';
    process.env.ABUSE_REQUESTS_PER_MINUTE = '6';
    for (let i = 0; i < 3; i++) await protectRequest(owner, identity);
    await assert.rejects(protectRequest(owner, identity), { status: 429 });
    await assert.rejects(protectRequest(owner, identity), { status: 429 });
    await assert.rejects(protectRequest(owner, identity), { status: 429 });
    await assert.rejects(protectRequest(owner, identity), { status: 403 });
    await assert.rejects(admitAccount(owner, identity), { status: 403 });
    await setStatus(owner, 'active');
    await protectRequest(owner, identity);
    process.env.ABUSE_INVALID_REQUESTS = '2';
    await recordMalformed(owner);
    await assert.rejects(recordMalformed(owner), { status: 403 });
    await reserveWriteBudget({ probe: true });
    console.log(
      'Live DynamoDB checks passed: atomic capacity, cooldown, suspension, blocked token admission, resume, malformed traffic, write budget.',
    );
  } finally {
    for (const identity of identities) await cleanup(identity);
    console.log(
      'Disposable probe identities removed; their short-lived request counters expire automatically.',
    );
  }
}
