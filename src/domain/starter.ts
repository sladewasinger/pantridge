import type { Food, Snapshot } from './model';

const items = [
  ['Eggs', 'cartons', 'eggs', 'fridge'],
  ['Milk', 'cartons', 'milk', 'fridge'],
  ['Butter', 'packs', 'butter', 'fridge'],
  ['Black beans', 'cans', 'can', 'pantry'],
  ['Rice', 'bags', 'rice', 'pantry'],
  ['Pasta', 'boxes', 'pasta', 'pantry'],
] as const;
export const starterMutationId = 'cf51426f-18cf-45f0-a9ca-700000000000';
export function initializeStarter(data: Snapshot): Snapshot {
  if (data.starterVersion) return data;
  if (data.foods.length || data.stock.length || data.shopping.length)
    return { ...data, starterVersion: 1 };
  const foods: Food[] = items.map(([name, unit, art, location], index) => ({
    id: `cf51426f-18cf-45f0-a9ca-10000000000${index}`,
    name,
    unit,
    art,
    location,
    shelf: index % 3,
    frozen: false,
    brand: '',
    packageSize: '',
  }));
  return {
    ...data,
    starterVersion: 1,
    foods,
    stock: foods.map((food, index) => ({
      id: `cf51426f-18cf-45f0-a9ca-20000000000${index}`,
      foodId: food.id,
      quantity: 1,
    })),
  };
}
