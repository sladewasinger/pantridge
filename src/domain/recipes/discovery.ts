import type { Food, Snapshot } from '../model';
import { isSupply } from '../supplies';
import { normalizeIngredientName } from './names';

const genericVarieties: Record<string, string[]> = {
  rice: [
    'brown rice',
    'white rice',
    'jasmine rice',
    'basmati rice',
    'long-grain rice',
    'short-grain rice',
  ],
  potatoes: ['fingerling potatoes', 'russet potatoes', 'yukon gold potatoes', 'red potatoes'],
  onions: [
    'red onions',
    'red onion',
    'yellow onions',
    'yellow onion',
    'white onions',
    'white onion',
  ],
};
function discoveryName(name: string) {
  return normalizeIngredientName(
    name
      .toLowerCase()
      .replace(/\((unsalted|salted|organic)\)/g, ' ')
      .replace(/\b(unsalted|salted|organic)\b/g, ' ')
      .trim()
      .replace(/\s+/g, ' '),
  );
}
// Suggestions for discovery only: never used for amounts, shopping, or deductions.
// No substring/brand guesses, preparation stripping, or reciprocal variety swaps.
export function possibleIngredientFoods(data: Snapshot, name: string): Food[] {
  const exact = normalizeIngredientName(name);
  const base = discoveryName(name);
  const stocked = new Set(data.stock.filter((lot) => lot.quantity > 0).map((lot) => lot.foodId));
  return data.foods.filter((food) => {
    if (isSupply(food) || !stocked.has(food.id) || normalizeIngredientName(food.name) === exact)
      return false;
    const candidate = discoveryName(food.name);
    return (
      candidate === base ||
      (Object.hasOwn(genericVarieties, base) && genericVarieties[base]!.includes(candidate))
    );
  });
}
