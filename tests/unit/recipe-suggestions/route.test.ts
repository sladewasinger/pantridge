import { beforeEach, expect, it, vi } from 'vitest';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { request } from './fixtures';
import { AccessError } from '../../../api/access/config';
const mocks = vi.hoisted(() => ({
  protectRequest: vi.fn(),
  recordMalformed: vi.fn(),
  resolveNutrition: vi.fn(),
  resolveRecipeSuggestions: vi.fn(),
  resolveProduct: vi.fn(),
  read: vi.fn(),
  mutate: vi.fn(),
}));
vi.mock('../../../api/access/protection', () => mocks);
vi.mock('../../../api/products/nutrition-estimate', () => mocks);
vi.mock('../../../api/recipes/suggest', () => mocks);
vi.mock('../../../api/products/resolve', () => mocks);
vi.mock('../../../api/repository', () => mocks);
import { handler } from '../../../api/handler';
const event = (sub?: string): APIGatewayProxyEventV2WithJWTAuthorizer => ({
  version: '2.0',
  rawPath: '/v1/products/resolve',
  rawQueryString: '',
  headers: {},
  isBase64Encoded: false,
  routeKey: 'POST /v1/products/resolve',
  body: JSON.stringify(request),
  requestContext: {
    accountId: 'test',
    apiId: 'test',
    domainName: 'api.test',
    domainPrefix: 'api',
    http: {
      method: 'POST',
      path: '/v1/products/resolve',
      protocol: 'HTTP/1.1',
      sourceIp: '127.0.0.1',
      userAgent: 'test',
    },
    routeKey: 'POST /v1/products/resolve',
    stage: '$default',
    time: '',
    timeEpoch: 0,
    requestId: 'test',
    authorizer: {
      principalId: sub ?? '',
      integrationLatency: 0,
      jwt: { scopes: [], claims: { ...(sub ? { sub } : {}), username: 'Google_user' } },
    },
  },
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.protectRequest.mockResolvedValue(undefined);
  mocks.resolveRecipeSuggestions.mockResolvedValue({ recipes: [] });
});
it('requires a verified subject and existing admission protection before recipe generation', async () => {
  expect((await handler(event())).statusCode).toBe(401);
  expect(mocks.resolveRecipeSuggestions).not.toHaveBeenCalled();
  const response = await handler(event('owner'));
  expect(response.statusCode).toBe(200);
  expect(response.headers).toMatchObject({ 'Cache-Control': 'no-store' });
  expect(mocks.protectRequest).toHaveBeenCalledWith('owner', 'Google_user');
  expect(mocks.resolveRecipeSuggestions).toHaveBeenCalledWith('owner', request);
  mocks.protectRequest.mockRejectedValueOnce(new AccessError(403, 'Access blocked.'));
  expect((await handler(event('blocked-owner'))).statusCode).toBe(403);
  expect(mocks.resolveRecipeSuggestions).toHaveBeenCalledTimes(1);
  expect(mocks.resolveProduct).not.toHaveBeenCalled();
  expect(mocks.resolveNutrition).not.toHaveBeenCalled();
  expect(mocks.read).not.toHaveBeenCalled();
  expect(mocks.mutate).not.toHaveBeenCalled();
});
it('always uses the verified account and bounds encoded request size before any paid call', async () => {
  await handler(event('owner-a'));
  await handler(event('owner-b'));
  expect(mocks.resolveRecipeSuggestions.mock.calls.map(([owner]) => owner)).toEqual([
    'owner-a',
    'owner-b',
  ]);
  const large = event('owner-a');
  large.isBase64Encoded = true;
  large.body = Buffer.from(JSON.stringify({ ...request, extra: 'x'.repeat(17000) })).toString(
    'base64',
  );
  expect((await handler(large)).statusCode).toBe(413);
  expect(mocks.recordMalformed).toHaveBeenCalledWith('owner-a');
  expect(mocks.resolveRecipeSuggestions).toHaveBeenCalledTimes(2);
});
it('does not add an unauthenticated or unconfigured recipe route and preserves nutrition routing', async () => {
  const other = event('owner');
  other.routeKey = 'POST /v1/recipes';
  expect((await handler(other)).statusCode).toBe(404);
  expect(mocks.resolveRecipeSuggestions).not.toHaveBeenCalled();
  const nutrition = event('owner');
  nutrition.body = JSON.stringify({ kind: 'nutrition', name: 'Eggs', details: '' });
  await handler(nutrition);
  expect(mocks.resolveNutrition).toHaveBeenCalledWith('owner', {
    kind: 'nutrition',
    name: 'Eggs',
    details: '',
  });
  expect(mocks.resolveRecipeSuggestions).not.toHaveBeenCalled();
});
