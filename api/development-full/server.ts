import { createServer, type IncomingMessage } from 'node:http';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { handler } from '../handler';
import { handler as worker } from '../standardization/worker';
import { authenticatedOwner, sessionFor, validLocalRequest } from './session';
import { faults, controlsSchema } from './faults';
import { fullConfiguration } from './config';

async function bodyText(request: IncomingMessage) {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const data = Buffer.from(chunk as Uint8Array);
    size += data.length;
    if (size > 16_384) throw new Error('body-limit');
    chunks.push(data);
  }
  return Buffer.concat(chunks).toString('utf8');
}
let running: Promise<void> | undefined;
export function tick() {
  running ??= worker().finally(() => {
    running = undefined;
  });
  return running;
}
async function application(request: IncomingMessage, owner: string, path: string) {
  if (
    !['GET /v1/kitchen', 'POST /v1/mutations', 'POST /v1/products/resolve'].includes(
      `${request.method} ${path}`,
    )
  )
    return { statusCode: 404, body: JSON.stringify({ message: 'Not found.' }) };
  if (faults(owner).syncFailures > 0 && path !== '/v1/products/resolve') {
    faults(owner).syncFailures--;
    return {
      statusCode: 503,
      headers: { 'Retry-After': '60' },
      body: JSON.stringify({
        message: 'Simulated local sync failure. Your changes remain on this device.',
      }),
    };
  }
  return handler({
    routeKey: `${request.method} ${path}`,
    body: request.method === 'POST' ? await bodyText(request) : undefined,
    requestContext: {
      requestId: 'full-local',
      authorizer: { jwt: { claims: { sub: owner, username: `Google_${owner}` } } },
    },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer);
}
export function fullServer() {
  fullConfiguration();
  return createServer((request, response) => {
    const send = (status: number, value: unknown, headers = {}) => {
      response.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...headers,
      });
      response.end(JSON.stringify(value));
    };
    void (async () => {
      if (!validLocalRequest(request)) return send(403, { message: 'Full local requests only.' });
      const url = new URL(request.url ?? '/', 'http://127.0.0.1:4176');
      const route = `${request.method} ${url.pathname}`;
      if (route === 'GET /v1/dev/session') {
        const session = sessionFor(url.searchParams.get('account'));
        return send(session ? 200 : 403, session ?? { message: 'Unknown test account.' });
      }
      const owner = authenticatedOwner(request);
      if (!owner)
        return send(401, { message: 'Reload the local preview to renew its test session.' });
      if (route === 'GET /v1/dev/status')
        return send(200, {
          mode: fullConfiguration().mode,
          namespace: fullConfiguration().namespace,
          model: process.env.CLASSIFIER_MODEL,
          ...faults(owner),
        });
      if (request.method === 'POST' && request.headers['content-type'] !== 'application/json')
        return send(415, { message: 'JSON required.' });
      if (route === 'POST /v1/dev/controls') {
        Object.assign(faults(owner), controlsSchema.parse(JSON.parse(await bodyText(request))));
        return send(200, faults(owner));
      }
      if (route === 'POST /v1/dev/tick') {
        await tick();
        return send(200, { processed: true });
      }
      const result = await application(request, owner, url.pathname);
      response.writeHead(result.statusCode ?? 500, result.headers as Record<string, string>);
      response.end(result.body);
    })().catch((error) =>
      send(error instanceof Error && error.message === 'body-limit' ? 413 : 400, {
        message: 'Invalid local test request.',
      }),
    );
  });
}
