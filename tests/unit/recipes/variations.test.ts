import { expect, it } from 'vitest';
import { emptySnapshot } from '../../../src/domain/model';
import { emptyPreferences } from '../../../src/domain/recipe-preferences/model';
import { recipeVariations } from '../../../src/domain/recipe-variations/options';
import { applyVariation } from '../../../src/domain/recipe-variations/apply';
import { withCalculatedNutrition } from '../../../src/domain/recipe-nutrition/calculate';
import { starterRecipes } from '../../../src/domain/recipes/starters';
import { egg } from '../fixtures';

it('offers measured butter alternatives with preparation changes and explicitly applied nutrition', () => {
  const recipe = starterRecipes[0]!;
  const data = emptySnapshot();
  const options = recipeVariations(data, recipe, emptyPreferences(), '2026-10-06');
  const swap = options.substitutions.find((item) => item.ingredient.name === 'Olive oil')!;
  expect(swap.stocked).toBe(false);
  expect(swap.ingredient.quantity).toBe(0.75);
  const before = structuredClone(recipe);
  const changed = withCalculatedNutrition(data, applyVariation(recipe, swap, crypto.randomUUID()));
  expect(changed.ingredients[1]!.name).toBe('Olive oil');
  expect(changed.steps.join(' ')).not.toMatch(/\bbutter\b/i);
  expect(changed.nutrition!.source).toBe('calculated');
  expect(recipe).toEqual(before);
  expect(data).toEqual(emptySnapshot());
});
it('keeps bean forms compatible, adds brown-rice preparation time, and never substitutes in baking', () => {
  const rice = {
    ...starterRecipes[1]!,
    ingredients: [{ ...starterRecipes[1]!.ingredients[0]!, name: 'White rice' }],
  };
  const data = {
    ...emptySnapshot(),
    foods: [{ ...egg, name: 'Brown rice' }],
    stock: [{ id: crypto.randomUUID(), foodId: egg.id, quantity: 1 }],
  };
  const option = recipeVariations(data, rice, emptyPreferences(), '2026-10-06').substitutions[0]!;
  expect(option.minutes).toBe(25);
  expect(option.preparation).toContain('package water ratio');
  expect(applyVariation(rice, option, crypto.randomUUID()).minutes).toBe(55);
  const cooked = { ...rice, ingredients: [{ ...rice.ingredients[0]!, name: 'Cooked white rice' }] };
  const ready = { ...data, foods: [{ ...data.foods[0]!, name: 'Cooked brown rice' }] };
  const readyOption = recipeVariations(ready, cooked, emptyPreferences(), '2026-10-06')
    .substitutions[0]!;
  expect(readyOption.minutes).toBe(0);
  expect(readyOption.preparation).toContain('No additional grain cooking time');
  const beans = { ...rice, ingredients: [{ ...rice.ingredients[0]!, name: 'Dried black beans' }] };
  expect(recipeVariations(data, beans, emptyPreferences(), '2026-10-06').substitutions).toEqual([]);
  const cake = { ...starterRecipes[0]!, title: 'Cake', steps: ['Bake with the butter.'] };
  expect(recipeVariations(data, cake, emptyPreferences(), '2026-10-06').substitutions).toEqual([]);
});
it('prioritizes stocked pairings and filters dietary conflicts without mutating shopping', () => {
  const recipe = starterRecipes[0]!;
  const data = {
    ...emptySnapshot(),
    foods: [{ ...egg, name: 'Pumpkin seeds' }],
    stock: [{ id: crypto.randomUUID(), foodId: egg.id, quantity: 1 }],
  };
  const before = structuredClone(data);
  const options = recipeVariations(data, recipe, emptyPreferences(), '2026-10-06');
  expect(options.pairings[0]).toMatchObject({
    label: 'More crunch',
    stocked: true,
    ingredient: { quantity: 2, unit: 'tbsp' },
  });
  const changed = applyVariation(recipe, options.pairings[0]!, crypto.randomUUID());
  expect(changed.ingredients).toHaveLength(recipe.ingredients.length + 1);
  expect(changed.steps.at(-1)).toContain('Toast shelled');
  expect(data).toEqual(before);
  const avoid = recipeVariations(
    data,
    recipe,
    { ...emptyPreferences(), avoid: ['pumpkin seeds'] },
    '2026-10-06',
  );
  expect(avoid.pairings.some((item) => item.ingredient.name === 'Pumpkin seeds')).toBe(false);
});
