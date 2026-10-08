import { beforeEach, expect, it, vi } from 'vitest';
const { requestStructured } = vi.hoisted(() => ({ requestStructured: vi.fn() }));
vi.mock('../../../api/products/ai', () => ({ requestStructured }));
import { classifyBatch } from '../../../api/standardization/classify';
const evidence = { name: 'Unfamiliar rice', brand: '', details: '', context: 'product' as const };
const result = { status: 'recognized', identity: 'rice', preparation: 'cooked', reason: '' };
beforeEach(() => {
  requestStructured.mockReset();
  vi.unstubAllEnvs();
});
it('uses the food recognition reasoning override without changing interactive reasoning', async () => {
  vi.stubEnv('CLASSIFIER_REASONING_EFFORT', 'low');
  vi.stubEnv('STANDARDIZATION_REASONING_EFFORT', 'medium');
  requestStructured.mockResolvedValue({ items: [{ index: 0, result }] });
  await classifyBatch('owner', [evidence]);
  expect(requestStructured).toHaveBeenLastCalledWith(
    'owner',
    expect.objectContaining({ reasoningEffort: 'medium' }),
  );
  expect(process.env.CLASSIFIER_REASONING_EFFORT).toBe('low');
  vi.stubEnv('STANDARDIZATION_REASONING_EFFORT', '');
  await classifyBatch('owner', [evidence]);
  expect(requestStructured).toHaveBeenLastCalledWith(
    'owner',
    expect.objectContaining({ reasoningEffort: 'low' }),
  );
});
it('classifies 25 items in one call and rejects 26 before contacting the provider', async () => {
  requestStructured.mockResolvedValue({
    items: Array.from({ length: 25 }, (_, index) => ({ index, result })).reverse(),
  });
  expect(
    await classifyBatch(
      'owner',
      Array.from({ length: 25 }, () => evidence),
    ),
  ).toHaveLength(25);
  expect(requestStructured).toHaveBeenCalledTimes(1);
  await expect(
    classifyBatch(
      'owner',
      Array.from({ length: 26 }, () => evidence),
    ),
  ).rejects.toThrow();
  expect(requestStructured).toHaveBeenCalledTimes(1);
});
it('uses bounded structured output and accepts only complete indexed results', async () => {
  requestStructured.mockResolvedValue({ items: [{ index: 0, result }] });
  expect(await classifyBatch('owner', [evidence])).toEqual([result]);
  expect(requestStructured).toHaveBeenCalledWith(
    'owner',
    expect.objectContaining({ maxOutputTokens: 2048, deadlineMs: 15000 }),
  );
  expect(JSON.stringify(requestStructured.mock.calls[0]![1].schema)).not.toContain('oneOf');
  requestStructured.mockResolvedValue({
    items: [
      { index: 0, result },
      { index: 0, result },
    ],
  });
  await expect(classifyBatch('owner', [evidence, evidence])).rejects.toMatchObject({ status: 502 });
});
it.each([
  { ...result, identity: null },
  { ...result, status: 'uncertain' },
  { ...result, preparation: 'any' },
  { ...result, identity: 'invented-food' },
])('rejects inconsistent, ungrounded or unspecified product output', async (invalid) => {
  requestStructured.mockResolvedValue({ items: [{ index: 0, result: invalid }] });
  await expect(classifyBatch('owner', [evidence])).rejects.toMatchObject({ status: 502 });
});
