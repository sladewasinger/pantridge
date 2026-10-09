import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { expandedKitchen, newResult } from './fixtures';
import { ProductError } from '../../../api/products/errors';
const mocks = vi.hoisted(() => ({
  protectRequest: vi.fn(),
  recordMalformed: vi.fn(),
  read: vi.fn(),
  mutate: vi.fn(),
  resolveRecipeSuggestions: vi.fn(),
  resolveStandardization: vi.fn(),
  lookupCatalog: vi.fn(),
}));
vi.mock('../../../api/access/protection', () => mocks);
vi.mock('../../../api/repository', () => mocks);
vi.mock('../../../api/recipes/suggest', () => mocks);
vi.mock('../../../api/standardization/resolve', () => mocks);
vi.mock('../../../api/standardization/catalog', () => mocks);
import { handler } from '../../../api/handler';
function event(routeKey = 'GET /v1/kitchen', revision?: string) {
  return {
    routeKey,
    queryStringParameters: { catalogRevision: revision },
    requestContext: {
      requestId: 'test',
      authorizer: { jwt: { claims: { sub: 'trusted-owner' } } },
    },
    body: JSON.stringify({ id: crypto.randomUUID(), command: { type: 'classification.retry' } }),
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockResolvedValue({ revision: 8, data: expandedKitchen() });
  mocks.mutate.mockResolvedValue({ revision: 9, data: expandedKitchen() });
});
afterEach(() => vi.unstubAllEnvs());
it.each([undefined, 'bad', '2'])(
  'negotiates GET and acknowledged mutation projections for revision %s',
  async (revision) => {
    for (const route of ['GET /v1/kitchen', 'POST /v1/mutations']) {
      const response = await handler(event(route, revision));
      expect(response.statusCode).toBe(200);
      const saved = JSON.parse(response.body!);
      expect(saved.data.foods[0].standardization.identity).toBe(
        revision === '2' ? 'raspberries' : null,
      );
      expect(saved.revision).toBe(route.startsWith('GET') ? 8 : 9);
    }
    expect(mocks.mutate).toHaveBeenCalledWith(
      'trusted-owner',
      expect.anything(),
      revision === '2' ? 2 : 1,
    );
  },
);
it('returns a clear upgrade error without counting a legitimate legacy edit as malformed', async () => {
  mocks.mutate.mockRejectedValueOnce(
    new ProductError(
      426,
      'Update the app to sync this kitchen. Your changes are saved on this device.',
    ),
  );
  const response = await handler(event('POST /v1/mutations'));
  expect(response.statusCode).toBe(426);
  expect(JSON.parse(response.body!).message).toContain('Update the app');
  expect(mocks.recordMalformed).not.toHaveBeenCalled();
});
it('projects recipe suggestion descriptors for older clients without another provider call', async () => {
  const request = event('POST /v1/products/resolve');
  request.body = JSON.stringify({ kind: 'recipe' });
  mocks.resolveRecipeSuggestions.mockResolvedValue({ recipes: expandedKitchen().recipes });
  const response = await handler(request);
  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.body!).recipes[0].ingredients[0].ingredient).toBeUndefined();
  expect(mocks.resolveRecipeSuggestions).toHaveBeenCalledTimes(1);
  expect(mocks.protectRequest).toHaveBeenCalledWith('trusted-owner', undefined);
});
it.each(['standardization', 'classification-catalog'])(
  'projects new IDs in %s responses for legacy callers',
  async (kind) => {
    vi.stubEnv('STANDARDIZATION_ENABLED', 'true');
    mocks.resolveStandardization.mockResolvedValue({
      items: [{ key: 'food:test', result: newResult }],
    });
    mocks.lookupCatalog.mockResolvedValue({ candidates: [{ result: newResult }], limit: 10 });
    const request = event('POST /v1/products/resolve');
    request.body = JSON.stringify({ kind });
    const response = await handler(request);
    const parsed = JSON.parse(response.body!);
    expect(response.statusCode).toBe(200);
    const result = parsed.items?.[0].result ?? parsed.candidates[0].result;
    expect(result).toMatchObject({ status: 'unknown', identity: null, preparation: 'unknown' });
    expect(newResult.identity).toBe('raspberries');
  },
);
