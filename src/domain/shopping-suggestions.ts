import type { Snapshot } from './model';
import { countFood, foodLots } from './selectors';

export function shoppingSuggestions(data: Snapshot, query: string) {
  const listed = new Set(data.shopping.map((item) => item.foodId));
  return data.foods
    .filter(
      (food) =>
        !listed.has(food.id) && food.name.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .map((food) => ({
      food,
      count: countFood(data, food.id),
      date: foodLots(data, food.id)[0]?.expires ?? '9999',
    }))
    .sort(
      (a, b) =>
        a.count - b.count ||
        a.date.localeCompare(b.date) ||
        a.food.name.localeCompare(b.food.name) ||
        a.food.id.localeCompare(b.food.id),
    )
    .slice(0, 6)
    .map(({ food }) => food);
}
