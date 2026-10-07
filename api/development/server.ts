import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage } from 'node:http';

export type LocalResponse = { statusCode: number; body: unknown };
type Handle = (input: unknown) => Promise<LocalResponse>;

async function requestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.byteLength;
    if (size > 16_384) throw new Error('body-limit');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}
function hasToken(request: IncomingMessage, token: string) {
  const provided = Buffer.from(request.headers.authorization ?? '');
  const expected = Buffer.from(`Bearer ${token}`);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
export function localServer(handle: Handle, origin: string) {
  // This nonce authorizes only this loopback process. It is not a Google session or API key.
  const token = randomBytes(32).toString('hex');
  return createServer((request, response) => {
    void (async () => {
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Content-Type', 'application/json');
      const respond = (status: number, body: unknown) =>
        response.writeHead(status).end(JSON.stringify(body));
      if (
        request.headers.host !== '127.0.0.1:4175' ||
        (request.headers.origin && request.headers.origin !== origin)
      ) {
        respond(403, { message: 'Local requests only.' });
        return;
      }
      if (
        request.method === 'GET' &&
        request.url === '/v1/local/session' &&
        request.headers['sec-fetch-site'] === 'same-origin'
      ) {
        respond(200, { token });
        return;
      }
      if (
        request.method !== 'POST' ||
        request.url !== '/v1/products/resolve' ||
        request.headers.origin !== origin ||
        request.headers['content-type'] !== 'application/json' ||
        !hasToken(request, token)
      ) {
        respond(403, { message: 'Reload the local preview to continue.' });
        return;
      }
      try {
        const result = await handle(await requestBody(request));
        respond(result.statusCode, result.body);
      } catch (error) {
        const oversized = error instanceof Error && error.message === 'body-limit';
        respond(oversized ? 413 : 400, { message: 'This local request is invalid.' });
      }
    })();
  });
}
