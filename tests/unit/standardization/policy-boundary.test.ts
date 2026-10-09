import { expect, it } from 'vitest';
import { kitchen, ingredient, recipe } from '../ingredient-matching/fixtures';
import {
  foodIdentity,
  stockIdentity,
  recipeIdentity,
} from '../../../src/domain/ingredient-matching/classification';
import {
  classificationTargets,
  applyClassifications,
} from '../../../src/domain/standardization/targets';
import {
  foodEvidence,
  recipeEvidence,
  stockEvidence,
  evidenceFingerprint,
} from '../../../src/domain/standardization/evidence';
import {
  standardizationVersion,
  type SavedStandardization,
} from '../../../src/domain/standardization/model';
import { getRecipeAvailability } from '../../../src/domain/recipes/availability';

function negative(
  status: SavedStandardization['status'],
  version: string,
  fingerprint: string,
): SavedStandardization {
  return {
    status,
    version,
    fingerprint,
    source: 'ai-private',
    identity: null,
    preparation: 'unknown',
    reason: '',
  };
}
it.each(['unknown', 'uncertain', 'composite'] as const)(
  'keeps a saved food-level %s result out of recipe matches while a new policy retry is queued',
  (status) => {
    const data = kitchen('Raspberries');
    const food = data.foods[0]!;
    food.standardization = negative(status, '1', evidenceFingerprint(foodEvidence(food)));
    expect(classificationTargets(data).some((target) => target.key === `food:${food.id}`)).toBe(
      true,
    );
    expect(stockIdentity(food, data.stock[0]!)).toBeUndefined();
    expect(
      getRecipeAvailability(data, recipe(ingredient('Raspberries'))).ingredients[0]?.status,
    ).toBe('missing');
  },
);
it('permits a formerly missing taxonomy identity once exact local evidence establishes it', () => {
  const data = kitchen('Raspberries');
  const food = data.foods[0]!;
  food.standardization = negative('taxonomy-gap', '1', evidenceFingerprint(foodEvidence(food)));
  expect(foodIdentity(food)?.id).toBe('raspberries');
  expect(classificationTargets(data)).toHaveLength(0);
});
it('keeps negative recipe evidence out of automatic matching while allowing explicit manual corrections', () => {
  const data = kitchen('Raspberries');
  const row = ingredient('Raspberries');
  row.standardization = negative('composite', '1', evidenceFingerprint(recipeEvidence(row)));
  expect(recipeIdentity(row)).toBeUndefined();
  expect(getRecipeAvailability(data, recipe(row)).ingredients[0]?.status).toBe('missing');
  row.ingredient = { id: 'raspberries', preparation: 'raw', basis: 'as-sold' };
  expect(getRecipeAvailability(data, recipe(row)).ingredients[0]?.status).toBe('confirmed');
  const food = data.foods[0]!;
  food.standardization = negative(
    'uncertain',
    standardizationVersion,
    evidenceFingerprint(foodEvidence(food)),
  );
  expect(foodIdentity(food)).toBeUndefined();
  food.ingredient = row.ingredient;
  expect(stockIdentity(food, data.stock[0]!)).toEqual(row.ingredient);
});
it('does not let a delayed old-policy negative response replace the result of a current retry', () => {
  const data = kitchen('Specialty grain fixture');
  const target = classificationTargets(data)[0]!;
  const old = negative('unknown', '1', target.fingerprint);
  expect(applyClassifications(data, new Map([[target.key, old]]))).toEqual(data);
  expect(
    applyClassifications(
      data,
      new Map([
        [
          target.key,
          {
            ...old,
            status: 'recognized',
            identity: 'rice',
            preparation: 'dry',
          },
        ],
      ]),
    ),
  ).toEqual(data);
  const current = { ...old, version: standardizationVersion };
  expect(
    applyClassifications(data, new Map([[target.key, current]])).foods[0]!.standardization,
  ).toEqual(current);
});
it('uses explicit canned packaging for AI unknown preparation without equating drained and purchased weight', () => {
  const data = kitchen('Black beans', { unit: 'cans' });
  const food = data.foods[0]!;
  const lot = data.stock[0]!;
  lot.product = { barcode: '012345678905', name: 'Store black beans', brand: 'Test' };
  lot.standardization = {
    ...negative(
      'recognized',
      standardizationVersion,
      evidenceFingerprint(stockEvidence(food, lot)),
    ),
    identity: 'black-beans',
  };
  expect(stockIdentity(food, lot)).toMatchObject({
    id: 'black-beans',
    preparation: 'canned',
    basis: 'as-sold',
  });
  expect(
    getRecipeAvailability(data, recipe(ingredient('Black beans', { note: 'drained' })))
      .ingredients[0]?.status,
  ).toBe('needs-review');
  lot.product.name = 'Dry black beans';
  lot.standardization.fingerprint = evidenceFingerprint(stockEvidence(food, lot));
  expect(stockIdentity(food, lot)?.preparation).toBe('unknown');
});
