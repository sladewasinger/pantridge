import { describe, expect, it } from 'vitest';
import {
  initialCookRows,
  initialServings,
  planReviewIsStale,
  reviewedDeductions,
  reviewIsStale,
} from '../../../src/features/cookbook/cookDraft';
import { parseRecipeDraft, recipeDraft } from '../../../src/features/cookbook/editorState';
import { prepareShopping } from '../../../src/features/cookbook/ShoppingReview';
import { foodCookingSignature } from '../../../src/domain/recipes/cooking';
import { recipe, stockedKitchen } from '../recipes/fixtures';

describe('cookbook review helpers', () => {
  it('initializes planned servings and rejects changed or missing plan snapshots', () => {
    const data = stockedKitchen();
    const plan = { id: crypto.randomUUID(), recipeId: recipe.id, date: '2026-10-10', servings: 4 };
    data.mealPlan = [plan];
    expect(initialServings(recipe, plan)).toBe('4');
    expect(initialServings(recipe)).toBe('1');
    expect(planReviewIsStale(data, plan)).toBe(false);
    expect(planReviewIsStale({ ...data, mealPlan: [{ ...plan, servings: 2 }] }, plan)).toBe(true);
    expect(planReviewIsStale({ ...data, mealPlan: [] }, plan)).toBe(true);
    expect(planReviewIsStale(data)).toBe(false);
  });
  it('prepares package rows without changing inventory, then preserves the reviewed metadata', () => {
    const data = stockedKitchen();
    const original = structuredClone(data);
    const rows = initialCookRows(data, recipe, 1);
    expect(data).toEqual(original);
    expect(rows[0]?.quantity).toBe('0.25');
    expect(reviewedDeductions(rows)[0]).toMatchObject({
      quantity: 0.25,
      expectedQuantity: 2,
      remainingQuantity: 1.75,
      expectedFoodSignature: foodCookingSignature(data.foods[0]!),
    });
  });
  it('allows clearable fields but never commits empty, negative, excessive or overprecise quantities', () => {
    const rows = initialCookRows(stockedKitchen(), recipe, 1);
    for (const quantity of ['', '-1', '3', '0.1234567', 'Infinity']) {
      expect(() => reviewedDeductions(rows.map((row) => ({ ...row, quantity })))).toThrow();
    }
    expect(reviewedDeductions(rows.map((row) => ({ ...row, quantity: '0' })))).toEqual([]);
  });
  it('marks package size changes and removed lots stale even with unchanged quantity', () => {
    const data = stockedKitchen();
    const rows = initialCookRows(data, recipe, 1);
    expect(reviewIsStale(data, rows)).toBe(false);
    expect(reviewIsStale({ ...data, stock: [] }, rows)).toBe(true);
    expect(
      reviewIsStale(
        { ...data, foods: data.foods.map((food) => ({ ...food, packageSize: '24 count' })) },
        rows,
      ),
    ).toBe(true);
  });
  it('keeps imported package notes and provenance through review and editing', () => {
    const imported = {
      ...recipe,
      source: 'import' as const,
      ingredients: recipe.ingredients.map((item) => ({
        ...item,
        unit: 'package' as const,
        note: 'Check imported package size.',
      })),
    };
    const draft = recipeDraft(imported);
    expect(parseRecipeDraft(draft, imported, imported.id)).toEqual({
      ...imported,
      ingredients: imported.ingredients.map((item) => ({ ...item, optional: false })),
    });
    expect(() => parseRecipeDraft({ ...draft, servings: '' }, imported, imported.id)).toThrow(
      'servings',
    );
  });
  it('turns preparation errors into reviewable inline failures instead of render crashes', () => {
    expect(
      prepareShopping(() => {
        throw new Error('Shopping quantity is too large.');
      }),
    ).toEqual({ items: [], error: 'Shopping quantity is too large.' });
  });
});
