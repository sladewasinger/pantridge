import { expect, it } from 'vitest';
import { publishWeb } from '../../../scripts/deployment/publish.mjs';
import { buildMarker } from '../../../scripts/deployment/build-marker';

const destination = { bucket: 'test-bucket', distribution: 'TESTCDN' };
function recorder(failAt = -1) {
  const calls: string[][] = [];
  const execute = (_command: string, args: string[]) => {
    calls.push(args);
    if (calls.length === failAt) throw new Error('Publication failed');
    return `INVALIDATION${calls.length}\n`;
  };
  return { calls, execute };
}
it('publishes HTML and waits for the CDN before exposing the new worker', () => {
  const { calls, execute } = recorder();
  publishWeb(destination, execute);
  expect(calls.map((args) => args.slice(0, 3))).toEqual([
    ['s3', 'sync', 'dist/assets'],
    ['s3', 'sync', 'dist'],
    ['s3', 'cp', 'dist/index.html'],
    ['cloudfront', 'create-invalidation', '--distribution-id'],
    ['cloudfront', 'wait', 'invalidation-completed'],
    ['s3', 'cp', 'dist/sw.js'],
    ['cloudfront', 'create-invalidation', '--distribution-id'],
    ['cloudfront', 'wait', 'invalidation-completed'],
  ]);
  expect(calls[1]).toEqual(expect.arrayContaining(['--exclude', 'sw.js', 'index.html']));
  expect(calls[3]).toEqual(expect.arrayContaining(['--paths', '/*']));
  expect(calls[4]).toEqual(expect.arrayContaining(['--id', 'INVALIDATION4']));
  expect(calls[6]).toEqual(expect.arrayContaining(['--paths', '/sw.js']));
  expect(calls[7]).toEqual(expect.arrayContaining(['--id', 'INVALIDATION7']));
  expect(calls.flat()).not.toContain('--delete');
});
it.each([3, 4, 5])(
  'withholds the worker when HTML publication or its barrier fails (%s)',
  (step) => {
    const { calls, execute } = recorder(step);
    expect(() => publishWeb(destination, execute)).toThrow('Publication failed');
    expect(calls.some((args) => args[2] === 'dist/sw.js')).toBe(false);
  },
);
it('does not report completion when the final invalidation fails', () => {
  const { execute } = recorder(8);
  expect(() => publishWeb(destination, execute)).toThrow('Publication failed');
});
it('rejects missing invalidation IDs before publishing a worker', () => {
  const calls: string[][] = [];
  expect(() =>
    publishWeb(destination, (_command, args) => {
      calls.push(args);
      return '';
    }),
  ).toThrow('no invalidation ID');
  expect(calls.some((args) => args[2] === 'dist/sw.js')).toBe(false);
});
it('keeps one marker within a build and gives another build a fresh HTML revision', async () => {
  const first = buildMarker();
  const second = buildMarker();
  expect(first.apply).toBe('build');
  const transform = first.transformIndexHtml;
  const next = second.transformIndexHtml;
  if (typeof transform !== 'function' || typeof next !== 'function')
    throw new Error('Missing hook');
  const initial = await transform();
  expect(await transform()).toEqual(initial);
  expect(await next()).not.toEqual(initial);
});
