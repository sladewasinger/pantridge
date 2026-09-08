import type { Food, ShoppingItem, Snapshot } from './model';

export function restoreFood(data: Snapshot, food: Food): Snapshot {
  if (data.foods.some((item) => item.id === food.id)) throw new Error('Food already exists.');
  return { ...data, foods: [...data.foods, food] };
}

export function saveFood(data: Snapshot, food: Food): Snapshot {
  return {
    ...data,
    foods: [...data.foods.filter((item) => item.id !== food.id), food],
    shopping: data.shopping.map((item) =>
      item.foodId === food.id ? { ...item, name: food.name, unit: food.unit } : item,
    ),
  };
}
export function removeFood(data: Snapshot, foodId: string): Snapshot {
  return {
    ...data,
    foods: data.foods.filter((food) => food.id !== foodId),
    stock: data.stock.filter((stock) => stock.foodId !== foodId),
    shopping: data.shopping.map((item) => {
      if (item.foodId !== foodId) return item;
      const { foodId: _foodId, ...standalone } = item;
      return standalone;
    }),
  };
}
export function normalizeShopping(data: Snapshot, item: ShoppingItem): ShoppingItem {
  const food = data.foods.find((food) => food.id === item.foodId);
  return food ? { ...item, name: food.name, unit: food.unit } : item;
}
