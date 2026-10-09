import { expect, it } from 'vitest';
import { kitchen, ingredient } from '../ingredient-matching/fixtures';
import { stockIdentity } from '../../../src/domain/ingredient-matching/classification';
import { lotMatch } from '../../../src/domain/ingredient-matching/resolver';
import { classifyRecipeIngredient } from '../../../src/domain/ingredient-matching/classification';
import {
  classificationTargets,
  applyClassifications,
} from '../../../src/domain/standardization/targets';
import {
  stockEvidence,
  foodEvidence,
  evidenceFingerprint,
} from '../../../src/domain/standardization/evidence';
import {
  standardizationVersion,
  type SavedStandardization,
} from '../../../src/domain/standardization/model';

it.each([
  'Raspberries',
  'Blueberries',
  'Strawberries',
  'Granola',
  'Wheat crackers',
  'Sardines',
  'Hot sauce',
  'Oats',
  'Yogurt',
])('%s has a shared local identity without an AI request or clarification', (name) => {
  const data = kitchen(name);
  expect(classificationTargets(data)).toEqual([]);
  const row = classifyRecipeIngredient(ingredient(name));
  expect(row.ingredient?.id).not.toMatch(/^custom-/);
  expect(lotMatch(data, row, { food: data.foods[0]!, lot: data.stock[0]! })).toBe('compatible');
});
function saved(name: string, status: SavedStandardization['status'] = 'taxonomy-gap') {
  const data = kitchen(name);
  data.stock[0]!.product = { barcode: '12345670', name, brand: 'Fixture' };
  data.stock[0]!.standardization = {
    status,
    identity: null,
    preparation: 'unknown',
    reason: 'Previous taxonomy',
    version: '1',
    source: 'ai-private',
    fingerprint: evidenceFingerprint(stockEvidence(data.foods[0]!, data.stock[0]!)),
  };
  return data;
}
it('resolves a previous raspberry taxonomy gap locally without changing the saved quantities', () => {
  const data = saved('Raspberries');
  const before = structuredClone(data);
  expect(classificationTargets(data)).toEqual([]);
  expect(stockIdentity(data.foods[0]!, data.stock[0]!)).toEqual({
    id: 'raspberries',
    preparation: 'raw',
    basis: 'as-sold',
  });
  expect(data).toEqual(before);
});
it('retries obsolete negative results once and keeps a composite blocked while queued', () => {
  const data = saved('Rice and beans dinner', 'composite');
  const targets = classificationTargets(data);
  expect(targets.some((target) => target.key.startsWith('stock:'))).toBe(true);
  expect(stockIdentity(data.foods[0]!, data.stock[0]!)).toBeUndefined();
  const next = applyClassifications(
    data,
    new Map(
      targets.map((target) => [
        target.key,
        {
          ...data.stock[0]!.standardization!,
          version: standardizationVersion,
          fingerprint: target.fingerprint,
        },
      ]),
    ),
  );
  expect(classificationTargets(next)).toEqual([]);
  expect(lotMatch(next, ingredient('Rice'), { food: next.foods[0]!, lot: next.stock[0]! })).toBe(
    'none',
  );
});
it('reuses an older successful classification and respects manual corrections', () => {
  const data = saved('Ready brown rice');
  data.foods[0]!.name = 'Rice';
  data.stock[0]!.standardization = {
    ...data.stock[0]!.standardization!,
    status: 'recognized',
    identity: 'brown-rice',
    preparation: 'cooked',
  };
  expect(classificationTargets(data)).toEqual([]);
  data.stock[0]!.ingredient = { id: 'rice', preparation: 'dry', basis: 'as-sold' };
  expect(stockIdentity(data.foods[0]!, data.stock[0]!)).toEqual(data.stock[0]!.ingredient);
});
it('uses explicit can packaging for recognized beans without inventing drained quantities', () => {
  const data = saved('Store black beans');
  data.foods[0]!.name = 'Black beans';
  data.foods[0]!.unit = 'cans';
  data.stock[0]!.standardization = {
    ...data.stock[0]!.standardization!,
    status: 'recognized',
    identity: 'black-beans',
  };
  expect(stockIdentity(data.foods[0]!, data.stock[0]!)).toEqual({
    id: 'black-beans',
    preparation: 'canned',
    basis: 'as-sold',
  });
  expect(data.stock[0]!.ingredientSize).toBeUndefined();
  expect(data.stock[0]!.quantity).toBe(2);
  data.stock[0]!.product!.name = 'Dry black beans';
  data.stock[0]!.standardization!.fingerprint = evidenceFingerprint(
    stockEvidence(data.foods[0]!, data.stock[0]!),
  );
  expect(stockIdentity(data.foods[0]!, data.stock[0]!)?.preparation).toBe('unknown');
});
it('does not replace an AI unknown preparation with a registry default or a generic shelf name', () => {
  const data = saved('Brown rice');
  data.foods[0]!.name = 'Cooked rice';
  data.stock[0]!.standardization = {
    ...data.stock[0]!.standardization!,
    status: 'recognized',
    identity: 'brown-rice',
  };
  expect(stockIdentity(data.foods[0]!, data.stock[0]!)?.preparation).toBe('unknown');
});
it('does not classify an unknown canned composite as the generic shelf food before AI completes', () => {
  const data = kitchen('Black beans');
  data.foods[0]!.unit = 'cans';
  data.stock[0]!.product = { barcode: '12345670', name: 'Southwest dinner', brand: 'Fixture' };
  expect(stockIdentity(data.foods[0]!, data.stock[0]!)?.preparation).toBe('unknown');
});
it('generic crackers do not satisfy a saltine requirement and granola is not plain oats', () => {
  for (const [present, required] of [
    ['Crackers', 'Saltine crackers'],
    ['Granola', 'Oats'],
  ]) {
    const data = kitchen(present!);
    expect(
      lotMatch(data, ingredient(required!), { food: data.foods[0]!, lot: data.stock[0]! }),
    ).toBe('none');
  }
});
it('keeps food evidence stable when the classifier policy changes', () => {
  const data = kitchen('Store cereal');
  const evidence = foodEvidence(data.foods[0]!);
  // v1 fingerprint remains usable by v2, independent of taxonomy policy.
  expect(evidenceFingerprint(evidence)).toBe(
    'f2990f8696d27654900e4357d1f388e45194bf7011d63e7eaa2a6ac90427029f',
  );
});
