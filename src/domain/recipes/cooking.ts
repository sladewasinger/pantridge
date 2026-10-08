import type { Food, Snapshot, Stock } from '../model';
import { matchHash } from '../ingredient-matching/context';
import { allocateIngredients } from '../ingredient-matching/allocation';
import { isSupply } from '../supplies';
import { roundQuantity } from '../quantity';
import {
  cookingRecordSchema,
  type CookingDeduction,
  type CookingRecord,
  type Recipe,
  type RecipeIngredient,
  type MealPlanEntry,
} from './model';
import { findRecipe, getCookingHistory, getMealPlan } from './selectors';
import { packageAmount } from './units';

export function foodCookingSignature(food: Food): string {
  return JSON.stringify({
    name: food.name,
    unit: food.unit,
    packageSize: food.packageSize,
    size: food.size ?? null,
    kind: food.kind ?? null,
    art: food.art,
    ...(food.ingredient && { ingredient: food.ingredient }),
  });
}
export const lotCookingSignature = (food: Food, lot: Stock) =>
  matchHash([
    food.ingredient ?? null,
    lot.ingredient ?? null,
    lot.ingredientSize ?? null,
    lot.ingredientSizeBasis ?? null,
    lot.product ?? null,
    ...(food.standardization || lot.standardization
      ? [food.standardization ?? null, lot.standardization ?? null]
      : []),
  ]);

export interface CookingPreview {
  deductions: CookingDeduction[];
  needsReview: boolean;
  notes: string[];
}
function previewIngredient(
  data: Snapshot,
  ingredient: RecipeIngredient,
  required: number,
  { used, allocations }: { used: Map<string, number>; allocations: Map<string, number> },
): boolean {
  const parts = [...allocations].map(([id, quantity]) => ({
    id,
    quantity,
    precise: roundQuantity(quantity),
  }));
  // Six decimals is a storage bound, not permission to round consumption.
  if (parts.some(({ quantity, precise }) => Math.abs(precise - quantity) > 1e-10 || precise <= 0))
    return false;
  let consumed = 0;
  for (const { id, precise } of parts) {
    const lot = data.stock.find((row) => row.id === id)!;
    const food = data.foods.find((item) => item.id === lot.foodId)!;
    const amount = packageAmount(food, ingredient.unit, lot)!;
    const already = used.get(lot.id) ?? 0;
    used.set(lot.id, roundQuantity(already + precise));
    consumed += precise * amount;
  }
  return consumed + 1e-8 >= required;
}
export function previewCooking(
  data: Snapshot,
  recipe: Recipe,
  servings = recipe.servings,
): CookingPreview {
  const used = new Map<string, number>();
  const notes: string[] = [];
  const allocation = allocateIngredients(data, recipe, servings);
  for (const ingredient of recipe.ingredients.filter((item) => !item.optional)) {
    const complete = previewIngredient(
      data,
      ingredient,
      (ingredient.quantity * servings) / recipe.servings,
      { used, allocations: allocation.used.get(ingredient)! },
    );
    if (!complete)
      notes.push(
        `Review ${ingredient.name}: the amount is missing, the package size is unknown, or the exact fraction cannot be stored.`,
      );
  }
  const deductions = [...used].map(([stockId, quantity]) => {
    const lot = data.stock.find((stock) => stock.id === stockId)!;
    return {
      stockId,
      foodId: lot.foodId,
      quantity,
      expectedQuantity: lot.quantity,
      expectedLotSignature: lotCookingSignature(
        data.foods.find((food) => food.id === lot.foodId)!,
        lot,
      ),
      expectedFoodSignature: foodCookingSignature(
        data.foods.find((food) => food.id === lot.foodId)!,
      ),
      remainingQuantity: roundQuantity(lot.quantity - quantity),
    };
  });
  if (recipe.ingredients.some((item) => item.optional))
    notes.push('Optional ingredients are not included in these deductions.');
  return { deductions, needsReview: notes.length > 0, notes };
}
function validateDeduction(data: Snapshot, deduction: CookingDeduction): void {
  const lot = data.stock.find((stock) => stock.id === deduction.stockId);
  if (!lot || lot.foodId !== deduction.foodId)
    throw new Error('A selected package no longer exists. Review cooking again.');
  const food = data.foods.find((item) => item.id === deduction.foodId);
  if (!food || isSupply(food))
    throw new Error('Kitchen supplies cannot be used as recipe ingredients.');
  if (deduction.expectedFoodSignature !== foodCookingSignature(food))
    throw new Error('Food or package details changed. Review cooking again.');
  if (
    (deduction.expectedLotSignature &&
      deduction.expectedLotSignature !== lotCookingSignature(food, lot)) ||
    (!deduction.expectedLotSignature && requiresLotSignature(food, lot))
  )
    throw new Error('Product preparation changed. Review cooking again.');
  if (lot.quantity !== deduction.expectedQuantity)
    throw new Error('Package quantity changed. Review cooking again.');
  if (
    deduction.quantity > lot.quantity ||
    roundQuantity(lot.quantity - deduction.quantity) !== deduction.remainingQuantity
  )
    throw new Error('Cooking amounts do not match the reviewed package remainder.');
}
function requiresLotSignature(food: Food, lot: Stock): boolean {
  return Boolean(
    lot.ingredient ||
    lot.ingredientSize ||
    lot.product ||
    lot.standardization ||
    food.standardization,
  );
}
function validatePlan(data: Snapshot, record: CookingRecord, expectedPlan?: MealPlanEntry): void {
  if (!expectedPlan) return;
  const current = getMealPlan(data).find((entry) => entry.id === expectedPlan.id);
  if (
    !current ||
    current.recipeId !== expectedPlan.recipeId ||
    current.date !== expectedPlan.date ||
    current.servings !== expectedPlan.servings ||
    record.recipeId !== expectedPlan.recipeId ||
    record.servings !== expectedPlan.servings
  )
    throw new Error('The planned meal changed. Review cooking again.');
}
export function recordCooking(
  data: Snapshot,
  input: CookingRecord,
  expectedPlan?: MealPlanEntry,
): Snapshot {
  const record = cookingRecordSchema.parse(input);
  const history = getCookingHistory(data);
  const existing = history.find((item) => item.id === record.id);
  if (existing) {
    if (JSON.stringify(cookingRecordSchema.parse(existing)) !== JSON.stringify(record))
      throw new Error('Cooking ID already exists with different details.');
    return data;
  }
  if (history.length >= 300)
    throw new Error(
      'Cooking history is full (300 records). Export a backup to preserve your history. No stock was changed.',
    );
  if (!findRecipe(data, record.recipeId))
    throw new Error('Recipe no longer exists. Review cooking again.');
  if (new Set(record.deductions.map((item) => item.stockId)).size !== record.deductions.length)
    throw new Error('A package may only be deducted once per cooking record.');
  validatePlan(data, record, expectedPlan);
  record.deductions.forEach((deduction) => validateDeduction(data, deduction));
  return {
    ...data,
    stock: data.stock.map((lot) => {
      const deduction = record.deductions.find((item) => item.stockId === lot.id);
      return deduction ? { ...lot, quantity: deduction.remainingQuantity } : lot;
    }),
    cookingHistory: [...history, record],
    ...(expectedPlan
      ? { mealPlan: getMealPlan(data).filter((entry) => entry.id !== expectedPlan.id) }
      : {}),
  };
}
