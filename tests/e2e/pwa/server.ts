import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

type Version = 'A' | 'B' | 'C';
const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};
export async function updateServer() {
  const root = resolve('artifacts/e2e-web');
  const originalHtml = await readFile(resolve(root, 'index.html'), 'utf8');
  const originalWorker = await readFile(resolve(root, 'sw.js'), 'utf8');
  if (!originalHtml.includes('name="pantridge-build"')) throw new Error('Build marker missing');
  const originalRevision = createHash('md5').update(originalHtml).digest('hex');
  if (!originalWorker.includes(`url:"index.html",revision:"${originalRevision}"`))
    throw new Error('The generated worker must match the built HTML, including its build marker');
  const versions = Object.fromEntries(
    (['A', 'B', 'C'] as const).map((version) => {
      const html = originalHtml.replace(
        /name="pantridge-build" content="[^"]+"/,
        `name="pantridge-build" content="${version}"`,
      );
      const revision = createHash('md5').update(html).digest('hex');
      const worker = originalWorker.replace(
        /url:"index\.html",revision:"[^"]+"/,
        `url:"index.html",revision:"${revision}"`,
      );
      if (worker === originalWorker) throw new Error('Precache manifest not found');
      return [version, { html, revision, worker }];
    }),
  ) as Record<Version, { html: string; revision: string; worker: string }>;
  let current = { html: 'A' as Version, worker: 'A' as Version };
  let release = () => {};
  let held: Promise<void> | undefined;
  let requested = false;
  const server = createServer((request, response) => {
    void (async () => {
      const path = new URL(request.url ?? '/', 'http://localhost').pathname;
      response.setHeader('Cache-Control', 'no-store');
      if (path === '/' || path === '/index.html') {
        const html = versions[current.html].html;
        if (held && path === '/index.html') {
          requested = true;
          await held;
        }
        response.writeHead(200, { 'Content-Type': types['.html'] }).end(html);
        return;
      }
      if (path === '/sw.js') {
        response
          .writeHead(200, { 'Content-Type': types['.js'] })
          .end(versions[current.worker].worker);
        return;
      }
      const file = resolve(root, `.${path}`);
      if (!file.startsWith(root + sep)) {
        response.writeHead(403).end();
        return;
      }
      const bytes = await readFile(file);
      response.writeHead(200, {
        'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      });
      response.end(bytes);
    })().catch(() => response.writeHead(404).end());
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test address');
  return {
    url: `http://127.0.0.1:${address.port}`,
    revisions: versions,
    publish: (next: typeof current) => {
      current = next;
    },
    holdIndex: () => {
      held = new Promise<void>((done) => {
        release = done;
      });
    },
    indexRequested: () => requested,
    releaseIndex: () => {
      release();
      held = undefined;
    },
    stop: () =>
      new Promise<void>((done) => {
        release();
        server.close(() => done());
        server.closeAllConnections();
      }),
  };
}
