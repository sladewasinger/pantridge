import type { Command } from './commands';
import { snapshotSchema, type Snapshot } from './model';
import { initializeStarter } from './starter';
import { saveFood, removeFood, normalizeShopping, restoreFood } from './food-commands';
import { addScannedStock } from './products/scan-command';
import { restoreShopping } from './shopping-commands';

function replace<T extends { id: string }>(list: T[], value: T): T[] {
  return [...list.filter((item) => item.id !== value.id), value];
}

function putAway(
  data: Snapshot,
  command: Extract<Command, { type: 'shopping.putAway' }>,
): Snapshot {
  const entry = data.shopping.find((item) => item.id === command.itemId);
  if (!entry?.purchased) return data;
  if (command.stock.foodId !== command.food.id) throw new Error('Food and stock do not match.');
  if (entry.foodId && entry.foodId !== command.food.id)
    throw new Error('Purchased food and inventory do not match.');
  if (entry.unit !== command.food.unit)
    throw new Error('Purchased units do not match. Review this item.');
  if (data.stock.some((stock) => stock.id === command.stock.id))
    throw new Error('Stock ID already exists.');
  // A concurrent edit must not be silently consumed with stale quantities.
  if (entry.quantity !== command.stock.quantity)
    throw new Error('Purchased quantity changed. Review it before putting it away.');
  return {
    ...saveFood(data, command.food),
    stock: [...data.stock, command.stock],
    shopping: data.shopping.filter((item) => item.id !== command.itemId),
  };
}

export function applyCommand(data: Snapshot, command: Command): Snapshot {
  switch (command.type) {
    case 'kitchen.initialize':
      return initializeStarter(data);
    case 'food.remove':
      return removeFood(data, command.foodId);
    case 'food.restore':
      return restoreFood(data, command.food);
    case 'food.save':
      return saveFood(data, command.food);
    case 'stock.add':
      if (!data.foods.some((food) => food.id === command.stock.foodId))
        throw new Error('Food no longer exists.');
      if (data.stock.some((stock) => stock.id === command.stock.id)) return data;
      return { ...data, stock: [...data.stock, command.stock] };
    case 'stock.scan':
      return addScannedStock(data, command.food, command.stock);
    case 'stock.adjust':
      return {
        ...data,
        stock: data.stock.map((stock) =>
          stock.id === command.stockId
            ? { ...stock, quantity: Math.min(9999, Math.max(0, stock.quantity + command.delta)) }
            : stock,
        ),
      };
    case 'stock.date':
      return {
        ...data,
        stock: data.stock.map((stock) => {
          if (stock.id !== command.stockId) return stock;
          const { expires: _expires, ...rest } = stock;
          return command.expires ? { ...rest, expires: command.expires } : rest;
        }),
      };
    case 'shopping.save':
      return { ...data, shopping: replace(data.shopping, normalizeShopping(data, command.item)) };
    case 'shopping.purchase':
      return {
        ...data,
        shopping: data.shopping.map((item) =>
          item.id === command.itemId ? { ...item, purchased: command.purchased } : item,
        ),
      };
    case 'shopping.remove':
      return { ...data, shopping: data.shopping.filter((item) => item.id !== command.itemId) };
    case 'shopping.discard':
      return {
        ...data,
        shopping: data.shopping.filter((item) => item.id !== command.itemId || !item.purchased),
      };
    case 'shopping.restore':
      return restoreShopping(data, command.item);
    case 'shopping.putAway':
      return putAway(data, command);
  }
}

export function reduceChecked(data: Snapshot, command: Command): Snapshot {
  const next = snapshotSchema.parse(applyCommand(data, command));
  if (new TextEncoder().encode(JSON.stringify(next)).length > 280_000) {
    throw new Error(
      'Kitchen storage is full. Export a backup and archive old lots before adding more.',
    );
  }
  return next;
}
