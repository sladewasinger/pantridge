import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';

await build({
  entryPoints: ['scripts/access/cli.mjs'],
  outfile: 'artifacts/access-admin.mjs',
  platform: 'node',
  target: 'node22',
  format: 'esm',
  bundle: true,
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
const result = spawnSync(
  process.execPath,
  ['artifacts/access-admin.mjs', ...process.argv.slice(2)],
  { stdio: 'inherit', shell: false },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
