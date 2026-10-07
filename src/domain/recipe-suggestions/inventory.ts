import type { Snapshot } from '../model';
import { isSupply } from '../supplies';
import { isRecipeFoodName } from './foods';
import { suggestionGroup, type CookingDetail } from './groups';
import type { RecipeInventoryItem, RecipeSuggestionRequest } from './model';

export function suggestionFoods(data: Snapshot, today: string) {
  const until = Date.parse(today) + 7 * 86400000;
  return data.foods.flatMap((food) => {
    if (isSupply(food) || !isRecipeFoodName(food.name)) return [];
    const usable = data.stock.filter(
      (lot) => lot.foodId === food.id && lot.quantity > 0 && (!lot.expires || lot.expires >= today),
    );
    if (!usable.length) return [];
    return [
      {
        food,
        ...suggestionGroup(food),
        useSoon: usable.some((lot) => lot.expires && Date.parse(lot.expires) <= until),
      },
    ];
  });
}
// No IDs, brands, amounts, dates, nutrition, or shopping data leave the device.
// All eligible food records are grouped; there is no alphabetical truncation.
export function buildRecipeSuggestionRequest(
  data: Snapshot,
  useUp: boolean,
  today = new Date().toISOString().slice(0, 10),
): RecipeSuggestionRequest {
  const groups = new Map<string, { useSoon: boolean; details: Set<CookingDetail> }>();
  for (const item of suggestionFoods(data, today)) {
    const group = groups.get(item.name) ?? { useSoon: false, details: new Set<CookingDetail>() };
    group.useSoon ||= item.useSoon;
    item.details.forEach((detail) => group.details.add(detail));
    groups.set(item.name, group);
  }
  const inventory: RecipeInventoryItem[] = [...groups]
    .map(([name, group]) => ({
      name,
      ...(group.useSoon ? { useSoon: true } : {}),
      ...(group.details.size ? { details: [...group.details].sort() } : {}),
    }))
    .sort(
      (left, right) =>
        (useUp ? Number(Boolean(right.useSoon)) - Number(Boolean(left.useSoon)) : 0) ||
        left.name.localeCompare(right.name),
    );
  return { kind: 'recipe', inventory, useUp };
}
