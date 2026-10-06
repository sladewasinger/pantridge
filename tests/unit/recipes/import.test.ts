import { describe, expect, it } from 'vitest';
import { importRecipe } from '../../../src/domain/recipes/import';
import { parseIngredient } from '../../../src/domain/recipes/import-ingredient';
import { sourceUrl } from '../../../src/domain/recipes/import-source';
const id = 'fed00000-0000-4000-8000-000000000000';
const options = {
  id,
  ingredientId: (index: number) => `fed00000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
};
const text = 'Eggs\nServings: 3\nIngredients\n1 1/2 cup milk\n2 eggs\nSteps\n1. Whisk.\n2. Cook.';
describe('reviewed local recipe imports', () => {
  it('parses plain text and fractional quantities without creating inventory', () => {
    const recipe = importRecipe(text, options);
    expect(recipe.source).toBe('import');
    expect(recipe.servings).toBe(3);
    expect(recipe.ingredients.map(({ quantity, unit }) => ({ quantity, unit }))).toEqual([
      { quantity: 1.5, unit: 'cup' },
      { quantity: 2, unit: 'count' },
    ]);
    expect(recipe.steps).toEqual(['Whisk.', 'Cook.']);
  });
  it('supports Unicode fractions and fluid-ounce measures', () => {
    expect(parseIngredient('½ cup milk', id)).toMatchObject({
      quantity: 0.5,
      unit: 'cup',
      name: 'milk',
    });
    expect(parseIngredient('1½ fl oz milk', id)).toMatchObject({
      quantity: 1.5,
      unit: 'fl oz',
      name: 'milk',
    });
  });
  it('keeps package sizes uncertain instead of treating a can as a bean', () => {
    expect(parseIngredient('1 can black beans', id)).toMatchObject({
      name: 'black beans',
      quantity: 1,
      unit: 'package',
    });
    expect(parseIngredient('1 can black beans', id).note).toContain('Review');
  });
  it('reads JSON-LD graphs and nested steps while replacing supplied IDs', () => {
    const recipe = importRecipe(
      JSON.stringify({
        '@graph': [
          {
            '@type': ['Recipe'],
            name: 'Rice',
            recipeIngredient: ['100 g rice'],
            recipeYield: '4 servings',
            recipeInstructions: [
              {
                '@type': 'HowToSection',
                itemListElement: [{ '@type': 'HowToStep', text: 'Boil.' }],
              },
            ],
            url: 'https://example.com/rice',
          },
        ],
      }),
      options,
    );
    expect(recipe).toMatchObject({
      id,
      title: 'Rice',
      servings: 4,
      steps: ['Boil.'],
      sourceUrl: 'https://example.com/rice',
    });
    expect(recipe.ingredients[0]?.id).toBe(options.ingredientId(0));
  });
  it('rejects unclear ingredients, invalid fractions, excessive input and active source schemes', () => {
    expect(() => parseIngredient('salt to taste', id)).toThrow('numeric amount');
    expect(() => parseIngredient('1/0 cup rice', id)).toThrow('Review');
    expect(() => importRecipe('x'.repeat(50_001), options)).toThrow('under 50,000');
    expect(() => sourceUrl('javascript:alert(1)')).toThrow();
    expect(() => sourceUrl('https://user:password@example.com')).toThrow();
    expect(() => importRecipe('{broken', options)).toThrow('incomplete');
  });
  it('treats hostile instructions as inert text, never as executable markup', () => {
    const recipe = importRecipe(text.replace('Whisk.', '<script>alert(1)</script>'), options);
    expect(recipe.steps[0]).toBe('<script>alert(1)</script>');
    expect(() => importRecipe(text, { ...options, source: 'data:text/html,abc' })).toThrow();
  });
});
