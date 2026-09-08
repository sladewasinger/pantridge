import { beforeEach, expect, it, vi } from 'vitest';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { handler } from '../../api/handler';
const { read, mutate } = vi.hoisted(() => ({ read: vi.fn(), mutate: vi.fn() }));
vi.mock('../../api/repository', () => ({ read, mutate }));
beforeEach(() => {
  vi.clearAllMocks();
  read.mockResolvedValue({ revision: 0 });
  mutate.mockResolvedValue({ revision: 1 });
});

function request(subject: string | undefined, routeKey = 'GET /v1/kitchen') {
  return {
    routeKey,
    queryStringParameters: { owner: 'another-account', sub: 'another-account' },
    requestContext: { requestId: 'test', authorizer: { jwt: { claims: { sub: subject } } } },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      owner: 'another-account',
      command: {
        type: 'stock.adjust',
        stockId: crypto.randomUUID(),
        delta: 1,
      },
    }),
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}
it('selects each kitchen from the authenticated subject, ignoring caller-selected accounts', async () => {
  await handler(request('account-one'));
  await handler(request('account-two'));
  expect(read.mock.calls).toEqual([['account-one'], ['account-two']]);
});
it('writes only to the authenticated account even if a different owner is in the body', async () => {
  await handler(request('account-one', 'POST /v1/mutations'));
  expect(mutate).toHaveBeenCalledWith('account-one', expect.any(Object));
});
it('never accesses persistence without an authenticated subject', async () => {
  expect((await handler(request(undefined))).statusCode).toBe(401);
  expect(read).not.toHaveBeenCalled();
  expect(mutate).not.toHaveBeenCalled();
});
it('rejects oversized and malformed authenticated mutations before persistence', async () => {
  const event = request('account-one', 'POST /v1/mutations');
  event.body = 'x'.repeat(16_385);
  expect((await handler(event)).statusCode).toBe(413);
  event.body = Buffer.from(event.body).toString('base64');
  event.isBase64Encoded = true;
  expect((await handler(event)).statusCode).toBe(413);
  event.isBase64Encoded = false;
  event.body = '{invalid';
  expect((await handler(event)).statusCode).toBe(400);
  expect(mutate).not.toHaveBeenCalled();
});
