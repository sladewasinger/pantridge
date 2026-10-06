import type { Food, Snapshot, Stock } from '../../domain/model';
import { roundQuantity } from '../../domain/quantity';
import type { Recipe, CookingDeduction, MealPlanEntry } from '../../domain/recipes/model';
import { getMealPlan } from '../../domain/recipes/selectors';
import { getRecipeAvailability } from '../../domain/recipes/availability';
import { foodCookingSignature, previewCooking } from '../../domain/recipes/cooking';

export interface CookRow {
  food: Food;
  stock: Stock;
  quantity: string;
}
export function initialCookRows(data: Snapshot, recipe: Recipe, servings: number): CookRow[] {
  const foods = new Set(
    getRecipeAvailability(data, recipe, servings).ingredients.flatMap((item) => item.foodIds),
  );
  const preview = previewCooking(data, recipe, servings);
  return data.stock
    .filter((stock) => stock.quantity > 0 && foods.has(stock.foodId))
    .map((stock) => ({
      stock,
      food: data.foods.find((food) => food.id === stock.foodId)!,
      quantity: String(preview.deductions.find((item) => item.stockId === stock.id)?.quantity ?? 0),
    }))
    .sort((a, b) => (a.stock.expires ?? '9999').localeCompare(b.stock.expires ?? '9999'));
}
export function reviewedDeductions(rows: CookRow[]): CookingDeduction[] {
  return rows.flatMap((row) => {
    if (!row.quantity.trim())
      throw new Error(`Enter the amount used for ${row.food.name}, or 0 to leave it unchanged.`);
    const quantity = Number(row.quantity);
    if (!Number.isFinite(quantity) || quantity < 0 || quantity > row.stock.quantity)
      throw new Error(
        `Use between 0 and ${row.stock.quantity} ${row.food.unit} of ${row.food.name}.`,
      );
    if (roundQuantity(quantity) !== quantity)
      throw new Error(`Use no more than 6 decimal places for ${row.food.name}.`);
    if (!quantity) return [];
    return [
      {
        stockId: row.stock.id,
        foodId: row.food.id,
        quantity,
        expectedQuantity: row.stock.quantity,
        expectedFoodSignature: foodCookingSignature(row.food),
        remainingQuantity: roundQuantity(row.stock.quantity - quantity),
      },
    ];
  });
}
export function reviewIsStale(data: Snapshot, rows: CookRow[]): boolean {
  return rows.some(
    (row) =>
      data.stock.find((stock) => stock.id === row.stock.id)?.quantity !== row.stock.quantity ||
      JSON.stringify(data.foods.find((food) => food.id === row.food.id)) !==
        JSON.stringify(row.food),
  );
}

export function initialServings(recipe: Recipe, plan?: MealPlanEntry): string {
  return String(plan?.servings ?? recipe.servings);
}
export function planReviewIsStale(data: Snapshot, plan?: MealPlanEntry): boolean {
  if (!plan) return false;
  const current = getMealPlan(data).find((entry) => entry.id === plan.id);
  return (
    !current ||
    current.recipeId !== plan.recipeId ||
    current.date !== plan.date ||
    current.servings !== plan.servings
  );
}
