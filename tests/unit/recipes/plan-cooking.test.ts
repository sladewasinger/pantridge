import { describe, expect, it } from 'vitest';
import { reduceChecked } from '../../../src/domain/reducer';
import { previewCooking } from '../../../src/domain/recipes/cooking';
import { recipe, record, stockedKitchen, planId } from './fixtures';
import { newLotId } from '../fixtures';

const entry = { id: planId, recipeId: recipe.id, date: '2026-10-07', servings: 1 };
describe('cooking a dated planned meal', () => {
  it('completes only the explicitly reviewed plan with stock and history in one transition', () => {
    const data = { ...stockedKitchen(), mealPlan: [entry, { ...entry, id: newLotId }] };
    const command = {
      type: 'recipe.cook' as const,
      reviewed: true as const,
      record: record(previewCooking(data, recipe).deductions),
      expectedPlan: entry,
    };
    const after = reduceChecked(data, command);
    expect(after.mealPlan).toEqual([{ ...entry, id: newLotId }]);
    expect(after.stock[0]?.quantity).toBe(1.75);
    expect(after.cookingHistory).toHaveLength(1);
    expect(data.mealPlan).toHaveLength(2);
    // A new plan reusing an ID cannot be removed by retrying the previous cook.
    const replanned = { ...after, mealPlan: [...after.mealPlan!, entry] };
    expect(reduceChecked(replanned, command)).toEqual(replanned);
  });
  it('keeps plans when cooking directly from a recipe', () => {
    const data = { ...stockedKitchen(), mealPlan: [entry] };
    expect(
      reduceChecked(data, { type: 'recipe.cook', reviewed: true, record: record() }).mealPlan,
    ).toEqual([entry]);
  });
  it('rejects a removed or changed plan before any quantity or history edit', () => {
    const data = { ...stockedKitchen(), mealPlan: [entry] };
    const command = {
      type: 'recipe.cook' as const,
      reviewed: true as const,
      record: record(previewCooking(data, recipe).deductions),
      expectedPlan: entry,
    };
    for (const mealPlan of [[], [{ ...entry, date: '2026-10-08' }], [{ ...entry, servings: 2 }]]) {
      const changed = { ...data, mealPlan };
      expect(() => reduceChecked(changed, command)).toThrow('planned meal changed');
      expect(changed.stock[0]?.quantity).toBe(2);
      expect(changed.cookingHistory).toBeUndefined();
    }
    expect(() =>
      reduceChecked(data, { ...command, record: { ...command.record, servings: 2 } }),
    ).toThrow('planned meal changed');
  });
});
