import { readFile } from 'node:fs/promises';
import { run } from './run.mjs';
import { deploymentConfig } from './deployment-config.mjs';

// Infrastructure is applied separately with a reviewable Terraform plan.
// This command publishes assets only to the bucket named by that state.
const output = await deploymentConfig();
const bucket = output.web_bucket?.value;
const distribution = output.distribution_id?.value;
const environment = output.frontend_environment?.value;
if (!bucket || !distribution || !environment)
  throw new Error('Apply the Terraform configuration before publishing.');
const identity = JSON.parse(
  run('aws', ['sts', 'get-caller-identity', '--output', 'json'], {
    encoding: 'utf8',
    stdio: 'pipe',
  }),
);
if (!output.aws_account_id?.value || identity.Account !== output.aws_account_id.value)
  throw new Error('AWS CLI account does not match the Terraform deployment account.');
if (!process.argv.includes('--built')) run(process.execPath, ['scripts/build-release.mjs']);
await readFile('dist/index.html');
if (process.argv.includes('--api')) {
  for (const [name, bundle] of Object.entries(output.application_functions.value)) {
    run('aws', [
      'lambda',
      'update-function-code',
      '--function-name',
      name,
      '--zip-file',
      `fileb://${bundle}`,
      '--query',
      'LastModified',
      '--output',
      'text',
    ]);
    run('aws', ['lambda', 'wait', 'function-updated', '--function-name', name]);
  }
}
// Keep old hashed assets available to already-open clients during an update.
run('aws', [
  's3',
  'sync',
  'dist/assets',
  `s3://${bucket}/assets`,
  '--cache-control',
  'public,max-age=31536000,immutable',
]);
run('aws', [
  's3',
  'sync',
  'dist',
  `s3://${bucket}`,
  '--exclude',
  'assets/*',
  '--exclude',
  'api/*',
  '--exclude',
  '*.map',
  '--exclude',
  'index.html',
  '--cache-control',
  'no-cache',
]);
// Publish the entry point last, after all its assets are in place.
run('aws', [
  's3',
  'cp',
  'dist/index.html',
  `s3://${bucket}/index.html`,
  '--cache-control',
  'no-cache',
  '--content-type',
  'text/html',
]);
run('aws', [
  'cloudfront',
  'create-invalidation',
  '--distribution-id',
  distribution,
  '--paths',
  '/*',
]);
console.log(`Published ${output.app_url.value}`);
