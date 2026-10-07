import type { Snapshot } from '../model';
import type { Command } from '../commands';
import { stockIdentity } from './classification';

export function classifyStock(
  data: Snapshot,
  command: Extract<Command, { type: 'stock.classify' }>,
): Snapshot {
  return {
    ...data,
    stock: data.stock.map((stock) =>
      stock.id === command.stockId
        ? {
            ...stock,
            ingredient: command.ingredient ?? undefined,
            ingredientSize: undefined,
            ingredientSizeBasis: undefined,
          }
        : stock,
    ),
  };
}
export function measureStock(
  data: Snapshot,
  command: Extract<Command, { type: 'stock.recipeAmount' }>,
): Snapshot {
  return {
    ...data,
    stock: data.stock.map((stock) => {
      if (stock.id !== command.stockId) return stock;
      const food = data.foods.find((food) => food.id === stock.foodId)!;
      return {
        ...stock,
        ingredientSize: command.size ?? undefined,
        ingredientSizeBasis: command.size ? stockIdentity(food, stock)?.basis : undefined,
      };
    }),
  };
}
