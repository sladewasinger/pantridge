import { readFile } from 'node:fs/promises';
import { run } from './run.mjs';

export async function deploymentConfig() {
  const file = process.env.PANTRIDGE_DEPLOY_CONFIG;
  const text = file
    ? await readFile(file, 'utf8')
    : run(process.env.TERRAFORM_BIN ?? 'terraform', ['-chdir=infra', 'output', '-json'], {
        encoding: 'utf8',
        stdio: 'pipe',
      });
  const output = JSON.parse(text);
  for (const key of [
    'aws_account_id',
    'app_url',
    'web_bucket',
    'distribution_id',
    'frontend_environment',
  ]) {
    if (!output[key]?.value) throw new Error(`Missing deployment setting: ${key}`);
  }
  return output;
}
