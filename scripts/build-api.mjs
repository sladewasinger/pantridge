import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
await build({
  entryPoints: ['api/handler.ts'],
  outfile: 'artifacts/api/handler.mjs',
  platform: 'node',
  target: 'node22',
  format: 'esm',
  bundle: true,
  sourcemap: true,
  // Bundled CommonJS SDK dependencies still require Node built-ins at runtime.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});

await build({
  entryPoints: ['api/auth-guard.ts'],
  outfile: 'artifacts/auth/handler.mjs',
  platform: 'node',
  target: 'node22',
  format: 'esm',
  bundle: true,
});

// A fresh ESM process matches Lambda's module loading, without test-runner shims.
const bundleUrl = new URL('../artifacts/api/handler.mjs', import.meta.url).href;
const probe = spawnSync(
  process.execPath,
  [
    '--input-type=module',
    '--eval',
    `
    const { handler } = await import(${JSON.stringify(bundleUrl)});
    const result = await handler({ requestContext: {} });
    if (result.statusCode !== 401) throw new Error('API startup probe failed');
  `,
  ],
  { stdio: 'inherit', shell: false },
);
if (probe.error) throw probe.error;
if (probe.status !== 0) throw new Error('The Lambda bundle could not start.');
