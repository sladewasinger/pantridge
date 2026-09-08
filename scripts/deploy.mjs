import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

// Infrastructure is applied separately with a reviewable Terraform plan.
// This command publishes assets only to the bucket named by that state.
const terraform = process.env.TERRAFORM_BIN ?? 'terraform';
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})`);
  return result.stdout;
}
const output = JSON.parse(
  run(terraform, ['-chdir=infra', 'output', '-json'], { encoding: 'utf8', stdio: 'pipe' }),
);
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
const env = { ...process.env, ...environment };
run(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit']);
run(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { env });
await readFile('dist/index.html');
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
