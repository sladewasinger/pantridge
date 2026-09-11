import type { Food, Snapshot, Stock, Unit } from './model';

export const countFood = (data: Snapshot, foodId: string): number =>
  data.stock
    .filter((stock) => stock.foodId === foodId)
    .reduce((sum, stock) => sum + stock.quantity, 0);

export const foodLots = (data: Snapshot, foodId: string): Stock[] =>
  data.stock
    .filter((stock) => stock.foodId === foodId && stock.quantity > 0)
    .sort((a, b) => (a.expires ?? '9999').localeCompare(b.expires ?? '9999'));

export const stockedFoods = (data: Snapshot): Food[] =>
  data.foods.filter((food) => countFood(data, food.id) > 0);

const cellarRank = (food: Food) =>
  food.frozen ? 3 : { unspecified: 0, fridge: 1, pantry: 2 }[food.location];

export const cellarFoods = (data: Snapshot): Food[] =>
  stockedFoods(data).sort(
    (a, b) =>
      cellarRank(a) - cellarRank(b) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );

export function units(quantity: number, unit: Unit): string {
  if (quantity !== 1) return `${quantity} ${unit}`;
  return `1 ${unit === 'boxes' ? 'box' : unit.slice(0, -1)}`;
}

export function dateLabel(date: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
    new Date(`${date}T12:00:00`),
  );
}

export const newFood = (name = ''): Food => ({
  id: crypto.randomUUID(),
  name,
  unit: 'items',
  art: 'generic',
  brand: '',
  packageSize: '',
  location: 'pantry',
  shelf: 0,
  frozen: false,
});
