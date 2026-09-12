import { expect, it } from 'vitest';
import {
  customNutrients,
  nutritionContext,
  packageAmount,
  scaleNutrition,
  servingAmount,
} from '../../../src/domain/products/nutrition-amount';

const beans = { per100: { calories: 110, protein: 7, sodium: 250 }, serving: '1/2 cup (130 g)' };
it('scales a 432 g can, preserves missing nutrients, and shows fractional servings', () => {
  const context = nutritionContext(beans, { amount: 432, measure: 'g', packs: 1 });
  expect(context.servings).toBe(3.3);
  expect(scaleNutrition(context.per100, context.wholeFactor!)).toEqual({
    calories: 475.2,
    protein: 30.2,
    sodium: 1080,
  });
  expect(customNutrients(beans.per100, '4', 'oz', 'g')).toEqual({
    calories: 124.7,
    protein: 7.9,
    sodium: 283.5,
  });
  expect(customNutrients(beans.per100, '', 'g', 'g')).toEqual({});
  expect(customNutrients(beans.per100, '-1', 'g', 'g')).toEqual({});
  expect(customNutrients(beans.per100, '0', 'g', 'g')).toEqual({
    calories: 0,
    protein: 0,
    sodium: 0,
  });
});
it('keeps volume separate from mass and includes all containers in a declared multipack', () => {
  const juice = { per100: { calories: 40 }, basis: 'ml' as const };
  expect(customNutrients(juice.per100, '8', 'fl oz', 'ml').calories).toBe(94.6);
  expect(customNutrients(juice.per100, '8', 'oz', 'ml')).toEqual({});
  expect(
    nutritionContext(juice, { amount: 400, measure: 'g', packs: 1 }).wholeFactor,
  ).toBeUndefined();
  expect(packageAmount({ amount: 250, measure: 'ml', packs: 6 })?.amount).toBe(1500);
  expect(
    nutritionContext(beans, { amount: 6, measure: 'count', packs: 1 }).wholeFactor,
  ).toBeUndefined();
});
it('uses serving-only data only when a measured serving is known', () => {
  expect(
    nutritionContext({ per100: {}, perServing: { calories: 143 }, serving: '1/2 cup (130 g)' })
      .per100.calories,
  ).toBe(110);
  expect(
    nutritionContext({ per100: {}, perServing: { calories: 143 }, serving: '1/2 cup' }).scalable,
  ).toBe(false);
  expect(servingAmount('1/2 oz')).toBeUndefined();
  expect(servingAmount('1,000 g')).toBeUndefined();
});
