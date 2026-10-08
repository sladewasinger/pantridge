import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';

const serverNames = [
  'CLASSIFIER_PROVIDER',
  'CLASSIFIER_MODEL',
  'CLASSIFIER_REASONING_EFFORT',
  'STANDARDIZATION_REASONING_EFFORT',
  'CLASSIFIER_DAILY_LIMIT',
  'CLASSIFIER_MAX_OUTPUT_TOKENS',
  'CLASSIFIER_KEY_PARAMETER',
  'OFF_USER_AGENT',
];
export async function connectedConfiguration() {
  const config = JSON.parse(
    await readFile(process.env.PANTRIDGE_DEPLOY_CONFIG ?? 'config/production.json', 'utf8'),
  );
  const region = new URL(config.frontend_environment.value.VITE_AUTHORITY).pathname
    .slice(1)
    .split('_')[0];
  const profile = process.env.AWS_PROFILE ?? 'terraform';
  const functionName = Object.keys(config.application_functions.value).find((name) =>
    name.endsWith('-api'),
  );
  if (!functionName || !region) throw new Error('Deployment configuration is incomplete.');
  // Read settings and the parameter name, never retrieve plaintext keys through the CLI.
  const deployed = JSON.parse(
    execFileSync(
      'aws',
      [
        'lambda',
        'get-function-configuration',
        '--function-name',
        functionName,
        '--profile',
        profile,
        '--region',
        region,
        '--query',
        'Environment.Variables',
        '--output',
        'json',
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ),
  );
  const server = Object.fromEntries(
    serverNames
      .filter((name) => typeof deployed[name] === 'string')
      .map((name) => [name, deployed[name]]),
  );
  return {
    server: { ...server, AWS_PROFILE: profile, AWS_REGION: region, PRODUCT_TABLE: 'local-only' },
    frontend: {
      VITE_AUTHORITY: '',
      VITE_CLIENT_ID: '',
      VITE_AUTH_DOMAIN: '',
      VITE_IDENTITY_PROVIDER: '',
      VITE_API_URL: '/api',
      VITE_LOCAL_TESTING: 'true',
      PANTRIDGE_LOCAL_CONNECTED: 'true',
    },
  };
}
