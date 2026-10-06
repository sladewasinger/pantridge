import { describe, expect, it } from 'vitest';
import { emptySnapshot } from '../../../src/domain/model';
import { getRecipeAvailability, matchingFoods } from '../../../src/domain/recipes/availability';
import { convertRecipeAmount, packageAmount } from '../../../src/domain/recipes/units';
import {
  getCookbookRecipes,
  getRecipes,
  getMealPlan,
  getCookingHistory,
} from '../../../src/domain/recipes/selectors';
import { normalizeIngredientName } from '../../../src/domain/recipes/names';
import { getSubstitutions } from '../../../src/domain/recipes/substitutions';
import { initializeStarter } from '../../../src/domain/starter';
import { egg, kitchen, newLotId } from '../fixtures';
import { recipe, stockedKitchen } from './fixtures';

describe('recipe quantities and identity matching', () => {
  it('uses known same-dimension package sizes, including multipacks', () => {
    expect(convertRecipeAmount(1, 'kg', 'g')).toBe(1000);
    expect(convertRecipeAmount(1, 'lb', 'oz')).toBeCloseTo(16);
    expect(convertRecipeAmount(1, 'cup', 'tbsp')).toBeCloseTo(16);
    expect(
      packageAmount({ ...egg, size: { amount: 6, measure: 'count', packs: 2 } }, 'count'),
    ).toBe(12);
    expect(packageAmount({ ...egg, packageSize: '12 count' }, 'count')).toBe(12);
  });
  it('never invents package contents or mass-volume equivalence', () => {
    expect(convertRecipeAmount(1, 'g', 'ml')).toBeUndefined();
    expect(convertRecipeAmount(1, 'oz', 'fl oz')).toBeUndefined();
    expect(convertRecipeAmount(1, 'count', 'g')).toBeUndefined();
    expect(packageAmount(egg, 'count')).toBeUndefined();
    expect(packageAmount({ ...egg, unit: 'cups' }, 'cup')).toBeUndefined();
    expect(
      packageAmount({ ...egg, size: { amount: 12, measure: 'count', packs: 1 } }, 'package'),
    ).toBeUndefined();
  });
  it('labels unknown-size stock needs-review and no stock missing', () => {
    const unknown = getRecipeAvailability(kitchen(), recipe);
    expect(unknown.status).toBe('needs-review');
    expect(unknown.ingredients[0]?.available).toBeUndefined();
    expect(unknown.ingredients[0]?.missing).toBeUndefined();
    expect(getRecipeAvailability(emptySnapshot(), recipe).ingredients[0]).toMatchObject({
      status: 'missing',
      available: 0,
      missing: 3,
    });
  });
  it('scales servings and counts fractional remaining packages accurately', () => {
    const data = stockedKitchen();
    data.stock[0]!.quantity = 0.25;
    expect(getRecipeAvailability(data, recipe).status).toBe('confirmed');
    const scaled = getRecipeAvailability(data, recipe, 2);
    expect(scaled.ingredients[0]).toMatchObject({
      required: 6,
      available: 3,
      missing: 3,
      status: 'missing',
    });
  });
  it('treats object property names as ordinary untrusted ingredient text', () => {
    for (const name of ['constructor', '__proto__']) {
      expect(normalizeIngredientName(name)).toBe(name);
      expect(getSubstitutions(name)).toEqual([]);
    }
  });
  it('uses conservative aliases and excludes explicit and legacy supplies', () => {
    const data = stockedKitchen();
    expect(matchingFoods(data, ' egg ')).toHaveLength(1);
    expect(matchingFoods(data, 'Liquid eggs')).toHaveLength(0);
    data.foods[0]!.kind = 'supply';
    expect(getRecipeAvailability(data, recipe).status).toBe('missing');
    delete data.foods[0]!.kind;
    data.foods[0]!.art = 'household-box';
    expect(getRecipeAvailability(data, recipe).status).toBe('missing');
    data.foods[0]!.kind = 'food';
    expect(getRecipeAvailability(data, recipe).status).toBe('confirmed');
  });
  it('does not count the same stock twice across repeated ingredient rows', () => {
    const data = stockedKitchen();
    data.stock[0]!.quantity = 0.25;
    const duplicated = {
      ...recipe,
      ingredients: [
        ...recipe.ingredients,
        { ...recipe.ingredients[0]!, id: newLotId, name: 'Egg', quantity: 1 },
      ],
    };
    expect(getRecipeAvailability(data, duplicated).status).toBe('missing');
    expect(getRecipeAvailability(data, duplicated).ingredients[1]?.missing).toBe(1);
  });
  it('keeps optional ingredients out of required missing status', () => {
    const optional = {
      ...recipe,
      ingredients: [
        ...recipe.ingredients,
        { ...recipe.ingredients[0]!, id: newLotId, name: 'Salt', optional: true },
      ],
    };
    expect(getRecipeAvailability(stockedKitchen(), optional).status).toBe('confirmed');
  });
  it('separates next-seven-day urgency from past dates without asserting safety', () => {
    const data = stockedKitchen();
    data.stock[0]!.expires = '2026-10-08';
    data.stock.push({ ...data.stock[0]!, id: newLotId, expires: '2026-10-05' });
    expect(getRecipeAvailability(data, recipe, 1, '2026-10-06')).toMatchObject({
      expiringSoon: 1,
      pastDate: 1,
    });
  });
  it('provides cookbook ideas and substitutions without changing user inventory', () => {
    const data = emptySnapshot();
    const before = JSON.stringify(data);
    expect(getCookbookRecipes(data).length).toBeGreaterThan(0);
    expect(getRecipes(data)).toEqual([]);
    expect(getMealPlan(data)).toEqual([]);
    expect(getCookingHistory(data)).toEqual([]);
    expect(getSubstitutions('Butter')[0]?.name).toBe('Olive oil');
    expect(getSubstitutions('Eggs')).toEqual([]);
    expect(JSON.stringify(data)).toBe(before);
    expect(initializeStarter(data).recipes).toBeUndefined();
  });
});
