import type { Food, Stock } from '../model';
import { parseSize } from '../products/size';
import type { RecipeUnit } from './model';

type Dimension = 'mass' | 'volume' | 'count';
const measures: Record<Exclude<RecipeUnit, 'package'>, { dimension: Dimension; factor: number }> = {
  count: { dimension: 'count', factor: 1 },
  g: { dimension: 'mass', factor: 1 },
  kg: { dimension: 'mass', factor: 1000 },
  oz: { dimension: 'mass', factor: 28.349523125 },
  lb: { dimension: 'mass', factor: 453.59237 },
  ml: { dimension: 'volume', factor: 1 },
  l: { dimension: 'volume', factor: 1000 },
  'fl oz': { dimension: 'volume', factor: 29.5735295625 },
  gal: { dimension: 'volume', factor: 3785.411784 },
  tsp: { dimension: 'volume', factor: 4.92892159375 },
  tbsp: { dimension: 'volume', factor: 14.78676478125 },
  cup: { dimension: 'volume', factor: 236.5882365 },
};
// Volume measures are US customary. No mass/volume or density assumptions.
export function convertRecipeAmount(
  amount: number,
  from: RecipeUnit,
  to: RecipeUnit,
): number | undefined {
  if (from === 'package' || to === 'package') return undefined;
  if (measures[from].dimension !== measures[to].dimension) return undefined;
  return (amount * measures[from].factor) / measures[to].factor;
}
export function packageAmount(food: Food, unit: RecipeUnit, lot?: Stock): number | undefined {
  const size = lot?.ingredientSize ?? food.size ?? parseSize(food.packageSize);
  if (size) return convertRecipeAmount(size.amount * size.packs, size.measure, unit);
  // An item is one count; a carton/can/cup/etc. is an unknown package without a declared size.
  return food.unit === 'items' && unit === 'count' ? 1 : undefined;
}
