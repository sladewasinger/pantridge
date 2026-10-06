import { expect, it } from 'vitest';
import { foodSchema, snapshotSchema } from '../../../src/domain/model';
import { isSupply, normalizeSupply } from '../../../src/domain/supplies';
import {
  countFood,
  newFood,
  storageLabel,
  storagePlace,
  units,
} from '../../../src/domain/selectors';
import { estimatedDate, reminderDays } from '../../../src/domain/freshness/estimate';
import { variantKey } from '../../../src/domain/products/variants';
import { reduceChecked } from '../../../src/domain/reducer';
import { kitchen } from '../fixtures';

it('preserves legacy items and infers supplies only from household artwork', () => {
  const legacy = foodSchema.parse({ ...newFood('Napkins'), art: 'napkins' });
  expect(legacy.kind).toBeUndefined();
  expect(isSupply(legacy)).toBe(true);
  expect(storagePlace(legacy)).toBe('unspecified');
  expect(storageLabel('unspecified')).toBe('Storage');
  expect(isSupply({ ...legacy, kind: 'food' })).toBe(false);
  expect(isSupply({ ...newFood('Dish soap'), kind: 'supply' })).toBe(true);
  const unassignedFood = { ...newFood('Rice'), location: 'unspecified' as const };
  expect(isSupply(unassignedFood)).toBe(false);
  expect(snapshotSchema.parse(kitchen())).toEqual(kitchen());
});

it('keeps identity, package, quantity and date metadata when changing item type', () => {
  const data = kitchen();
  const original = foodSchema.parse({
    ...data.foods[0]!,
    brand: 'Test brand',
    packageSize: '12 count',
    nutritionEstimate: {
      source: 'ai',
      name: 'Eggs',
      details: 'Illustrative fixture',
      estimatedAt: '2026-09-25T00:00:00Z',
      basis: 'g',
      assumptions: 'Illustrative fixture only.',
      per100: {
        calories: 100,
        fat: 1,
        saturatedFat: null,
        carbohydrates: 1,
        sugars: null,
        fiber: null,
        protein: 1,
        sodium: null,
      },
    },
  });
  data.foods[0] = original;
  data.stock[0]!.product = {
    barcode: '03017620422003',
    name: 'Package eggs',
    brand: 'Test brand',
    nutrition: { basis: 'g', per100: { calories: 100 } },
  };
  const supply = normalizeSupply({ ...original, kind: 'supply' });
  const changed = reduceChecked(data, { type: 'food.save', food: supply });
  expect(changed.stock).toEqual(data.stock);
  expect(supply).toEqual({ ...original, kind: 'supply', location: 'unspecified', frozen: false });
  const restored = reduceChecked(changed, {
    type: 'food.save',
    food: normalizeSupply({ ...supply, kind: 'food' }),
  });
  expect(restored.stock).toEqual(data.stock);
  expect(restored.foods[0]?.art).toBe(original.art);
  expect(restored.foods[0]?.id).toBe(original.id);
  expect(restored.foods[0]?.packageSize).toBe(original.packageSize);
  expect(restored.foods[0]?.nutritionEstimate).toEqual(original.nutritionEstimate);
});

it('never estimates supply expiration even with a food-like name or an AI hint', () => {
  const today = new Date(2026, 8, 10);
  const food = { ...newFood('Milk'), location: 'fridge' as const };
  for (const item of [
    { ...food, kind: 'supply' as const },
    { ...food, art: 'paper-towels' as const },
  ]) {
    expect(reminderDays(item)).toBeUndefined();
    expect(estimatedDate(item, today, 100)).toEqual({});
  }
  expect(estimatedDate(food, today).expires).toBe('2026-09-17');
});

it('keeps supplies separate from matching food variants and rounds fractional stock displays', () => {
  const food = newFood('Rice');
  expect(variantKey(food)).not.toBe(variantKey({ ...food, kind: 'supply' }));
  expect(variantKey(food)).toBe(variantKey({ ...food, kind: 'food' }));
  const data = kitchen();
  data.stock = [
    { ...data.stock[0]!, quantity: 0.1 },
    { ...data.stock[0]!, id: crypto.randomUUID(), quantity: 0.2 },
  ];
  expect(countFood(data, data.foods[0]!.id)).toBe(0.3);
  expect(units(0.1 + 0.2, 'packs')).toBe('0.3 packs');
  expect(units(1, 'packs')).toBe('1 pack');
});

it('retains explicit type overrides when a matching scan replaces legacy artwork', () => {
  const data = kitchen();
  for (const kind of ['food', 'supply'] as const) {
    const existing = {
      ...data.foods[0]!,
      art: kind === 'supply' ? ('napkins' as const) : ('eggs' as const),
    };
    const candidate = {
      ...existing,
      id: crypto.randomUUID(),
      kind,
      art: kind === 'supply' ? ('generic' as const) : ('napkins' as const),
    };
    const next = reduceChecked(
      { ...data, foods: [existing] },
      {
        type: 'stock.scan',
        food: candidate,
        stock: {
          id: crypto.randomUUID(),
          foodId: candidate.id,
          quantity: 1,
          product: { barcode: '03017620422003', name: existing.name, brand: 'Test' },
        },
      },
    );
    expect(next.foods).toHaveLength(1);
    expect(next.foods[0]?.kind).toBe(kind);
    expect(isSupply(next.foods[0]!)).toBe(kind === 'supply');
    expect(countFood(next, existing.id)).toBe(3);
  }
});
