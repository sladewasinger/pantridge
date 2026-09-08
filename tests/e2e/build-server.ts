import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

export async function serveBuild() {
  const root = resolve('dist');
  const types: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webmanifest': 'application/manifest+json',
  };
  const server = createServer((request, response) => {
    void (async () => {
      const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
      const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!file.startsWith(root + sep)) {
        response.writeHead(403).end();
        return;
      }
      try {
        const data = await readFile(file);
        response.writeHead(200, {
          'Content-Type': types[extname(file)] ?? 'application/octet-stream',
          'Cache-Control': 'no-store',
        });
        response.end(data);
      } catch {
        response.writeHead(404).end();
      }
    })();
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  return {
    url: `http://127.0.0.1:${address.port}`,
    stop: () =>
      new Promise<void>((done) => {
        server.close(() => done());
        server.closeAllConnections();
      }),
  };
}
