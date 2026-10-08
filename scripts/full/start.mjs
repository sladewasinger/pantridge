import { spawn, execFileSync } from 'node:child_process';
import process from 'node:process';
import console from 'node:console';
import { buildFullApi } from './build.mjs';
import { prepareDatabase } from './database.mjs';
import { cleanEnvironment, serverEnvironment } from './environment.mjs';

const mode = process.argv.includes('--real-ai') ? 'real' : 'fixture';
const testing = process.argv.includes('--test');
const namespace = `${mode}${testing ? '-test' : ''}`;
const ports = testing ? [5178, 5179] : [5176, 5177];
const model = process.argv.find((arg) => arg.startsWith('--model='))?.slice(8);
if (
  process.argv
    .slice(2)
    .some((arg) => !['--real-ai', '--test'].includes(arg) && !arg.startsWith('--model=')) ||
  (testing && mode === 'real') ||
  (model && (mode !== 'real' || !['gpt-6-luna', 'gpt-6.1-sol'].includes(model)))
)
  throw new Error('Use pnpm dev:full [--real-ai] [--model=gpt-6-luna|gpt-6.1-sol].');
execFileSync(
  'docker',
  ['compose', '-p', 'pantridge-full', '-f', 'scripts/full/compose.yaml', 'up', '-d'],
  { stdio: 'inherit' },
);
await prepareDatabase(namespace);
const apiBundle = await buildFullApi(namespace);
const environment = cleanEnvironment();
const serverEnv = await serverEnvironment(
  mode,
  testing,
  model ?? (mode === 'real' ? 'gpt-6-luna' : undefined),
);
const children = [];
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
function launch(args, env, stdout = 'inherit') {
  const child = spawn(process.execPath, args, {
    env,
    stdio: ['ignore', stdout, 'inherit'],
    windowsHide: true,
  });
  children.push(child);
  child.on('error', stop);
  child.on('exit', (code) => {
    if (code) process.exitCode = code;
    stop();
  });
  return child;
}
const api = launch([apiBundle], serverEnv, 'pipe');
let started = false;
api.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  if (started || !String(chunk).includes('Full local API ready.')) return;
  started = true;
  for (const port of ports)
    launch(
      [
        'node_modules/vite/bin/vite.js',
        '--host',
        '127.0.0.1',
        '--port',
        String(port),
        '--strictPort',
      ],
      {
        ...environment,
        VITE_API_URL: '/api',
        VITE_LOCAL_FULL: 'true',
        PANTRIDGE_FULL: 'true',
        PANTRIDGE_FULL_TEST: String(testing),
        VITE_FULL_MODE: mode,
        VITE_FULL_NAMESPACE: namespace,
      },
    );
  console.log(
    `Full local (${namespace} AI): device A http://127.0.0.1:${ports[0]}/ · device B http://127.0.0.1:${ports[1]}/`,
  );
  console.log(
    'Database and quota counters persist. Ctrl+C stops API/worker/previews; Docker storage remains.',
  );
});
