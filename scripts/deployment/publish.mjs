import { run } from '../run.mjs';

function invalidate(distribution, paths, execute) {
  const id = execute(
    'aws',
    [
      'cloudfront',
      'create-invalidation',
      '--distribution-id',
      distribution,
      '--paths',
      ...paths,
      '--query',
      'Invalidation.Id',
      '--output',
      'text',
    ],
    { encoding: 'utf8', stdio: 'pipe' },
  ).trim();
  if (!/^[A-Za-z0-9]+$/.test(id)) throw new Error('CloudFront returned no invalidation ID.');
  execute('aws', [
    'cloudfront',
    'wait',
    'invalidation-completed',
    '--distribution-id',
    distribution,
    '--id',
    id,
  ]);
}

export function publishWeb({ bucket, distribution }, execute = run) {
  // Keep old hashed assets available to installed clients across a release.
  execute('aws', [
    's3',
    'sync',
    'dist/assets',
    `s3://${bucket}/assets`,
    '--cache-control',
    'public,max-age=31536000,immutable',
  ]);
  execute('aws', [
    's3',
    'sync',
    'dist',
    `s3://${bucket}`,
    '--exclude',
    'assets/*',
    '--exclude',
    'api/*',
    '--exclude',
    '*.map',
    '--exclude',
    'index.html',
    '--exclude',
    'sw.js',
    '--cache-control',
    'no-cache',
  ]);
  execute('aws', [
    's3',
    'cp',
    'dist/index.html',
    `s3://${bucket}/index.html`,
    '--cache-control',
    'no-cache',
    '--content-type',
    'text/html',
  ]);
  // A new worker must never precache old CDN HTML under its new revision.
  invalidate(distribution, ['/*'], execute);
  execute('aws', [
    's3',
    'cp',
    'dist/sw.js',
    `s3://${bucket}/sw.js`,
    '--cache-control',
    'no-cache',
    '--content-type',
    'application/javascript',
  ]);
  invalidate(distribution, ['/sw.js'], execute);
}
