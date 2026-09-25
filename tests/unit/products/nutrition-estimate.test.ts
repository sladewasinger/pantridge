import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  cachedResult: vi.fn(),
  cacheResult: vi.fn(),
  takeQuota: vi.fn(),
}));
vi.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: class {
    send = mocks.send;
  },
  GetParameterCommand: class {
    constructor(public input: unknown) {}
  },
}));
vi.mock('../../../api/products/cache', () => mocks);
const request = { kind: 'nutrition', name: 'Ground beef', details: '90% lean, raw' };
const values = {
  basis: 'g',
  per100: {
    calories: 200,
    fat: 10,
    saturatedFat: 4,
    carbohydrates: 0,
    sugars: 0,
    fiber: null,
    protein: 20,
    sodium: 50,
  },
  assumptions: 'Example test fixture, raw and 90% lean.',
};
const output = (value: unknown) =>
  Response.json({
    status: 'completed',
    output: [{ content: [{ type: 'output_text', text: JSON.stringify(value) }] }],
  });
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('PRODUCT_TABLE', 'products');
  vi.stubEnv('CLASSIFIER_PROVIDER', 'openai');
  vi.stubEnv('CLASSIFIER_MODEL', 'gpt-5.6-luna');
  vi.stubEnv('CLASSIFIER_REASONING_EFFORT', 'low');
  vi.stubEnv('CLASSIFIER_MAX_OUTPUT_TOKENS', '1024');
  mocks.send.mockResolvedValue({ Parameter: { Value: 'test-key' } });
  mocks.cachedResult.mockResolvedValue(null);
  mocks.takeQuota.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it('uses the existing secret, model, shared quotas and bounded structured output without sending identity', async () => {
  const fetcher = vi.fn().mockResolvedValue(output({ estimate: values }));
  vi.stubGlobal('fetch', fetcher);
  const { resolveNutrition } = await import('../../../api/products/nutrition-estimate');
  const result = await resolveNutrition('private-owner', request);
  expect(result.estimate).toMatchObject({
    ...values,
    name: request.name,
    source: 'ai',
    details: request.details,
  });
  const body = JSON.parse(fetcher.mock.calls[0]![1].body as string);
  expect(body).toMatchObject({
    model: 'gpt-5.6-luna',
    reasoning: { effort: 'low' },
    max_output_tokens: 1024,
    store: false,
    text: { format: { strict: true } },
  });
  expect(body.instructions).toContain('untrusted');
  expect(JSON.stringify(body)).not.toContain('private-owner');
  expect(mocks.takeQuota.mock.calls).toEqual([
    ['ai-user#private-owner', 20],
    ['ai-global', 100],
  ]);
  expect(mocks.cacheResult).toHaveBeenCalledWith(
    expect.stringMatching(/^private-nutrition#v1#/),
    result,
    30,
  );
});
it('isolates cached estimates by owner and input and reuses them without another paid call', async () => {
  const fetcher = vi.fn().mockImplementation(() => output({ estimate: values }));
  vi.stubGlobal('fetch', fetcher);
  const { resolveNutrition } = await import('../../../api/products/nutrition-estimate');
  const result = await resolveNutrition('owner-a', request);
  await resolveNutrition('owner-b', request);
  await resolveNutrition('owner-a', { ...request, details: 'cooked' });
  expect(new Set(mocks.cachedResult.mock.calls.map((call) => call[0])).size).toBe(3);
  mocks.cachedResult.mockResolvedValue(result);
  expect(
    (await resolveNutrition('owner-a', { ...request, name: 'GROUND BEEF' })).estimate?.name,
  ).toBe('GROUND BEEF');
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it('rejects invalid requests, provider overrides and disabled estimation before spending', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const { resolveNutrition } = await import('../../../api/products/nutrition-estimate');
  await expect(resolveNutrition('owner', { ...request, model: 'expensive' })).rejects.toThrow();
  await expect(
    resolveNutrition('owner', { ...request, details: 'x'.repeat(201) }),
  ).rejects.toThrow();
  vi.stubEnv('CLASSIFIER_PROVIDER', 'none');
  await expect(resolveNutrition('owner', request)).rejects.toThrow('not configured');
  expect(fetcher).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
});
it('does not fetch on quota exhaustion or cache incomplete and inconsistent results', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      output({ estimate: { ...values, per100: { ...values.per100, sugars: 30 } } }),
    );
  vi.stubGlobal('fetch', fetcher);
  const { resolveNutrition } = await import('../../../api/products/nutrition-estimate');
  mocks.takeQuota.mockRejectedValueOnce(new Error('Daily limit reached'));
  await expect(resolveNutrition('owner', request)).rejects.toThrow('Daily limit');
  expect(fetcher).not.toHaveBeenCalled();
  await expect(resolveNutrition('owner', request)).rejects.toThrow('inconsistent');
  fetcher.mockResolvedValueOnce(
    Response.json({
      status: 'incomplete',
      output: [{ content: [{ type: 'output_text', text: JSON.stringify({ estimate: values }) }] }],
    }),
  );
  await expect(resolveNutrition('owner', request)).rejects.toThrow('Could not estimate');
  expect(mocks.cacheResult).not.toHaveBeenCalled();
});
it('allows explicit no-estimate results and never exposes provider failures or credentials', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(output({ estimate: null }))
    .mockRejectedValueOnce(new Error('test-key sensitive provider error'));
  vi.stubGlobal('fetch', fetcher);
  const { resolveNutrition } = await import('../../../api/products/nutrition-estimate');
  expect(await resolveNutrition('owner', { ...request, name: 'Paper towels' })).toEqual({
    estimate: null,
  });
  await expect(resolveNutrition('owner', request)).rejects.toThrow('temporarily unavailable');
});
