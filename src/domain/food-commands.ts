import type { Food, ShoppingItem, Snapshot } from './model';
import { packageLabel } from './products/variants';
import { stockIdentity } from './ingredient-matching/classification';
import { evidenceFingerprint, foodEvidence } from './standardization/evidence';

export function restoreFood(data: Snapshot, food: Food): Snapshot {
  if (data.foods.some((item) => item.id === food.id)) throw new Error('Food already exists.');
  return { ...data, foods: [...data.foods, food] };
}

export function saveFood(data: Snapshot, food: Food): Snapshot {
  const previous = data.foods.find((item) => item.id === food.id);
  if (
    previous &&
    evidenceFingerprint(foodEvidence(previous)) === evidenceFingerprint(foodEvidence(food))
  )
    food = { ...food, standardization: previous.standardization ?? food.standardization };
  return {
    ...data,
    foods: [...data.foods.filter((item) => item.id !== food.id), food],
    stock: data.stock.map((lot) => {
      if (!previous || lot.foodId !== food.id || !lot.ingredientSize) return lot;
      const changed =
        JSON.stringify(stockIdentity(previous, lot)) !== JSON.stringify(stockIdentity(food, lot));
      return changed ? { ...lot, ingredientSize: undefined, ingredientSizeBasis: undefined } : lot;
    }),
    shopping: data.shopping.map((item) =>
      item.foodId === food.id
        ? { ...item, name: food.name, unit: food.unit, packageSize: packageLabel(food) }
        : item,
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
  return food
    ? { ...item, name: food.name, unit: food.unit, packageSize: packageLabel(food) }
    : item;
}
