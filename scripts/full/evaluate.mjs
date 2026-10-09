import { spawn, execFileSync } from 'node:child_process';
import process from 'node:process';
import { buildFullApi } from './build.mjs';
import { prepareDatabase } from './database.mjs';
import { serverEnvironment } from './environment.mjs';
const [model = 'gpt-6-luna', reasoning = 'low', experiment = 'migration', variant] =
  process.argv.slice(2);
if (!['gpt-6-luna', 'gpt-6.1-sol'].includes(model) || !['low', 'medium'].includes(reasoning))
  throw new Error('Choose gpt-6-luna or gpt-6.1-sol and low or medium.');
if (!['migration', 'groceries'].includes(experiment)) throw new Error('Unknown experiment.');
if (variant && (experiment !== 'groceries' || variant !== 'names-only'))
  throw new Error('Only groceries supports the names-only variant.');
execFileSync(
  'docker',
  ['compose', '-p', 'pantridge-full', '-f', 'scripts/full/compose.yaml', 'up', '-d'],
  { stdio: 'inherit' },
);
await prepareDatabase('real');
const bundle = await buildFullApi('real', experiment);
const child = spawn(process.execPath, [bundle, ...(variant ? [variant] : [])], {
  env: await serverEnvironment('real', false, model, reasoning),
  stdio: 'inherit',
  windowsHide: true,
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
