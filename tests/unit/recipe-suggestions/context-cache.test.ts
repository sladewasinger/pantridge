import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { generated, request } from './fixtures';
import { emptyPreferences } from '../../../src/domain/recipe-preferences/model';
const mocks = vi.hoisted(() => ({
  requestStructured: vi.fn(),
  cachedResult: vi.fn(),
  cacheResult: vi.fn(),
}));
vi.mock('../../../api/products/ai', () => mocks);
vi.mock('../../../api/products/cache', () => mocks);
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('PRODUCT_TABLE', 'test');
  vi.stubEnv('CLASSIFIER_PROVIDER', 'openai');
  mocks.cachedResult.mockResolvedValue(null);
  mocks.requestStructured.mockResolvedValue(generated);
});
afterEach(() => vi.unstubAllEnvs());
it('includes exact members, preferences and cookbook foundations in a private versioned cache', async () => {
  const { resolveRecipeSuggestions } = await import('../../../api/recipes/suggest');
  const input = {
    ...request,
    inventory: [
      { name: 'Eggs', members: ['Eggs'] },
      { name: 'Butter', members: ['Butter'] },
    ],
    preferences: emptyPreferences(),
  };
  await resolveRecipeSuggestions('one', input);
  await resolveRecipeSuggestions('one', {
    ...input,
    preferences: { ...input.preferences, directions: ['quick'] },
  });
  await resolveRecipeSuggestions('one', {
    ...input,
    inventory: [
      { name: 'Eggs', members: ['Eggs', 'Egg'] },
      { name: 'Butter', members: ['Butter'] },
    ],
  });
  await resolveRecipeSuggestions('one', {
    ...input,
    bases: [
      {
        key: 'base-1',
        title: 'Known eggs',
        servings: 2,
        minutes: 10,
        ingredients: [{ name: 'Eggs', quantity: 4, unit: 'count', note: '' }],
        steps: ['Cook the eggs thoroughly.'],
      },
    ],
  });
  expect(new Set(mocks.cachedResult.mock.calls.map(([key]) => key)).size).toBe(4);
  expect(
    mocks.cachedResult.mock.calls.every(([key]) => String(key).startsWith('private-recipes#v3#')),
  ).toBe(true);
  const options = mocks.requestStructured.mock.calls[3]![1];
  expect(options).toMatchObject({ maxOutputTokens: 2048, deadlineMs: 15000 });
  expect(options.input.bases[0]).not.toHaveProperty('sourceUrl');
  expect(JSON.stringify(options.input)).not.toContain('one');
});
it('does not return or cache recipes conflicting with restrictions or unknown foundation keys', async () => {
  const { resolveRecipeSuggestions } = await import('../../../api/recipes/suggest');
  await expect(
    resolveRecipeSuggestions('one', {
      ...request,
      preferences: { ...emptyPreferences(), restrictions: ['egg'] },
    }),
  ).rejects.toThrow('could not be validated');
  mocks.requestStructured.mockResolvedValue({
    recipes: [{ ...generated.recipes[0], basisKey: 'base-3', reason: '' }],
  });
  await expect(resolveRecipeSuggestions('one', request)).rejects.toThrow('could not be validated');
  expect(mocks.cacheResult).not.toHaveBeenCalled();
});
