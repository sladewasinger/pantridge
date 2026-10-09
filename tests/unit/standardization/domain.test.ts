import { expect, it } from 'vitest';
import { kitchen, recipe, ingredient } from '../ingredient-matching/fixtures';
import {
  classificationTargets,
  applyClassifications,
} from '../../../src/domain/standardization/targets';
import {
  foodIdentity,
  stockIdentity,
} from '../../../src/domain/ingredient-matching/classification';
import { stockEvidence, evidenceFingerprint } from '../../../src/domain/standardization/evidence';
import { snapshotSchema, type Snapshot } from '../../../src/domain/model';
import {
  standardizationVersion,
  type SavedStandardization,
} from '../../../src/domain/standardization/model';
import { reduceChecked } from '../../../src/domain/reducer';
import { lotMatch } from '../../../src/domain/ingredient-matching/resolver';
import { lotCookingSignature } from '../../../src/domain/recipes/cooking';

function result(
  data: Snapshot,
  key = classificationTargets(data)[0]!.key,
): Map<string, SavedStandardization> {
  const target = classificationTargets(data).find((item) => item.key === key)!;
  return new Map([
    [
      key,
      {
        status: 'recognized',
        identity: 'brown-rice',
        preparation: 'cooked',
        reason: '',
        version: standardizationVersion,
        source: 'ai-private',
        fingerprint: target.fingerprint,
      },
    ],
  ]);
}
function branded(): Snapshot {
  const data = kitchen('Rice');
  data.stock[0]!.product = {
    barcode: '012345678905',
    name: "Ben's Original Ready Rice Whole Grain Brown",
    brand: "Ben's Original",
  };
  return data;
}
it('persists an upstream identity and uses it locally without confusing cooked and dry quantities', () => {
  const data = branded();
  const before = lotCookingSignature(data.foods[0]!, data.stock[0]!);
  const saved = snapshotSchema.parse(
    JSON.parse(JSON.stringify(applyClassifications(data, result(data)))),
  );
  expect(classificationTargets(saved)).toHaveLength(0);
  expect(saved.stock[0]!.quantity).toBe(2);
  expect(saved.foods[0]!.size).toEqual(data.foods[0]!.size);
  expect(stockIdentity(saved.foods[0]!, saved.stock[0]!)).toEqual({
    id: 'brown-rice',
    preparation: 'cooked',
    basis: 'as-sold',
  });
  expect(
    lotMatch(saved, ingredient('Brown rice'), { food: saved.foods[0]!, lot: saved.stock[0]! }),
  ).toBe('review');
  expect(
    lotMatch(saved, ingredient('Cooked brown rice'), {
      food: saved.foods[0]!,
      lot: saved.stock[0]!,
    }),
  ).toBe('compatible');
  expect(lotCookingSignature(saved.foods[0]!, saved.stock[0]!)).not.toBe(before);
});
it('rejects late results after barcode changes, manual corrections, or measured package edits', () => {
  const data = branded();
  const results = result(data);
  for (const change of ['barcode', 'lot', 'food', 'measurement']) {
    const current = structuredClone(data);
    if (change === 'barcode') current.stock[0]!.product!.barcode = '4006381333931';
    if (change === 'lot')
      current.stock[0]!.ingredient = { id: 'rice', preparation: 'dry', basis: 'as-sold' };
    if (change === 'food')
      current.foods[0]!.ingredient = { id: 'rice', preparation: 'dry', basis: 'as-sold' };
    if (change === 'measurement')
      current.stock[0]!.ingredientSize = { amount: 100, measure: 'g', packs: 1 };
    expect(applyClassifications(current, results)).toEqual(current);
  }
});
it('preserves quantity edits during classification and invalidates changed source names', () => {
  const data = branded();
  const results = result(data);
  const edited = reduceChecked(data, {
    type: 'stock.adjust',
    stockId: data.stock[0]!.id,
    delta: 1,
  });
  expect(applyClassifications(edited, results).stock[0]!.quantity).toBe(3);
  edited.stock[0]!.product!.name = 'Different meal';
  expect(applyClassifications(edited, results)).toEqual(edited);
});
it('composites do not inherit their generic shelf identity and negative results persist', () => {
  const data = branded();
  const results = result(data);
  for (const value of results.values()) {
    value.status = 'composite';
    value.identity = null;
  }
  const saved = applyClassifications(data, results);
  expect(stockIdentity(saved.foods[0]!, saved.stock[0]!)).toBeUndefined();
  expect(classificationTargets(snapshotSchema.parse(saved))).toHaveLength(0);
});
it('AI identification does not authorize ambiguous garlic counts', () => {
  const data = branded();
  data.foods[0]!.name = 'Garlic';
  data.foods[0]!.unit = 'items';
  const results = result(data);
  for (const value of results.values()) {
    value.identity = 'garlic';
    value.preparation = 'raw';
  }
  const saved = applyClassifications(data, results);
  expect(
    lotMatch(saved, ingredient('Garlic', { unit: 'count' }), {
      food: saved.foods[0]!,
      lot: saved.stock[0]!,
    }),
  ).toBe('review');
});
it('does not replace measured amounts when classifying a generic food', () => {
  const data = kitchen('Unfamiliar rice');
  const results = result(data);
  data.stock[0]!.ingredientSize = { amount: 100, measure: 'g', packs: 1 };
  expect(applyClassifications(data, results)).toEqual(data);
});
it('preserves completed recipe results through stale edits and respects manual recipe identities', () => {
  const data = kitchen('Rice');
  const original = recipe(ingredient('Unfamiliar rice'));
  data.recipes = [original];
  const saved = applyClassifications(data, result(data));
  const edited = reduceChecked(saved, {
    type: 'recipe.save',
    recipe: { ...original, title: 'New title' },
  });
  expect(edited.recipes![0]!.ingredients[0]!.standardization).toEqual(
    saved.recipes![0]!.ingredients[0]!.standardization,
  );
  expect(classificationTargets(edited)).toHaveLength(0);
});
it('known generic identities require no classification and unrelated edits preserve saved identity', () => {
  expect(classificationTargets(kitchen('Rice'))).toHaveLength(0);
  const data = kitchen('Unfamiliar rice');
  const saved = applyClassifications(data, result(data));
  const food = { ...data.foods[0]!, art: 'generic' as const, unit: 'boxes' as const };
  const edited = reduceChecked(saved, { type: 'food.save', food });
  expect(foodIdentity(edited.foods[0]!)?.id).toBe('brown-rice');
});
it('bounds kitchen growth at 500 while keeping existing larger kitchens editable', () => {
  const data = kitchen('Rice');
  data.foods = Array.from({ length: 500 }, (_, index) => ({
    ...data.foods[0]!,
    id: index === 0 ? data.foods[0]!.id : crypto.randomUUID(),
  }));
  expect(() =>
    reduceChecked(data, {
      type: 'food.save',
      food: { ...data.foods[0]!, id: crypto.randomUUID() },
    }),
  ).toThrow('500-item limit');
  data.foods.push({ ...data.foods[0]!, id: crypto.randomUUID() });
  expect(
    reduceChecked(data, { type: 'food.save', food: { ...data.foods[0]!, name: 'Brown rice' } })
      .foods,
  ).toHaveLength(501);
});
it('binds saved product evidence to its barcode', () => {
  const data = branded();
  const first = evidenceFingerprint(stockEvidence(data.foods[0]!, data.stock[0]!));
  data.stock[0]!.product!.barcode = '4006381333931';
  expect(evidenceFingerprint(stockEvidence(data.foods[0]!, data.stock[0]!))).not.toBe(first);
});
