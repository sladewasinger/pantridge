import { readFile } from 'node:fs/promises';
import { run } from './run.mjs';
import { deploymentConfig } from './deployment-config.mjs';
import { publishWeb } from './deployment/publish.mjs';

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
const html = await readFile('dist/index.html', 'utf8');
if (!html.includes('name="pantridge-build"'))
  throw new Error('Rebuild the application before publishing: the HTML build marker is missing.');
await readFile('dist/sw.js');
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
publishWeb({ bucket, distribution });
console.log(`Published ${output.app_url.value}`);
