import { describe, expect, it } from 'vitest';
import { browseRecipes } from '../../../src/domain/recipes/browse';
import { matchingLots } from '../../../src/domain/recipes/availability';
import { recipeRankingKitchen } from '../../fixtures/recipe-ranking-kitchen';
import { possibleIngredientFoods } from '../../../src/domain/recipes/discovery';
import { recipe } from './fixtures';
import type { Recipe } from '../../../src/domain/recipes/model';

const options = {
  builtIns: true,
  quickOnly: false,
  includeUnmatched: true,
  order: 'on-hand' as const,
};
const today = '2026-10-07';
describe('ingredient coverage ranking', () => {
  it('places every recipe using stocked required ingredients ahead of unrelated short recipes', () => {
    const data = recipeRankingKitchen();
    const results = browseRecipes(data, '', options, today);
    const apples = results.findIndex((item) => item.recipe.title === 'Applesauce');
    const useful = results.filter((item) =>
      item.recipe.ingredients.some(
        (ingredient) => !ingredient.optional && matchingLots(data, ingredient).length > 0,
      ),
    );
    expect(useful.length).toBeGreaterThan(10);
    expect(useful.every((item) => results.indexOf(item) < apples)).toBe(true);
  });
  it.each(['use-soon', 'on-hand', 'name', 'quick'] as const)(
    'hides unrelated recipes in %s until explicitly enabled',
    (order) => {
      const data = recipeRankingKitchen();
      const results = browseRecipes(
        data,
        '',
        { ...options, order, includeUnmatched: false },
        today,
      );
      expect(results.length).toBeGreaterThan(10);
      expect(results.every((item) => item.coverage.section !== 'unmatched')).toBe(true);
      expect(results.some((item) => item.recipe.title === 'Applesauce')).toBe(false);
      expect(
        browseRecipes(data, 'Applesauce', { ...options, includeUnmatched: false }, today),
      ).toEqual([]);
      expect(browseRecipes(data, 'Applesauce', { ...options, order }, today)).toHaveLength(1);
    },
  );
  it('offers named variants for review without widening exact lot matching', () => {
    const data = recipeRankingKitchen();
    expect(possibleIngredientFoods(data, 'Black beans').map((food) => food.name)).toEqual([
      'Black Beans (Unsalted)',
    ]);
    expect(possibleIngredientFoods(data, 'Rice').map((food) => food.name)).toEqual([
      'Brown Rice',
      'Brown Rice',
    ]);
    expect(matchingLots(data, { ...recipe.ingredients[0]!, name: 'Rice' })).toEqual([]);
    expect(possibleIngredientFoods(data, 'Cinnamon')).toEqual([]);
    expect(possibleIngredientFoods(data, 'Honey')).toEqual([]);
    expect(possibleIngredientFoods(data, 'Cooked rice')).toEqual([]);
    expect(possibleIngredientFoods(data, 'Gluten-free pasta')).toEqual([]);
    data.foods[6]!.kind = 'supply';
    data.stock[7]!.quantity = 0;
    expect(possibleIngredientFoods(data, 'Rice')).toEqual([]);
  });
  it('separates full stock, partial quantities, possible choices and no matches', () => {
    const data = recipeRankingKitchen();
    const make = (title: string, names: string[], quantity = 1): Recipe => ({
      ...recipe,
      id: crypto.randomUUID(),
      title,
      ingredients: names.map((name) => ({
        ...recipe.ingredients[0]!,
        id: crypto.randomUUID(),
        name,
        quantity,
      })),
    });
    data.recipes = [
      make('Unknown', ['Apples']),
      make('Partial', ['Eggs', 'Butter']),
      make('Possible', ['Rice']),
      make('Short quantity', ['Eggs'], 25),
      make('Ready', ['Eggs']),
    ];
    const result = browseRecipes(data, '', { ...options, builtIns: false }, today);
    expect(result[0]?.recipe.title).toBe('Ready');
    expect(result[0]?.coverage.section).toBe('on-hand');
    expect(result.slice(1, -1).every((match) => match.coverage.section === 'partial')).toBe(true);
    expect(result.at(-1)?.coverage.section).toBe('unmatched');
    expect(result.find((match) => match.recipe.title === 'Possible')?.coverage).toMatchObject({
      onHand: 0,
      possible: 1,
    });
  });
  it('ignores optional-only, depleted and household matches and requires review of extras', () => {
    const data = recipeRankingKitchen();
    data.recipes = [
      {
        ...recipe,
        title: 'Optional only',
        ingredients: [{ ...recipe.ingredients[0]!, optional: true }],
      },
      {
        ...recipe,
        id: crypto.randomUUID(),
        title: 'Extra ingredients',
        untrackedIngredients: ['Salt to taste'],
      },
    ];
    const results = browseRecipes(
      data,
      '',
      { ...options, builtIns: false, includeUnmatched: false },
      today,
    );
    expect(results).toHaveLength(1);
    expect(results[0]?.coverage.section).toBe('partial');
    data.stock[2]!.quantity = 0;
    expect(
      browseRecipes(data, '', { ...options, builtIns: false, includeUnmatched: false }, today),
    ).toEqual([]);
    data.stock[2]!.quantity = 2;
    data.foods[2]!.kind = 'supply';
    expect(
      browseRecipes(data, '', { ...options, builtIns: false, includeUnmatched: false }, today),
    ).toEqual([]);
  });
});
