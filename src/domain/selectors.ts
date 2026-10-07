import type { Food, Snapshot, Stock, Unit } from './model';
import { isSupply } from './supplies';
import { roundQuantity } from './quantity';

export const countFood = (data: Snapshot, foodId: string): number =>
  roundQuantity(
    data.stock
      .filter((stock) => stock.foodId === foodId)
      .reduce((sum, stock) => sum + stock.quantity, 0),
  );

export const storagePlace = (food: Food) =>
  isSupply(food) ? 'unspecified' : food.frozen ? 'freezer' : food.location;

export const storageLabel = (place: Food['location'] | 'freezer') =>
  ({ unspecified: 'Storage', fridge: 'Fridge', pantry: 'Pantry', freezer: 'Freezer' })[place];

export const foodLots = (data: Snapshot, foodId: string): Stock[] =>
  data.stock
    .filter((stock) => stock.foodId === foodId && stock.quantity > 0)
    .sort((a, b) => (a.expires ?? '9999').localeCompare(b.expires ?? '9999'));

export const stockedFoods = (data: Snapshot): Food[] =>
  data.foods.filter((food) => countFood(data, food.id) > 0);

const cellarRank = (food: Food) =>
  ({ unspecified: 0, fridge: 1, pantry: 2, freezer: 3 })[storagePlace(food)];

export const cellarFoods = (data: Snapshot): Food[] =>
  stockedFoods(data).sort(
    (a, b) =>
      cellarRank(a) - cellarRank(b) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );

export function units(quantity: number, unit: Unit): string {
  if (roundQuantity(quantity) !== 1) return `${roundQuantity(quantity)} ${unit}`;
  return `1 ${unit === 'boxes' ? 'box' : unit.slice(0, -1)}`;
}

export function dateLabel(date: string, today = new Date()): string {
  const value = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: value.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  }).format(value);
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
