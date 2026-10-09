import { expect, it } from 'vitest';
import { z } from 'zod';
import {
  projectCatalog,
  projectRecipes,
  requestedCatalogRevision,
  assertCatalogWritable,
} from '../../../api/catalog-compatibility';
import registry from '../../../src/domain/ingredient-matching/registry.json' with { type: 'json' };
import { ingredientIdentitySchema } from '../../../src/domain/ingredient-matching/model';
import { savedStandardizationSchema } from '../../../src/domain/standardization/model';
import { emptySnapshot } from '../../../src/domain/model';
import { expandedKitchen } from './fixtures';

it.each([undefined, '', 'invalid', '-1', '0', '1', '2.0', '999'])(
  'treats unsupported revision %s as legacy',
  (value) => {
    expect(requestedCatalogRevision(value)).toBe(1);
  },
);
it('uses revision two only when explicitly requested', () =>
  expect(requestedCatalogRevision('2')).toBe(2));
it('projects every classified entity to a legacy-decodable shape without mutating source or quantities', () => {
  const source = { revision: 12, data: expandedKitchen() };
  const before = structuredClone(source);
  const projected = projectCatalog(source, 1);
  const oldIds = registry.filter((item) => !('introduced' in item)).map((item) => item.id);
  const legacyFields = z.object({
    ingredient: ingredientIdentitySchema.extend({ id: z.enum(oldIds) }).optional(),
    standardization: savedStandardizationSchema
      .extend({ identity: z.enum(oldIds).nullable() })
      .optional(),
  });
  const entities = [
    ...projected.data.foods,
    ...projected.data.stock,
    ...projected.data.shopping,
    ...projected.data.recipes!.flatMap((item) => item.ingredients),
  ];
  for (const entity of entities) {
    expect(legacyFields.safeParse(entity).success).toBe(true);
    expect(entity.ingredient).toBeUndefined();
  }
  expect(projected.data.foods[0]!.standardization).toMatchObject({
    status: 'unknown',
    identity: null,
    preparation: 'unknown',
  });
  expect(projected.revision).toBe(12);
  expect(projected.data.stock[0]!.quantity).toBe(1.234567);
  expect(projected.data.shopping[0]!.quantity).toBe(source.data.shopping[0]!.quantity);
  expect(projected.data.recipes![0]!.ingredients[0]!.quantity).toBe(
    source.data.recipes![0]!.ingredients[0]!.quantity,
  );
  expect(source).toEqual(before);
  expect(projectCatalog(source, 2)).toBe(source);
});
it('does not add optional cookbook arrays or alter existing descriptor IDs', () => {
  const data = emptySnapshot();
  expect(projectCatalog({ revision: 0, data }, 1)).toEqual({ revision: 0, data });
  expect(() => assertCatalogWritable(data, 1)).not.toThrow();
});
it('protects unreadable manual classifications from old writes while current clients can edit', () => {
  expect(() => assertCatalogWritable(expandedKitchen(), 1)).toThrow('Update the app');
  expect(() => assertCatalogWritable(expandedKitchen(), 2)).not.toThrow();
});
it('also projects generated recipe previews without changing their content or ingredient amounts', () => {
  const recipes = expandedKitchen().recipes;
  const result = projectRecipes({ recipes }, 1);
  expect(result.recipes[0]!.ingredients[0]!.ingredient).toBeUndefined();
  expect(result.recipes[0]!.steps).toEqual(recipes[0]!.steps);
  expect(result.recipes[0]!.ingredients[0]!.quantity).toBe(recipes[0]!.ingredients[0]!.quantity);
  expect(recipes[0]!.ingredients[0]!.ingredient?.id).toBe('raspberries');
});
