import { expect, it } from 'vitest';
import { emptySnapshot } from '../../../src/domain/model';
import { reduceChecked } from '../../../src/domain/reducer';
import { normalizeBarcode } from '../../../src/domain/products/barcode';
import { parseSize } from '../../../src/domain/products/size';
import { rememberedProduct, variantKey } from '../../../src/domain/products/variants';
import { egg } from '../fixtures';

const food = { ...egg, name: 'Black Beans', unit: 'cans' as const, size: parseSize('15 oz') };
function scan(brand: string, size = '15 oz') {
  const candidate = { ...food, id: crypto.randomUUID(), size: parseSize(size) };
  return {
    type: 'stock.scan' as const,
    food: candidate,
    stock: {
      id: crypto.randomUUID(),
      foodId: candidate.id,
      quantity: 1,
      product: { barcode: normalizeBarcode('3017620422003'), name: `${brand} Black Beans`, brand },
    },
  };
}
it('shares counts across brands, separates sizes, and retries the same scan exactly once', () => {
  const first = scan('Heinz');
  let data = reduceChecked(emptySnapshot(), first);
  data = reduceChecked(data, first);
  data = reduceChecked(data, scan('Great Value'));
  data = reduceChecked(data, scan('Heinz', '29 oz'));
  expect(data.foods).toHaveLength(2);
  expect(data.stock).toHaveLength(3);
  expect(data.stock[0]?.foodId).toBe(data.stock[1]?.foodId);
  expect(data.stock[2]?.foodId).not.toBe(data.stock[0]?.foodId);
  expect(data.stock.map((lot) => lot.product?.brand)).toEqual(['Heinz', 'Great Value', 'Heinz']);
});
it('retains barcode corrections with zero stock, and removes them when the food is deleted', () => {
  const command = scan('Heinz');
  let data = reduceChecked(emptySnapshot(), command);
  data = reduceChecked(data, { type: 'stock.adjust', stockId: command.stock.id, delta: -1 });
  expect(rememberedProduct(data, '3017620422003')?.food.name).toBe('Black Beans');
  data = reduceChecked(data, { type: 'food.remove', foodId: command.food.id });
  expect(rememberedProduct(data, '3017620422003')).toBeUndefined();
});
it('normalizes barcode aliases, validates checksums, and distinguishes measure dimensions and multipacks', () => {
  expect(normalizeBarcode('012345678905')).toBe(normalizeBarcode('0012345678905'));
  expect(() => normalizeBarcode('3017620422004')).toThrow();
  expect(() => normalizeBarcode('00000000')).toThrow();
  expect(parseSize('2 x 150 g')).toEqual({ amount: 150, measure: 'g', packs: 2 });
  expect(parseSize('15 oz (425 g)')).toBeUndefined();
  expect(parseSize('400 g e')).toEqual({ amount: 400, measure: 'g', packs: 1 });
  expect(variantKey({ ...food, size: undefined, packageSize: '15oz' })).toBe(variantKey(food));
  expect(variantKey({ ...food, size: parseSize('15 fl oz') })).not.toBe(variantKey(food));
});
it('keeps matching-size shopping stock linked and preserves size when food is deleted', () => {
  const command = scan('Heinz');
  let data = reduceChecked(emptySnapshot(), command);
  data = reduceChecked(data, {
    type: 'shopping.save',
    item: {
      id: crypto.randomUUID(),
      foodId: command.food.id,
      name: 'Beans',
      unit: 'cans',
      quantity: 2,
      purchased: false,
    },
  });
  expect(data.shopping[0]?.packageSize).toBe('15 oz');
  data = reduceChecked(data, { type: 'food.remove', foodId: command.food.id });
  expect(data.shopping[0]?.foodId).toBeUndefined();
  expect(data.shopping[0]?.packageSize).toBe('15 oz');
});
