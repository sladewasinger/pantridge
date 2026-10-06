import type { Snapshot, Food, Stock } from '../model';
import { isSupply } from '../supplies';
import type { Recipe, RecipeIngredient } from './model';
import { normalizeIngredientName } from './names';
import { packageAmount } from './units';

type AvailabilityStatus = 'confirmed' | 'needs-review' | 'missing';
export interface IngredientAvailability {
  ingredient: RecipeIngredient;
  required: number;
  available?: number;
  missing?: number;
  status: AvailabilityStatus;
  foodIds: string[];
  earliestExpiry?: string;
}
export interface RecipeAvailability {
  recipe: Recipe;
  servings: number;
  status: AvailabilityStatus;
  ingredients: IngredientAvailability[];
  expiringSoon: number;
  pastDate: number;
}
export function matchingFoods(data: Snapshot, name: string): Food[] {
  const normalized = normalizeIngredientName(name);
  return data.foods.filter(
    (food) => !isSupply(food) && normalizeIngredientName(food.name) === normalized,
  );
}
export function matchingLots(data: Snapshot, ingredient: RecipeIngredient): Stock[] {
  const ids = new Set(matchingFoods(data, ingredient.name).map((food) => food.id));
  return data.stock
    .filter((stock) => stock.quantity > 0 && ids.has(stock.foodId))
    .sort(
      (left, right) =>
        (left.expires ?? '9999').localeCompare(right.expires ?? '9999') ||
        left.id.localeCompare(right.id),
    );
}
interface Amounts {
  available: number;
  unknown: boolean;
  earliestExpiry?: string;
}
function getAmounts(
  data: Snapshot,
  ingredient: RecipeIngredient,
  remaining: Map<string, number>,
): Amounts {
  const foods = matchingFoods(data, ingredient.name);
  const lots = matchingLots(data, ingredient);
  const amount = lots.reduce(
    (result, lot) => {
      const food = foods.find((item) => item.id === lot.foodId)!;
      const perPackage = packageAmount(food, ingredient.unit);
      const quantity = remaining.get(lot.id) ?? lot.quantity;
      if (quantity <= 0) return result;
      if (perPackage === undefined) return { ...result, unknown: true };
      return { ...result, available: result.available + perPackage * quantity };
    },
    { available: 0, unknown: false },
  );
  return { ...amount, earliestExpiry: lots.find((lot) => lot.expires)?.expires };
}
function reserveAmount(
  data: Snapshot,
  ingredient: RecipeIngredient,
  needed: number,
  remaining: Map<string, number>,
) {
  let left = needed;
  for (const lot of matchingLots(data, ingredient)) {
    const food = data.foods.find((item) => item.id === lot.foodId)!;
    const amount = packageAmount(food, ingredient.unit);
    if (amount === undefined) continue;
    const packages = remaining.get(lot.id) ?? lot.quantity;
    const used = Math.min(packages, left / amount);
    remaining.set(lot.id, Math.max(0, packages - used));
    left = Math.max(0, left - used * amount);
  }
}
function ingredientAvailability(
  data: Snapshot,
  ingredient: RecipeIngredient,
  scale: number,
  remaining: Map<string, number>,
): IngredientAvailability {
  const required = ingredient.quantity * scale;
  const amount = getAmounts(data, ingredient, remaining);
  const sufficient = amount.available + 1e-9 >= required;
  const status = sufficient ? 'confirmed' : amount.unknown ? 'needs-review' : 'missing';
  reserveAmount(data, ingredient, required, remaining);
  return {
    ingredient,
    required,
    status,
    available: amount.unknown && !sufficient ? undefined : amount.available,
    missing: amount.unknown && !sufficient ? undefined : Math.max(0, required - amount.available),
    foodIds: matchingFoods(data, ingredient.name).map((food) => food.id),
    earliestExpiry: amount.earliestExpiry,
  };
}
export function getRecipeAvailability(
  data: Snapshot,
  recipe: Recipe,
  servings = recipe.servings,
  today = new Date().toISOString().slice(0, 10),
): RecipeAvailability {
  const remaining = new Map<string, number>();
  // Required rows claim stock first; optional ingredients never mask a required shortfall.
  const ordered = [...recipe.ingredients].sort(
    (a, b) => Number(Boolean(a.optional)) - Number(Boolean(b.optional)),
  );
  const assessed = ordered.map((ingredient) =>
    ingredientAvailability(data, ingredient, servings / recipe.servings, remaining),
  );
  const ingredients = recipe.ingredients.map((ingredient) =>
    assessed.find((item) => item.ingredient.id === ingredient.id)!,
  );
  const required = ingredients.filter((item) => !item.ingredient.optional);
  const status = required.some((item) => item.status === 'missing')
    ? 'missing'
    : required.some((item) => item.status === 'needs-review')
      ? 'needs-review'
      : 'confirmed';
  const until = Date.parse(today) + 7 * 86400000;
  const relevantLots = new Set(
    recipe.ingredients.flatMap((ingredient) => matchingLots(data, ingredient).map((lot) => lot.id)),
  );
  const expiringSoon = data.stock.filter(
    (lot) =>
      relevantLots.has(lot.id) &&
      lot.expires &&
      Date.parse(lot.expires) >= Date.parse(today) &&
      Date.parse(lot.expires) <= until,
  ).length;
  const pastDate = data.stock.filter(
    (lot) => relevantLots.has(lot.id) && lot.expires && Date.parse(lot.expires) < Date.parse(today),
  ).length;
  return { recipe, servings, status, ingredients, expiringSoon, pastDate };
}
