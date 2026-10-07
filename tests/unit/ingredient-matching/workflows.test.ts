import { describe, expect, it } from 'vitest';
import { getRecipeAvailability } from '../../../src/domain/recipes/availability';
import { previewCooking, recordCooking } from '../../../src/domain/recipes/cooking';
import { buildMissingShopping } from '../../../src/domain/recipes/shopping';
import { buildMealPlanShopping } from '../../../src/domain/recipes/plan-shopping';
import { snapshotSchema } from '../../../src/domain/model';
import { reduceChecked } from '../../../src/domain/reducer';
import { initialCookRows, reviewIsStale } from '../../../src/features/cookbook/cookDraft';
import { ingredient, kitchen, recipe } from './fixtures';
import { customIngredient } from '../../../src/domain/ingredient-matching/identity';

describe('consistent local matching across workflows', () => {
  it('uses explicitly measured counts for a reviewed custom ingredient', () => {
    const identity = { ...customIngredient('My dumplings'), preparation: 'plain' as const };
    const original = kitchen('My dumplings', { ingredient: identity });
    const measured = reduceChecked(original, {
      type: 'stock.recipeAmount',
      stockId: original.stock[0]!.id,
      size: { amount: 10, measure: 'count', packs: 1 },
    });
    const meal = recipe(
      ingredient('My dumplings', { ingredient: identity, quantity: 3, unit: 'count' }),
    );
    expect(getRecipeAvailability(measured, meal).ingredients[0]).toMatchObject({
      status: 'confirmed',
      available: 20,
    });
    expect(previewCooking(measured, meal).deductions[0]?.quantity).toBe(0.3);
    expect(original.stock[0]?.quantity).toBe(2);
  });
  it('shows cooked rice as on hand for dry-rice requirements, with no invented amount or automatic shopping', () => {
    const data = kitchen('Cooked brown rice');
    const meal = recipe(ingredient('Rice'));
    const before = JSON.stringify(data);
    expect(getRecipeAvailability(data, meal).ingredients[0]?.status).toBe('needs-review');
    expect(buildMissingShopping(data, meal, 1, () => crypto.randomUUID())).toEqual([]);
    expect(previewCooking(data, meal).deductions).toEqual([]);
    expect(initialCookRows(data, meal, 1)[0]?.quantity).toBe('0');
    expect(JSON.stringify(data)).toBe(before);
  });
  it('deducts only compatible lots after an explicit review, preserving other preparations', () => {
    const data = kitchen('Rice');
    data.stock.push({
      id: crypto.randomUUID(),
      foodId: data.foods[0]!.id,
      quantity: 1,
      ingredient: { id: 'rice', preparation: 'cooked', basis: 'as-sold' },
    });
    const meal = recipe(ingredient('Cooked rice'));
    data.recipes = [meal];
    const preview = previewCooking(data, meal);
    expect(preview.deductions).toHaveLength(1);
    expect(preview.deductions[0]).toMatchObject({
      stockId: data.stock[1]!.id,
      quantity: 0.2,
      remainingQuantity: 0.8,
    });
    const record = {
      id: crypto.randomUUID(),
      recipeId: meal.id,
      recipeTitle: meal.title,
      cookedAt: new Date().toISOString(),
      servings: 1,
      deductions: preview.deductions,
    };
    const cooked = reduceChecked(data, { type: 'recipe.cook', reviewed: true, record });
    expect(cooked.stock.map((lot) => lot.quantity)).toEqual([2, 0.8]);
    expect(recordCooking(cooked, record)).toBe(cooked);
  });
  it('persists measured drained amounts and rejects cooking when classification or amount changes', () => {
    const original = kitchen('Canned black beans', { unit: 'cans' });
    const stockId = original.stock[0]!.id;
    const classified = reduceChecked(original, {
      type: 'stock.classify',
      stockId,
      ingredient: { id: 'black-beans', preparation: 'canned', basis: 'drained' },
    });
    const measured = reduceChecked(classified, {
      type: 'stock.recipeAmount',
      stockId,
      size: { amount: 300, measure: 'g', packs: 1 },
    });
    const meal = recipe(ingredient('Black beans', { note: 'drained', quantity: 150 }));
    measured.recipes = [meal];
    const restored = snapshotSchema.parse(JSON.parse(JSON.stringify(measured)));
    expect(getRecipeAvailability(restored, meal).ingredients[0]).toMatchObject({
      status: 'confirmed',
      available: 600,
    });
    const rows = initialCookRows(restored, meal, 1);
    expect(rows[0]?.quantity).toBe('0.5');
    const changed = reduceChecked(restored, {
      type: 'stock.recipeAmount',
      stockId,
      size: { amount: 250, measure: 'g', packs: 1 },
    });
    expect(reviewIsStale(changed, rows)).toBe(true);
    const rebased = reduceChecked(restored, {
      type: 'stock.classify',
      stockId,
      ingredient: { id: 'black-beans', preparation: 'canned', basis: 'as-sold' },
    });
    expect(
      getRecipeAvailability(rebased, recipe(ingredient('Canned black beans'))).ingredients[0]
        ?.status,
    ).toBe('confirmed');
    expect(rebased.stock[0]?.ingredientSize).toBeUndefined();
    expect(rebased.stock[0]?.ingredientSizeBasis).toBeUndefined();
    const missingDrained = buildMissingShopping(
      restored,
      { ...meal, ingredients: [{ ...meal.ingredients[0]!, quantity: 900 }] },
      1,
      () => crypto.randomUUID(),
    );
    expect(missingDrained[0]).toMatchObject({ quantity: 1, unit: 'items' });
    expect(missingDrained[0]?.foodId).toBeUndefined();
    expect(missingDrained[0]?.recipeNote).toContain('Check package size and quantity');
    const record = {
      id: crypto.randomUUID(),
      recipeId: meal.id,
      recipeTitle: meal.title,
      cookedAt: new Date().toISOString(),
      servings: 1,
      deductions: previewCooking(restored, meal).deductions,
    };
    expect(() => recordCooking(changed, record)).toThrow('Product preparation changed');
  });
  it('does not lose preparation requirements when combining planned meals', () => {
    const data = kitchen('Cooked rice');
    const cooked = recipe(ingredient('Cooked rice', { quantity: 1100 }));
    const dry = recipe(ingredient('Rice', { quantity: 100 }));
    data.recipes = [cooked, dry];
    data.mealPlan = data.recipes.map((meal) => ({
      id: crypto.randomUUID(),
      recipeId: meal.id,
      date: '2026-10-07',
      servings: 1,
    }));
    const items = buildMealPlanShopping(
      data,
      data.mealPlan.map((entry) => entry.id),
      () => crypto.randomUUID(),
    );
    expect(items).toHaveLength(2);
    expect(items[0]?.name).toBe('Cooked rice');
    expect(items[0]?.recipeNote).toContain('100 g');
    expect(items[1]?.ingredient?.preparation).toBe('dry');
  });
});
