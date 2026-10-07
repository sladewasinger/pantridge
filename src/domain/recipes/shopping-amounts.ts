import type { ShoppingItem, Snapshot } from '../model';
import { matchingFoods, type IngredientAvailability } from './availability';
import { normalizeIngredientName } from './names';
import { packageAmount } from './units';
import { foodAmountCompatible } from '../ingredient-matching/resolver';
import { acceptsIdentity, identifyIngredient } from '../ingredient-matching/identity';
import { recipeIdentity, foodIdentity } from '../ingredient-matching/classification';
import { allocateIngredients } from '../ingredient-matching/allocation';

export function shoppingAllocation(data: Snapshot, assessments: IngredientAvailability[]) {
  const stock = data.shopping
    .filter((item) => !item.purchased && item.foodId)
    .map((item) => ({ id: item.id, foodId: item.foodId!, quantity: item.quantity }));
  const virtual = { ...data, stock };
  const ingredients = assessments.map((row) => ({
    ...row.ingredient,
    optional: false,
    quantity:
      row.status === 'needs-review' && row.lotIds.length ? 0 : (row.missing ?? row.required),
  }));
  const recipe = {
    id: ingredients[0]?.id ?? '',
    title: 'Shopping requirements',
    source: 'manual' as const,
    servings: 1,
    ingredients,
    steps: ['Review the packages to buy.'],
  };
  const allocation = allocateIngredients(virtual, recipe);
  const reserved = new Map<string, number>();
  const amounts = new Map<IngredientAvailability, number>();
  const uncertain = new Set<IngredientAvailability>();
  ingredients.forEach((ingredient, index) => {
    let amount = 0;
    for (const [id, packages] of allocation.used.get(ingredient)!) {
      const lot = stock.find((row) => row.id === id)!;
      const food = data.foods.find((row) => row.id === lot.foodId)!;
      amount += packages * packageAmount(food, ingredient.unit)!;
      reserved.set(id, (reserved.get(id) ?? 0) + packages);
    }
    amounts.set(assessments[index]!, amount);
    if (allocation.crossed.has(ingredient) && amount + 1e-9 < ingredient.quantity)
      uncertain.add(assessments[index]!);
  });
  return { reserved, amounts, uncertain };
}

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
  alreadyAllocated: number,
): void {
  let needed = Math.max(0, (assessment.missing ?? assessment.required) - alreadyAllocated);
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
