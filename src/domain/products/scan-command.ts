import type { Food, Snapshot, Stock } from '../model';
import { saveFood } from '../food-commands';
import { matchVariant } from './variants';

export function addScannedStock(data: Snapshot, candidate: Food, stock: Stock): Snapshot {
  if (data.stock.some((lot) => lot.id === stock.id)) return data;
  if (!stock.product || stock.foodId !== candidate.id)
    throw new Error('Food and stock do not match.');
  const existing = matchVariant(data, candidate);
  const food = existing
    ? {
        ...existing,
        art: candidate.art,
        location: candidate.location,
        frozen: candidate.frozen,
        shelf: candidate.shelf,
      }
    : candidate;
  if (!existing && data.foods.some((item) => item.id === candidate.id))
    throw new Error('Food changed. Scan it again.');
  return {
    ...saveFood(data, food),
    stock: [...data.stock, { ...stock, foodId: food.id }],
  };
}
