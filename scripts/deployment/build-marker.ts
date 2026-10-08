import { randomUUID } from 'node:crypto';
import type { Plugin } from 'vite';

export function buildMarker() {
  const id = randomUUID();
  return {
    name: 'pantridge-build-marker',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { name: 'pantridge-build', content: id }, injectTo: 'head' },
    ],
  } satisfies Plugin;
}
