import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';
import { connectedConfiguration } from '../local/config.mjs';

const configuration = await connectedConfiguration();
const result = await build({
  entryPoints: ['api/experiments/run.ts'],
  outfile: 'artifacts/local/experiments.mjs',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  metafile: true,
  plugins: [
    {
      name: 'isolated-cache',
      setup(builder) {
        builder.onResolve({ filter: /cache$/ }, (args) =>
          resolve(args.resolveDir, args.path) === resolve('api/products/cache')
            ? { path: resolve('api/development/cache.ts') }
            : undefined,
        );
      },
    },
  ],
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
if (
  Object.keys(result.metafile.inputs).some((path) =>
    /api\/(products\/cache|repository|access\/)/.test(path),
  )
)
  throw new Error('Cloud data code is forbidden in experiments.');
const environment = {
  ...process.env,
  ...configuration.server,
  LOCAL_AI_DAILY_LIMIT: '100',
  PANTRIDGE_EXPERIMENT: 'true',
};
delete environment.TABLE_NAME;
delete environment.ACCESS_TABLE;
const child = spawnSync(
  process.execPath,
  ['artifacts/local/experiments.mjs', ...process.argv.slice(2)],
  { env: environment, stdio: 'inherit' },
);
process.exitCode = child.status ?? 1;
