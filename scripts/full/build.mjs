import { build } from 'esbuild';
import { resolve } from 'node:path';
export async function buildFullApi(namespace, purpose = 'server') {
  if (!['fixture', 'fixture-test', 'real'].includes(namespace))
    throw new Error('Unsupported local bundle namespace.');
  if (!['server', 'migration'].includes(purpose)) throw new Error('Unsupported local entry point.');
  const outfile = `artifacts/full/${namespace}/${purpose}.mjs`;
  const result = await build({
    entryPoints: [
      purpose === 'server' ? 'api/development-full/start.ts' : 'api/experiments/migration.ts',
    ],
    outfile,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    bundle: true,
    metafile: true,
    banner: {
      js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
    },
    plugins: [
      {
        name: 'full-local-boundaries',
        setup(builder) {
          builder.onResolve({ filter: /^@aws-sdk\/client-dynamodb$/ }, (args) => {
            if (
              args.importer.includes('node_modules') ||
              args.importer.replaceAll('\\', '/').endsWith('development-full/dynamodb.ts')
            )
              return;
            return { path: resolve('api/development-full/dynamodb.ts') };
          });
          builder.onResolve({ filter: /(?:\/ai|\/cache)$/ }, (args) => {
            if (args.importer.replaceAll('\\', '/').includes('/development-full/')) return;
            const target = resolve(args.resolveDir, args.path);
            if (target === resolve('api/products/ai'))
              return { path: resolve('api/development-full/provider.ts') };
            if (target === resolve('api/products/cache'))
              return { path: resolve('api/development-full/quota.ts') };
          });
        },
      },
    ],
  });
  const inputs = Object.keys(result.metafile.inputs);
  if (
    !inputs.includes('api/development-full/dynamodb.ts') ||
    (purpose === 'server' &&
      (!inputs.includes('api/handler.ts') || !inputs.includes('api/standardization/worker.ts')))
  )
    throw new Error('The full local bundle is missing required integration boundaries.');
  return outfile;
}
