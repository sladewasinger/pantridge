import type { Food } from './model';
import { householdArt } from './artwork/household';

const householdIds = new Set<string>(householdArt.map(([id]) => id));

// Explicit choices take precedence over artwork, including on legacy items.
export function isSupply(food: Pick<Food, 'kind'> & Partial<Pick<Food, 'art'>>): boolean {
  return food.kind ? food.kind === 'supply' : householdIds.has(food.art ?? '');
}

export function normalizeSupply(food: Food): Food {
  return isSupply(food) ? { ...food, location: 'unspecified', frozen: false } : food;
}
