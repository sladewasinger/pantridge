import type { ShoppingItem, Snapshot } from './model';
import { normalizeShopping } from './food-commands';

export function restoreShopping(data: Snapshot, item: ShoppingItem): Snapshot {
  if (data.shopping.some((entry) => entry.id === item.id)) return data;
  const { foodId, ...standalone } = item;
  const restored = data.foods.some((food) => food.id === foodId)
    ? normalizeShopping(data, item)
    : standalone;
  return { ...data, shopping: [...data.shopping, restored] };
}
