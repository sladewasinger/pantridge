import type { ShoppingItem, Snapshot } from '../model';
import { matchingFoods, type IngredientAvailability } from './availability';
import { normalizeIngredientName } from './names';
import { packageAmount } from './units';
import { foodAmountCompatible } from '../ingredient-matching/resolver';
import { acceptsIdentity, identifyIngredient } from '../ingredient-matching/identity';
import { recipeIdentity, foodIdentity } from '../ingredient-matching/classification';

export function matchingShopping(
  data: Snapshot,
  assessment: IngredientAvailability,
): ShoppingItem[] {
  const normalized = normalizeIngredientName(assessment.ingredient.name);
  const foods = new Set(assessment.foodIds);
  for (const food of matchingFoods(data, assessment.ingredient))
    if (!data.stock.some((lot) => lot.foodId === food.id && lot.quantity > 0)) foods.add(food.id);
  return data.shopping.filter(
    (item) =>
      !item.purchased && shoppingIdentityMatches(data, item, assessment, { foods, normalized }),
  );
}
function shoppingIdentityMatches(
  data: Snapshot,
  item: ShoppingItem,
  assessment: IngredientAvailability,
  { foods, normalized }: { foods: Set<string>; normalized: string },
): boolean {
  const required = recipeIdentity(assessment.ingredient);
  const food = data.foods.find((food) => food.id === item.foodId);
  const present = food ? foodIdentity(food) : (item.ingredient ?? identifyIngredient(item.name));
  if (required && present)
    return (
      acceptsIdentity(required.id, present.id) &&
      required.basis === present.basis &&
      (required.preparation === 'any' || required.preparation === present.preparation)
    );
  return item.foodId ? foods.has(item.foodId) : normalizeIngredientName(item.name) === normalized;
}
export function amountOnList(
  data: Snapshot,
  assessment: IngredientAvailability,
  reserved: Map<string, number>,
): number {
  return matchingShopping(data, assessment).reduce((total, item) => {
    const food = data.foods.find((value) => value.id === item.foodId);
    const amount =
      food && foodAmountCompatible(food, assessment.ingredient)
        ? packageAmount(food, assessment.ingredient.unit)
        : undefined;
    return (
      total +
      (amount === undefined
        ? 0
        : Math.max(0, item.quantity - (reserved.get(item.id) ?? 0)) * amount)
    );
  }, 0);
}
export function reserveShopping(
  data: Snapshot,
  assessment: IngredientAvailability,
  reserved: Map<string, number>,
): void {
  let needed = assessment.missing ?? assessment.required;
  for (const item of matchingShopping(data, assessment)) {
    const food = data.foods.find((value) => value.id === item.foodId);
    const amount =
      food && foodAmountCompatible(food, assessment.ingredient)
        ? packageAmount(food, assessment.ingredient.unit)
        : undefined;
    if (!amount) continue;
    const used = reserved.get(item.id) ?? 0;
    const packages = Math.min(Math.max(0, item.quantity - used), needed / amount);
    reserved.set(item.id, used + packages);
    needed = Math.max(0, needed - packages * amount);
  }
}
