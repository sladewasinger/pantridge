import { beforeEach, expect, it, vi } from 'vitest';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
const mocks = vi.hoisted(() => ({
  protectRequest: vi.fn(),
  recordMalformed: vi.fn(),
  resolveNutrition: vi.fn(),
  resolveProduct: vi.fn(),
  read: vi.fn(),
  mutate: vi.fn(),
}));
vi.mock('../../../api/access/protection', () => mocks);
vi.mock('../../../api/products/nutrition-estimate', () => mocks);
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
  body: JSON.stringify({ kind: 'nutrition', name: 'Ground beef', details: '' }),
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
  mocks.resolveNutrition.mockResolvedValue({ estimate: null });
});
it('requires verified identity and applies existing admission and abuse protection to nutrition requests', async () => {
  expect((await handler(event())).statusCode).toBe(401);
  expect(mocks.resolveNutrition).not.toHaveBeenCalled();
  expect((await handler(event('owner'))).statusCode).toBe(200);
  expect(mocks.protectRequest).toHaveBeenCalledWith('owner', 'Google_user');
  expect(mocks.resolveNutrition).toHaveBeenCalledWith('owner', {
    kind: 'nutrition',
    name: 'Ground beef',
    details: '',
  });
  expect(mocks.resolveProduct).not.toHaveBeenCalled();
  mocks.protectRequest.mockRejectedValueOnce(new Error('Blocked'));
  await handler(event('owner'));
  expect(mocks.resolveNutrition).toHaveBeenCalledTimes(1);
});
