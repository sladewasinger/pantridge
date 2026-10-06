import type { Food, Snapshot, Stock } from '../model';
import { parseSize } from '../products/size';
import { roundQuantity } from '../quantity';
import { isSupply } from '../supplies';
import {
  recipeInventoryItemSchema,
  type RecipeInventoryItem,
  type RecipeSuggestionRequest,
} from './model';

function inventoryItem(food: Food, lots: Stock[], today: string): RecipeInventoryItem | undefined {
  if (isSupply(food)) return undefined;
  const usable = lots.filter((lot) => lot.quantity > 0 && (!lot.expires || lot.expires >= today));
  const packages = usable.reduce((total, lot) => total + lot.quantity, 0);
  const size = food.size ?? parseSize(food.packageSize);
  const until = Date.parse(today) + 7 * 86400000;
  const result = recipeInventoryItemSchema.safeParse({
    name: food.name,
    quantity: roundQuantity(packages * (size ? size.amount * size.packs : 1)),
    unit: size?.measure ?? (food.unit === 'items' ? 'count' : 'package'),
    useSoon: usable.some((lot) => lot.expires && Date.parse(lot.expires) <= until),
  });
  return result.success ? result.data : undefined;
}
// Only declared amounts leave the device. No IDs, brands, dates, nutrition, or shopping data.
// Recorded dates only prioritize reminders: these are never food-safety guarantees.
export function buildRecipeSuggestionRequest(
  data: Snapshot,
  useUp: boolean,
  today = new Date().toISOString().slice(0, 10),
): RecipeSuggestionRequest {
  const inventory = data.foods
    .map((food) =>
      inventoryItem(
        food,
        data.stock.filter((lot) => lot.foodId === food.id),
        today,
      ),
    )
    .filter((item): item is RecipeInventoryItem => Boolean(item))
    .sort(
      (left, right) =>
        (useUp ? Number(right.useSoon) - Number(left.useSoon) : 0) ||
        left.name.localeCompare(right.name) ||
        left.unit.localeCompare(right.unit),
    )
    .slice(0, 40);
  return { kind: 'recipe', inventory, useUp };
}
