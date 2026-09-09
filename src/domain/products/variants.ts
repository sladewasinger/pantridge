import type { Food, Snapshot } from '../model';
import { parseSize, sizeLabel } from './size';
import { normalizeBarcode } from './barcode';

export const foodGroup = (name: string) =>
  name.trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
export const packageLabel = (food: Food) => sizeLabel(food.size) || food.packageSize.trim();
export function variantKey(food: Food): string {
  const size = sizeLabel(food.size ?? parseSize(food.packageSize)) || food.packageSize;
  return JSON.stringify([foodGroup(food.name), food.unit, foodGroup(size)]);
}
export function matchVariant(data: Snapshot, candidate: Food): Food | undefined {
  return data.foods.find((food) => variantKey(food) === variantKey(candidate));
}
export function rememberedProduct(data: Snapshot, barcode: string) {
  const code = normalizeBarcode(barcode);
  const stock = [...data.stock].reverse().find((lot) => lot.product?.barcode === code);
  const food = data.foods.find((item) => item.id === stock?.foodId);
  return food && stock?.product ? { food, product: stock.product } : undefined;
}
