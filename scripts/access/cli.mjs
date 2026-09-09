import process from 'node:process';
import console from 'node:console';
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { admitAccount } from '../../api/access/admission';
import { listAccounts, releaseReservation, setStatus } from './management.mjs';
import { probe } from './probe.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    table: { type: 'string' },
    region: { type: 'string' },
    profile: { type: 'string' },
    pool: { type: 'string' },
    owner: { type: 'string' },
    identity: { type: 'string' },
    'max-users': { type: 'string', default: '100' },
  },
});
if (!values.table || !values.region)
  throw new Error('Pass --table and --region; optionally --profile.');
process.env.ACCESS_TABLE = values.table;
process.env.AWS_REGION = values.region;
process.env.MAX_USERS = values['max-users'];
if (values.profile) process.env.AWS_PROFILE = values.profile;

async function seedExisting() {
  if (!values.pool) throw new Error('Pass --pool for the existing Pantridge Cognito pool.');
  const args = [
    'cognito-idp',
    'list-users',
    '--user-pool-id',
    values.pool,
    '--region',
    values.region,
    '--output',
    'json',
  ];
  if (values.profile) args.push('--profile', values.profile);
  const result = JSON.parse(
    execFileSync('aws', args, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }),
  );
  let count = 0;
  for (const user of result.Users ?? []) {
    const attributes = Object.fromEntries(
      (user.Attributes ?? []).map((item) => [item.Name, item.Value]),
    );
    if (!user.Username.startsWith('Google_') || !attributes.sub) continue;
    await admitAccount(attributes.sub, user.Username);
    if (!user.Enabled) await setStatus(attributes.sub, 'suspended');
    count++;
  }
  console.log(`Reserved existing Google identities: ${count}`);
}
switch (positionals[0]) {
  case 'list':
    console.log(JSON.stringify(await listAccounts(), null, 2));
    break;
  case 'seed-existing':
    await seedExisting();
    break;
  case 'suspend':
  case 'resume':
    if (!values.owner) throw new Error('Pass the exact verified account subject with --owner.');
    await setStatus(values.owner, positionals[0] === 'resume' ? 'active' : 'suspended');
    console.log('Account status updated.');
    break;
  case 'release-reservation':
    await releaseReservation(values.identity);
    console.log('Unused reservation released.');
    break;
  case 'probe':
    await probe();
    break;
  default:
    throw new Error('Use list, seed-existing, suspend, resume, release-reservation, or probe.');
}
