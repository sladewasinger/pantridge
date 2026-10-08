import { describe, expect, it } from 'vitest';
import {
  identifyIngredient,
  acceptsIdentity,
  ingredientRegistry,
} from '../../../src/domain/ingredient-matching/identity';
import {
  recipeIdentity,
  stockIdentity,
} from '../../../src/domain/ingredient-matching/classification';
import { starterRecipes } from '../../../src/domain/recipes/starters';
import { getRecipeAvailability, matchingLots } from '../../../src/domain/recipes/availability';
import { ingredient, kitchen, recipe } from './fixtures';

describe('shared local ingredient identities', () => {
  it('keeps an alternate dried-herb amount separate from the primary fresh ingredient', () => {
    const parsley = ingredient('Parsley', {
      quantity: 0.25,
      unit: 'cup',
      note: 'or 2 tablespoons dried; chopped',
    });
    expect(recipeIdentity(parsley)).toEqual(identifyIngredient('Parsley'));
    expect(getRecipeAvailability(kitchen('Dried parsley'), recipe(parsley)).status).toBe(
      'needs-review',
    );
    expect(
      recipeIdentity(ingredient('Dried rosemary', { note: 'or 1 sprig fresh' }))?.preparation,
    ).toBe('dry');
  });
  it('classifies every built-in ingredient and uses unique consistent registry IDs', () => {
    expect(starterRecipes).toHaveLength(104);
    expect(new Set(ingredientRegistry.map((item) => item.id)).size).toBe(ingredientRegistry.length);
    for (const row of starterRecipes.flatMap((item) => item.ingredients)) {
      expect(row.ingredient, row.name).toBeDefined();
      expect(row.ingredient?.id).toBe(identifyIngredient(row.name)?.id);
    }
  });
  it.each([
    ['Cinnamon Life Cereal', 'Cinnamon'],
    ['Sundried Tomato and Basil Wheat Crackers', 'Tomatoes'],
    ['Peanut butter', 'Butter'],
    ['Coconut milk', 'Milk'],
    ['Almond milk', 'Milk'],
    ['Oat milk', 'Milk'],
    ['Chicken broth', 'Chicken'],
    ['Green beans', 'Black beans'],
    ['Pinto beans', 'Black beans'],
    ['Whole wheat flour', 'All-purpose flour'],
    ['Wild rice', 'Rice'],
    ['Canned diced tomatoes with chilies', 'Tomatoes'],
  ])('never turns %s into %s', (present, required) => {
    expect(matchingLots(kitchen(present), ingredient(required))).toEqual([]);
  });
  it('accepts directional varieties but never substitutes a specific variety', () => {
    expect(acceptsIdentity('rice', 'brown-rice')).toBe(true);
    expect(acceptsIdentity('brown-rice', 'white-rice')).toBe(false);
    expect(acceptsIdentity('white-rice', 'rice')).toBe(false);
    expect(matchingLots(kitchen('Jasmine rice'), ingredient('Rice'))).toHaveLength(1);
  });
  it('does not count an unspecified garlic package as a single clove', () => {
    const data = kitchen('Garlic', { unit: 'items', size: undefined, packageSize: '' });
    const meal = recipe(ingredient('Garlic cloves', { quantity: 1, unit: 'count' }));
    expect(getRecipeAvailability(data, meal).ingredients[0]?.status).toBe('needs-review');
    const cloves = { ...data, foods: [{ ...data.foods[0]!, name: 'Garlic cloves' }] };
    expect(getRecipeAvailability(cloves, meal).ingredients[0]?.status).toBe('confirmed');
  });
  it('recognizes canned unsalted beans as present immediately without a paid call', () => {
    const data = kitchen('Black Beans (Unsalted)', {
      unit: 'cans',
      packageSize: '432 g',
      size: { amount: 432, measure: 'g', packs: 1 },
    });
    const match = getRecipeAvailability(data, recipe(ingredient('Canned black beans')));
    expect(match.ingredients[0]).toMatchObject({ status: 'confirmed', available: 864, missing: 0 });
    expect(data.stock[0]?.quantity).toBe(2);
  });
  it('uses product preparation per lot when ready and dry rice share one shelf identity', () => {
    const data = kitchen('Brown rice');
    data.stock[0]!.product = {
      barcode: '12345670',
      name: 'Microwaveable brown rice',
      brand: 'Test',
    };
    data.stock.push({
      id: crypto.randomUUID(),
      foodId: data.foods[0]!.id,
      quantity: 1,
      product: { barcode: '12345670', name: 'Dry brown rice', brand: 'Test' },
    });
    expect(stockIdentity(data.foods[0]!, data.stock[0]!)?.preparation).toBe('cooked');
    const cooked = getRecipeAvailability(data, recipe(ingredient('Cooked rice'))).ingredients[0]!;
    expect(cooked).toMatchObject({ status: 'confirmed', available: 1000 });
    const dry = getRecipeAvailability(data, recipe(ingredient('Rice', { quantity: 600 })))
      .ingredients[0]!;
    expect(dry).toMatchObject({
      status: 'needs-review',
      lotIds: data.stock.map((lot) => lot.id).sort(),
    });
    expect(dry.available).toBeUndefined();
  });
  it('retains specific product identity but reviews an undeclared product preparation', () => {
    const data = kitchen('Cooked rice');
    data.stock[0]!.product = { barcode: '12345670', name: 'Brown rice', brand: 'Test' };
    expect(stockIdentity(data.foods[0]!, data.stock[0]!)).toMatchObject({
      id: 'brown-rice',
      preparation: 'unknown',
    });
    expect(
      getRecipeAvailability(data, recipe(ingredient('Brown rice'))).ingredients[0]?.status,
    ).toBe('needs-review');
    expect(
      getRecipeAvailability(data, recipe(ingredient('Cooked rice'))).ingredients[0]?.status,
    ).toBe('needs-review');
  });
  it('does not equate drained grams with net can weight or invent a yield', () => {
    const data = kitchen('Canned black beans', { unit: 'cans' });
    const required = ingredient('Black beans', { note: 'drained and rinsed' });
    expect(recipeIdentity(required)?.basis).toBe('drained');
    expect(
      recipeIdentity(ingredient('Black beans', { note: 'canned, drained and rinsed' }))?.basis,
    ).toBe('drained');
    expect(
      recipeIdentity(ingredient('Black beans', { note: '1 can × 15 oz, drained' }))?.basis,
    ).toBe('as-sold');
    expect(getRecipeAvailability(data, recipe(required)).ingredients[0]).toMatchObject({
      status: 'needs-review',
      available: undefined,
      missing: undefined,
    });
  });
  it('honors reviewed identity overrides without relying on artwork or substrings', () => {
    const data = kitchen('Unrecognized pantry item', {
      ingredient: { id: 'black-beans', preparation: 'canned', basis: 'as-sold' },
    });
    expect(matchingLots(data, ingredient('Canned black beans'))).toHaveLength(1);
    data.foods[0]!.kind = 'supply';
    expect(matchingLots({ ...data }, ingredient('Canned black beans'))).toEqual([]);
  });
  it('gives unknown exact names stable local identities and permits explicitly reviewed custom preparations', () => {
    const data = kitchen('My homemade sauce');
    const meal = recipe(ingredient(' my homemade sauce '));
    const identity = recipeIdentity(meal.ingredients[0]!)!;
    expect(identity.id).toMatch(/^custom-[a-f0-9]{64}$/);
    expect(stockIdentity(data.foods[0]!, data.stock[0]!)?.id).toBe(identity.id);
    expect(getRecipeAvailability(data, meal).status).toBe('needs-review');
    const reviewed = { ...identity, preparation: 'plain' as const };
    data.foods[0]!.ingredient = reviewed;
    meal.ingredients[0]!.ingredient = reviewed;
    expect(getRecipeAvailability({ ...data }, meal).status).toBe('confirmed');
  });
  it.each([
    ['Milk', 'Chocolate milk'],
    ['Brown rice', 'Cooked brown rice pudding'],
  ])('reviews unknown product %s / %s even with a shelf classification', (name, product) => {
    const data = kitchen(name, { ingredient: identifyIngredient(name) });
    data.stock[0]!.product = { barcode: '12345670', name: product, brand: 'Test' };
    const meal = recipe(ingredient(name));
    expect(getRecipeAvailability(data, meal).ingredients[0]?.status).toBe('needs-review');
  });
});
