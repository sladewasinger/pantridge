import { expect, it } from 'vitest';
import {
  recipePreferencesSchema,
  emptyPreferences,
  preferenceTargets,
} from '../../../src/domain/recipe-preferences/model';
import {
  dietaryAssessment,
  restrictionConflicts,
} from '../../../src/domain/recipe-preferences/restrictions';
import { buildSuggestionContext } from '../../../src/domain/recipe-suggestions/grounding';
import { recipeSuggestionRequestSchema } from '../../../src/domain/recipe-suggestions/model';
import {
  generationSchema,
  validSuggestions,
  suggestionOutputSchema,
} from '../../../api/recipes/output';
import { groundOutput } from '../../../api/recipes/preferences';
import { generated, request } from './fixtures';
import { egg, kitchen } from '../fixtures';
import { dietReviewKey } from '../../../src/domain/recipe-preferences/review';
import { recipe as savedRecipe } from '../recipes/fixtures';
import { assessRecipeDiet } from '../../../src/domain/recipe-preferences/assessment';

it('bounds optional preferences without permitting provider overrides or excessive targets', () => {
  expect(
    preferenceTargets({
      ...emptyPreferences(),
      directions: ['quick', 'high-protein', 'lower-carb'],
    }),
  ).toEqual({ minutes: 20, protein: 30, carbs: 30 });
  for (const change of [
    { maxMinutes: 900 },
    { minProtein: 1000 },
    { directions: ['quick', 'quick'] },
    { model: 'override' },
    { request: 'x'.repeat(161) },
  ])
    expect(recipePreferencesSchema.safeParse({ ...emptyPreferences(), ...change }).success).toBe(
      false,
    );
});
it('keeps gluten, dairy, lactose and allergens distinct while flagging unresolved package evidence', () => {
  const preferences = (restrictions: ReturnType<typeof emptyPreferences>['restrictions']) => ({
    ...emptyPreferences(),
    restrictions,
  });
  expect(restrictionConflicts('Gluten-free pasta', preferences(['celiac']))).toEqual([]);
  expect(restrictionConflicts('Wheat pasta', preferences(['celiac']))).toEqual(['celiac']);
  expect(restrictionConflicts('Lactose-free milk', preferences(['lactose-free']))).toEqual([]);
  expect(restrictionConflicts('Lactose-free milk', preferences(['milk']))).toEqual(['milk']);
  expect(
    restrictionConflicts('Unsweetened almond milk', preferences(['milk', 'tree-nut'])),
  ).toEqual(['tree-nut']);
  expect(restrictionConflicts('Honey', preferences(['vegan']))).toEqual(['vegan']);
  expect(dietaryAssessment(['Gluten-free pasta', 'Broccoli'], preferences(['celiac']))).toEqual({
    conflicts: [],
    labels: ['Gluten-free pasta'],
    crossContact: true,
  });
});
it('sends exact members and rejects generic family output or hard dietary conflicts', () => {
  const input = {
    ...request,
    kind: 'recipe' as const,
    inventory: [{ name: 'Rice', members: ['Brown rice', 'White rice'] }],
    preferences: { ...emptyPreferences(), restrictions: ['milk' as const] },
  };
  const schema = generationSchema(['Rice'], input);
  const names = schema.shape.recipes.element.shape.ingredients.element.shape.name.options;
  expect(names).toContain('Brown rice');
  expect(names).not.toContain('Rice');
  expect(names).not.toContain('Cheese');
  const recipe = {
    ...generated.recipes[0]!,
    ingredients: [{ name: 'Rice', quantity: 100, unit: 'g' as const, note: '' }],
    steps: ['Cook the rice following its package directions.'],
  };
  expect(validSuggestions({ recipes: [recipe] }, input)).toBe(false);
  expect(
    validSuggestions(
      {
        recipes: [{ ...recipe, ingredients: [{ ...recipe.ingredients[0]!, name: 'Brown rice' }] }],
      },
      input,
    ),
  ).toBe(true);
  const milk = { ...input, inventory: [{ name: 'Milk', members: ['Milk'] }] };
  expect(
    validSuggestions(
      {
        recipes: [
          {
            ...recipe,
            ingredients: [{ ...recipe.ingredients[0]!, name: 'Milk', note: 'dairy-free option' }],
          },
        ],
      },
      milk,
    ),
  ).toBe(false);
});
it('selects cookbook foundations privately, preserving complete ratios and steps on the server', () => {
  const data = kitchen();
  data.recipes = [{ ...savedRecipe, minutes: 10 }];
  data.foods.push({ ...egg, id: crypto.randomUUID(), name: 'Butter' });
  data.stock = data.foods.map((food) => ({
    id: crypto.randomUUID(),
    foodId: food.id,
    quantity: 1,
  }));
  const before = structuredClone(data);
  const context = buildSuggestionContext(data, true, emptyPreferences(), '2026-10-06');
  expect(recipeSuggestionRequestSchema.safeParse(context.request).success).toBe(true);
  const base = context.request.bases![0]!;
  expect(JSON.stringify(context.request)).not.toContain(egg.id);
  expect(JSON.stringify(context.request.bases)).not.toContain('sourceUrl');
  const result = groundOutput(
    suggestionOutputSchema.parse({
      recipes: [
        { ...generated.recipes[0]!, servings: 1, basisKey: base.key, steps: ['Omit everything.'] },
      ],
    }),
    context.request,
  ).recipes[0]!;
  expect(result.steps).toEqual(base.steps);
  expect(result.ingredients[0]!.quantity).toBeCloseTo(
    base.ingredients[0]!.quantity / base.servings,
    6,
  );
  expect(data).toEqual(before);
});
it('invalidates dietary acknowledgement when recipes, restrictions or package metadata change', () => {
  const data = kitchen();
  const preferences = { ...emptyPreferences(), restrictions: ['celiac' as const] };
  const key = dietReviewKey(savedRecipe, preferences, data);
  const changed = {
    ...savedRecipe,
    ingredients: [{ ...savedRecipe.ingredients[0]!, name: 'Milk' }],
  };
  expect(dietReviewKey(changed, preferences, data)).not.toBe(key);
  expect(
    dietReviewKey({ ...savedRecipe, steps: ['Use a different preparation.'] }, preferences, data),
  ).not.toBe(key);
  expect(dietReviewKey(savedRecipe, emptyPreferences(), data)).not.toBe(key);
  data.foods[0]!.brand = 'Different product';
  expect(dietReviewKey(savedRecipe, preferences, data)).not.toBe(key);
});
it('rejects duplicate ideas with cosmetically renamed titles', () => {
  const output = suggestionOutputSchema.parse(generated);
  const input = recipeSuggestionRequestSchema.parse(request);
  expect(
    validSuggestions(
      { recipes: [output.recipes[0]!, { ...output.recipes[0]!, title: 'Another name' }] },
      input,
    ),
  ).toBe(false);
});
it('catches restricted serving instructions even when the ingredient list omits them', () => {
  const preferences = { ...emptyPreferences(), restrictions: ['celiac' as const] };
  const candidate = { ...savedRecipe, steps: ['Cook eggs and serve with bread.'] };
  expect(assessRecipeDiet(candidate, preferences).conflicts).toContain('Method (celiac)');
  const input = recipeSuggestionRequestSchema.parse({ ...request, preferences });
  const output = suggestionOutputSchema.parse(generated);
  output.recipes[0]!.steps = candidate.steps;
  expect(validSuggestions(output, input)).toBe(false);
});
