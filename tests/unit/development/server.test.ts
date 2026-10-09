import { request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { localServer } from '../../../api/development/server';

const handle = vi.fn(async (_input: unknown) => ({ statusCode: 200, body: { recipes: [] } }));
let server: ReturnType<typeof localServer>;
beforeEach(async () => {
  handle.mockClear();
  server = localServer(handle, 'http://127.0.0.1:5175');
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
});
afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
function send(method: string, path: string, headers: Record<string, string> = {}, body = '') {
  return new Promise<{
    status: number;
    body: Record<string, unknown>;
    headers: Record<string, unknown>;
  }>((resolve, reject) => {
    const client = request(
      {
        hostname: '127.0.0.1',
        port: (server.address() as AddressInfo).port,
        path,
        method,
        headers: { host: '127.0.0.1:4175', ...headers },
      },
      (response) => {
        let text = '';
        response.on('data', (chunk: Buffer) => {
          text += chunk.toString();
        });
        response.on('end', () =>
          resolve({
            status: response.statusCode!,
            body: JSON.parse(text) as Record<string, unknown>,
            headers: response.headers,
          }),
        );
      },
    );
    client.on('error', reject);
    client.end(body);
  });
}
async function token() {
  const result = await send('GET', '/v1/local/session', { 'sec-fetch-site': 'same-origin' });
  expect(result.status).toBe(200);
  return String(result.body.token);
}
const headers = (value: string) => ({
  origin: 'http://127.0.0.1:5175',
  'content-type': 'application/json',
  authorization: `Bearer ${value}`,
});
it('rejects foreign bootstrap, preflight and DNS-rebinding before invoking the handler', async () => {
  expect((await send('GET', '/v1/local/session')).status).toBe(403);
  expect((await send('GET', '/v1/local/session', { 'sec-fetch-site': 'cross-site' })).status).toBe(
    403,
  );
  expect(
    (
      await send('GET', '/v1/local/session', {
        'sec-fetch-site': 'same-origin',
        host: 'attacker.example:4175',
      })
    ).status,
  ).toBe(403);
  const preflight = await send('OPTIONS', '/v1/products/resolve', {
    origin: 'https://attacker.example',
  });
  expect(preflight.status).toBe(403);
  expect(preflight.headers['access-control-allow-origin']).toBeUndefined();
  expect(handle).not.toHaveBeenCalled();
});
it('requires the process nonce, exact origin, JSON and an allowed route', async () => {
  const value = await token();
  for (const overrides of [
    { authorization: '' },
    { authorization: 'Bearer wrong' },
    { origin: '' },
    { origin: 'https://attacker.example' },
    { 'content-type': 'text/plain' },
  ])
    expect(
      (await send('POST', '/v1/products/resolve', { ...headers(value), ...overrides }, '{}'))
        .status,
    ).toBe(403);
  expect((await send('POST', '/v1/mutations', headers(value), '{}')).status).toBe(403);
  expect(handle).not.toHaveBeenCalled();
  expect(
    (await send('POST', '/v1/products/resolve', headers(value), '{"kind":"recipe"}')).status,
  ).toBe(200);
  expect(handle).toHaveBeenCalledWith({ kind: 'recipe' });
});
it('bounds and validates bodies before paid work and rotates nonces between processes', async () => {
  const value = await token();
  expect(
    (await send('POST', '/v1/products/resolve', headers(value), 'x'.repeat(16_385))).status,
  ).toBe(413);
  expect((await send('POST', '/v1/products/resolve', headers(value), 'invalid')).status).toBe(400);
  expect(handle).not.toHaveBeenCalled();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  server = localServer(handle, 'http://127.0.0.1:5175');
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  expect((await send('POST', '/v1/products/resolve', headers(value), '{}')).status).toBe(403);
});
it('accepts catalog negotiation without weakening origin or nonce checks', async () => {
  const value = await token();
  const path = '/v1/products/resolve?catalogRevision=2';
  expect((await send('POST', path, headers(value), '{"kind":"recipe"}')).status).toBe(200);
  expect(
    (await send('POST', path, { ...headers(value), authorization: 'wrong' }, '{}')).status,
  ).toBe(403);
  expect(handle).toHaveBeenCalledTimes(1);
});
