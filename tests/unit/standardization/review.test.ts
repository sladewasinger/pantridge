import { expect, it } from 'vitest';
import { kitchen, ingredient, recipe } from '../ingredient-matching/fixtures';
import { recognitionReviews } from '../../../src/domain/standardization/review';
import { reduceChecked } from '../../../src/domain/reducer';
import {
  foodEvidence,
  recipeEvidence,
  stockEvidence,
  evidenceFingerprint,
} from '../../../src/domain/standardization/evidence';
import {
  standardizationVersion,
  type Evidence,
  type SavedStandardization,
} from '../../../src/domain/standardization/model';
import type { Snapshot } from '../../../src/domain/model';
import { customIngredient } from '../../../src/domain/ingredient-matching/identity';
import { lotMatch } from '../../../src/domain/ingredient-matching/resolver';
import {
  classificationTargets,
  applyClassifications,
} from '../../../src/domain/standardization/targets';

function result(
  evidence: Evidence,
  patch: Partial<SavedStandardization> = {},
): SavedStandardization {
  return {
    version: standardizationVersion,
    source: 'ai-private',
    fingerprint: evidenceFingerprint(evidence),
    status: 'recognized',
    identity: 'brown-rice',
    preparation: 'unknown',
    reason: '',
    ...patch,
  };
}
function unclear() {
  const data = kitchen('Store rice');
  data.foods[0]!.standardization = result(foodEvidence(data.foods[0]!));
  return data;
}
function command(data: Snapshot, key = recognitionReviews(data)[0]!.key) {
  return {
    type: 'classification.review' as const,
    key,
    expected: recognitionReviews(data).find((review) => review.key === key)!.signature,
    ingredient: { id: 'brown-rice', preparation: 'cooked' as const, basis: 'as-sold' as const },
  };
}
it('clarifies preparation without renaming, changing amounts or replacing concurrent quantity/date edits', () => {
  const data = unclear();
  const review = command(data);
  data.stock[0]!.quantity = 1.234567;
  data.stock[0]!.expires = '2026-12-30';
  const next = reduceChecked(data, review);
  expect(next.foods[0]).toEqual({ ...data.foods[0], ingredient: review.ingredient });
  expect(next.stock[0]).toMatchObject({ quantity: 1.234567, expires: '2026-12-30' });
  expect(recognitionReviews(next)).toHaveLength(0);
  expect(next.shopping).toEqual(data.shopping);
});
it.each(['rename', 'manual', 'measurement', 'package', 'result', 'delete'])(
  'rejects stale %s changes',
  (change) => {
    const data = unclear();
    const review = command(data);
    if (change === 'rename') data.foods[0]!.name = 'Another food';
    if (change === 'manual')
      data.foods[0]!.ingredient = { ...review.ingredient, preparation: 'dry' };
    if (change === 'measurement')
      data.stock[0]!.ingredientSize = { amount: 200, measure: 'g', packs: 1 };
    if (change === 'package') data.foods[0]!.size!.amount = 600;
    if (change === 'result') data.foods[0]!.standardization!.preparation = 'dry';
    if (change === 'delete') data.foods = [];
    expect(() => reduceChecked(data, review)).toThrow('Food recognition changed');
  },
);
it('keeps a composite exact name review-only rather than converting it to a constituent', () => {
  const data = kitchen('Rice and beans dinner');
  data.foods[0]!.standardization = result(foodEvidence(data.foods[0]!), {
    status: 'composite',
    identity: null,
  });
  const next = reduceChecked(data, {
    ...command(data),
    ingredient: customIngredient(data.foods[0]!.name),
  });
  expect(lotMatch(next, ingredient('Rice'), { food: next.foods[0]!, lot: next.stock[0]! })).toBe(
    'none',
  );
  expect(
    lotMatch(next, ingredient(data.foods[0]!.name), { food: next.foods[0]!, lot: next.stock[0]! }),
  ).toBe('review');
});
it('package clarification preserves brand, barcode and quantity and invalidates only its measured basis', () => {
  const data = kitchen('Rice');
  const lot = data.stock[0]!;
  lot.product = { barcode: '012345678905', name: 'Store brown rice', brand: 'Store' };
  lot.standardization = result(stockEvidence(data.foods[0]!, lot));
  lot.ingredientSize = { amount: 200, measure: 'g', packs: 1 };
  lot.ingredientSizeBasis = 'as-sold';
  const next = reduceChecked(data, command(data, `stock:${lot.id}`));
  expect(next.stock[0]).toMatchObject({
    product: lot.product,
    quantity: 2,
    ingredient: { preparation: 'cooked' },
  });
  expect(next.stock[0]!.ingredientSize).toBeUndefined();
  expect(next.foods).toEqual(data.foods);
});
it('recipe clarification preserves edits to other ingredients and never changes stock', () => {
  const data = kitchen('Rice');
  const item = ingredient('Store rice');
  item.standardization = result(recipeEvidence(item));
  data.recipes = [recipe(item, ingredient('Butter'))];
  const review = command(data, `recipe:${data.recipes[0]!.id}:${item.id}`);
  data.recipes[0]!.ingredients[1]!.quantity = 30;
  const next = reduceChecked(data, review);
  expect(next.recipes![0]!.ingredients[1]!.quantity).toBe(30);
  expect(next.recipes![0]!.ingredients[0]!.ingredient).toEqual(review.ingredient);
  expect(next.stock).toEqual(data.stock);
});
it('manual clarification remains authoritative against late AI annotations', () => {
  const data = unclear();
  const next = reduceChecked(data, command(data));
  const late = new Map([
    [`food:${data.foods[0]!.id}`, result(foodEvidence(data.foods[0]!), { preparation: 'dry' })],
  ]);
  expect(classificationTargets(next)).toHaveLength(0);
  expect(applyClassifications(next, late)).toBe(next);
});
it('food clarification preserves a separately classified package and its reviewed measurement', () => {
  const data = unclear();
  data.stock[0]!.ingredient = { id: 'brown-rice', preparation: 'dry', basis: 'as-sold' };
  data.stock[0]!.ingredientSize = { amount: 320, measure: 'g', packs: 1 };
  data.stock[0]!.ingredientSizeBasis = 'as-sold';
  const next = reduceChecked(data, command(data));
  expect(next.stock).toEqual(data.stock);
});
