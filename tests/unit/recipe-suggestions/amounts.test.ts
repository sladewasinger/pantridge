import { expect, it } from 'vitest';
import type { RecipeUnit } from '../../../src/domain/recipes/model';
import { plausibleIngredientAmount } from '../../../api/recipes/amounts';
import {
  suggestionOutputSchema,
  validSuggestions,
  previewRecipes,
} from '../../../api/recipes/output';
import {
  recipeSuggestionRequestSchema,
  recipeSuggestionResultSchema,
} from '../../../src/domain/recipe-suggestions/model';
import { generated, request } from './fixtures';

it.each<[string, number, RecipeUnit, number]>([
  ['Salt', 5000, 'kg', 1],
  ['Salt', 50, 'g', 2],
  ['Salt', 2, 'tbsp', 2],
  ['Salt', 1, 'count', 2],
  ['Kosher salt', 3, 'tbsp', 6],
  ['Black pepper', 100, 'g', 2],
  ['Cumin', 5, 'cup', 6],
  ['Paprika', 1, 'count', 2],
  ['Milk', 5000, 'l', 1],
  ['Milk', 10, 'gal', 2],
  ['Rice', 5000, 'kg', 6],
  ['Eggs', 100, 'count', 2],
  ['Olive oil', 1000, 'ml', 2],
  ['Sugar', 1, 'kg', 1],
])('rejects implausible %s amounts: %s %s / %s servings', (name, quantity, unit, servings) => {
  expect(plausibleIngredientAmount({ name, quantity, unit }, servings)).toBe(false);
});
it.each<[string, number, RecipeUnit, number]>([
  ['Salt', 0.5, 'tsp', 2],
  ['Sea salt', 0.01, 'kg', 2],
  ['Black pepper', 1, 'tsp', 2],
  ['Rice', 0.3, 'kg', 2],
  ['Milk', 1, 'l', 2],
  ['Milk', 0.25, 'gal', 2],
  ['Eggs', 4, 'count', 2],
  ['Olive oil', 2, 'tbsp', 2],
  ['Butter', 4, 'oz', 4],
])(
  'accepts plausible dimension-preserving %s amounts: %s %s / %s servings',
  (name, quantity, unit, servings) => {
    expect(plausibleIngredientAmount({ name, quantity, unit }, servings)).toBe(true);
  },
);
it('rejects a structurally valid model recipe with excessive quantities before preview or caching', () => {
  const output = suggestionOutputSchema.parse({
    recipes: [
      {
        ...generated.recipes[0],
        ingredients: [
          ...generated.recipes[0]!.ingredients,
          { name: 'Salt', quantity: 5000, unit: 'kg', note: '' },
        ],
      },
    ],
  });
  expect(validSuggestions(output, recipeSuggestionRequestSchema.parse(request))).toBe(false);
});
it('requires AI provenance and no source URL in the browser result contract', () => {
  const result = previewRecipes(suggestionOutputSchema.parse(generated));
  expect(recipeSuggestionResultSchema.safeParse(result).success).toBe(true);
  expect(
    recipeSuggestionResultSchema.safeParse({
      recipes: [{ ...result.recipes[0], source: 'manual' }],
    }).success,
  ).toBe(false);
  expect(
    recipeSuggestionResultSchema.safeParse({
      recipes: [{ ...result.recipes[0], sourceUrl: 'https://example.com' }],
    }).success,
  ).toBe(false);
});
