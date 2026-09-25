import type { ShoppingItem, Snapshot } from './model';
import { normalizeShopping } from './food-commands';

// Relative moves replay safely over concurrent additions and never recreate removed rows.
export function moveShopping(data: Snapshot, itemId: string, beforeId: string | null): Snapshot {
  const item = data.shopping.find((entry) => entry.id === itemId);
  if (!item || beforeId === itemId) return data;
  const before = data.shopping.find((entry) => entry.id === beforeId);
  if (beforeId && (!before || before.purchased !== item.purchased)) return data;
  const shopping = data.shopping.filter((entry) => entry.id !== itemId);
  const index = before ? shopping.findIndex((entry) => entry.id === beforeId) : shopping.length;
  shopping.splice(index, 0, item);
  return { ...data, shopping };
}

export function restoreShopping(data: Snapshot, item: ShoppingItem): Snapshot {
  if (data.shopping.some((entry) => entry.id === item.id)) return data;
  const { foodId, ...standalone } = item;
  const restored = data.foods.some((food) => food.id === foodId)
    ? normalizeShopping(data, item)
    : standalone;
  return { ...data, shopping: [...data.shopping, restored] };
}
