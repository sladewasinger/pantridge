import { beforeEach, expect, it, vi } from 'vitest';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { handler } from '../../../api/handler';
import { AccessError } from '../../../api/access/config';
const mocks = vi.hoisted(() => ({
  protectRequest: vi.fn(),
  recordMalformed: vi.fn(),
  read: vi.fn(),
  mutate: vi.fn(),
  resolveProduct: vi.fn(),
}));
vi.mock('../../../api/access/protection', () => mocks);
vi.mock('../../../api/repository', () => mocks);
vi.mock('../../../api/products/resolve', () => mocks);
beforeEach(() => vi.resetAllMocks());
const event = {
  routeKey: 'POST /v1/products/resolve',
  body: '{"barcode":"3017620422003"}',
  requestContext: {
    requestId: 'test',
    authorizer: { jwt: { claims: { sub: 'trusted', username: 'Google_1' } } },
  },
} as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
it('enforces cooldown before model, catalog or inventory access and exposes Retry-After', async () => {
  mocks.protectRequest.mockRejectedValue(new AccessError(429, 'Wait', 60));
  const response = await handler(event);
  expect(response.statusCode).toBe(429);
  expect(response.headers?.['Retry-After']).toBe('60');
  expect(mocks.resolveProduct).not.toHaveBeenCalled();
  expect(mocks.mutate).not.toHaveBeenCalled();
  expect(mocks.read).not.toHaveBeenCalled();
});
it('attributes bad payloads to the verified subject and returns suspension when the strike limit is reached', async () => {
  mocks.recordMalformed.mockRejectedValue(new AccessError(403, 'Suspended'));
  const response = await handler({ ...event, body: 'x'.repeat(20000) });
  expect(mocks.recordMalformed).toHaveBeenCalledWith('trusted');
  expect(response.statusCode).toBe(403);
  expect(mocks.resolveProduct).not.toHaveBeenCalled();
});
