import { expect, it } from 'vitest';
import {
  chooseIngredients,
  ingredientChoices,
} from '../../../src/domain/recipe-suggestions/choices';
import { suggestionGroup } from '../../../src/domain/recipe-suggestions/groups';
import { getRecipeAvailability } from '../../../src/domain/recipes/availability';
import { kitchen, egg } from '../fixtures';
import { recipe } from '../recipes/fixtures';

it('requires an explicit compatible food choice before exact stock matching, without mutating stock', () => {
  const data = kitchen();
  data.foods = ['Canned black beans', 'Canned pinto beans', 'Dried beans'].map((name, index) => ({
    ...egg,
    id: String(index),
    name,
    packageSize: '400 g',
  }));
  data.stock = data.foods.map((food) => ({ id: food.id, foodId: food.id, quantity: 1 }));
  const idea = {
    ...recipe,
    ingredients: [
      { ...recipe.ingredients[0]!, name: 'Canned beans', quantity: 200, unit: 'g' as const },
    ],
  };
  const before = structuredClone(data);
  expect(ingredientChoices(data, idea, '2026-10-06')[0]!.options).toEqual([
    'Canned black beans',
    'Canned pinto beans',
  ]);
  expect(() => chooseIngredients(data, idea, {}, '2026-10-06')).toThrow('Choose');
  expect(() =>
    chooseIngredients(data, idea, { [idea.ingredients[0]!.id]: 'Dried beans' }, '2026-10-06'),
  ).toThrow('Choose');
  const selected = chooseIngredients(
    data,
    idea,
    { [idea.ingredients[0]!.id]: 'Canned pinto beans' },
    '2026-10-06',
  );
  expect(getRecipeAvailability(data, selected).ingredients[0]!.foodIds).toEqual(['1']);
  expect(data).toEqual(before);
  expect(idea.ingredients[0]!.name).toBe('Canned beans');
});
it('excludes deleted, empty, past-date and household choices, and retains freezer details', () => {
  const data = kitchen();
  data.foods[0] = { ...egg, name: 'Pinto beans' };
  const idea = { ...recipe, ingredients: [{ ...recipe.ingredients[0]!, name: 'Beans' }] };
  expect(ingredientChoices(data, idea, '2026-10-06')).toEqual([]);
  data.stock[0]!.expires = undefined;
  expect(ingredientChoices(data, idea, '2026-10-06')).toHaveLength(1);
  data.stock[0]!.quantity = 0;
  expect(ingredientChoices(data, idea, '2026-10-06')).toEqual([]);
  data.stock[0]!.quantity = 1;
  data.foods[0]!.kind = 'supply';
  expect(ingredientChoices(data, idea, '2026-10-06')).toEqual([]);
  expect(suggestionGroup({ name: 'Cooked brown rice', frozen: true })).toEqual({
    name: 'Cooked rice',
    details: ['brown', 'frozen'],
  });
  expect(suggestionGroup({ name: 'Raw chicken', frozen: false }).name).not.toBe(
    suggestionGroup({ name: 'Cooked chicken', frozen: false }).name,
  );
});
