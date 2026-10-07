import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import process from 'node:process';
import console from 'node:console';
import { resolve } from 'node:path';
import { connectedConfiguration } from './config.mjs';

const configuration = await connectedConfiguration();
const bundle = await build({
  entryPoints: ['api/development/start.ts'],
  outfile: 'artifacts/local/api.mjs',
  platform: 'node',
  target: 'node22',
  format: 'esm',
  bundle: true,
  metafile: true,
  plugins: [
    {
      name: 'local-cache-only',
      setup(builder) {
        builder.onResolve({ filter: /cache$/ }, (args) => {
          if (resolve(args.resolveDir, args.path) === resolve('api/products/cache'))
            return { path: resolve('api/development/cache.ts') };
        });
      },
    },
  ],
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
if (
  Object.keys(bundle.metafile.inputs).some((path) =>
    /api\/(products\/cache|repository|access\/)/.test(path),
  )
)
  throw new Error('The local bundle must not contain production database modules.');
const environment = { ...process.env };
delete environment.TABLE_NAME;
delete environment.ACCESS_TABLE;
delete environment.PRODUCT_TABLE;
const api = spawn(process.execPath, ['artifacts/local/api.mjs'], {
  env: { ...environment, ...configuration.server },
  stdio: ['ignore', 'pipe', 'inherit'],
});
let vite;
function stop() {
  api.kill();
  vite?.kill();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
api.on('error', () => {
  console.error('Local API could not start.');
  process.exitCode = 1;
  stop();
});
api.on('exit', (code) => {
  if (code) process.exitCode = code;
  vite?.kill();
});
api.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  if (vite || !String(chunk).includes('Isolated local API ready.')) return;
  vite = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5175', '--strictPort'],
    {
      env: { ...environment, ...configuration.frontend },
      stdio: 'inherit',
    },
  );
  vite.on('error', () => {
    console.error('Local preview could not start.');
    process.exitCode = 1;
    stop();
  });
  vite.on('exit', (code) => {
    if (code) process.exitCode = code;
    api.kill();
  });
  console.log('Open http://127.0.0.1:5175/ for the isolated local test kitchen.');
});
