import type { Snapshot, Food, Stock } from '../model';
import { isSupply } from '../supplies';
import type { Recipe, RecipeIngredient } from './model';
import { normalizeIngredientName } from './names';
import { packageAmount } from './units';
import { lotMatch, resolvedLots } from '../ingredient-matching/resolver';
import { foodIdentity, recipeIdentity } from '../ingredient-matching/classification';
import { acceptsIdentity } from '../ingredient-matching/identity';

type AvailabilityStatus = 'confirmed' | 'needs-review' | 'missing';
export interface IngredientAvailability {
  ingredient: RecipeIngredient;
  required: number;
  available?: number;
  missing?: number;
  status: AvailabilityStatus;
  foodIds: string[];
  lotIds: string[];
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
export function matchingFoods(data: Snapshot, name: string | RecipeIngredient): Food[] {
  const ingredient = typeof name === 'string' ? { name } : name;
  const normalized = normalizeIngredientName(ingredient.name);
  const required = typeof name === 'string' ? undefined : recipeIdentity(name);
  return data.foods.filter((food) => {
    if (isSupply(food)) return false;
    const present = foodIdentity(food);
    if (!required || !present) return normalizeIngredientName(food.name) === normalized;
    return (
      acceptsIdentity(required.id, present.id) &&
      required.basis === present.basis &&
      (required.preparation === 'any' || required.preparation === present.preparation)
    );
  });
}
export function matchingLots(
  data: Snapshot,
  ingredient: RecipeIngredient,
  recipe?: Recipe,
): Stock[] {
  return resolvedLots(data, ingredient, recipe);
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
  recipe: Recipe,
): Amounts {
  const lots = matchingLots(data, ingredient, recipe);
  const amount = lots.reduce(
    (result, lot) => {
      const food = data.foods.find((item) => item.id === lot.foodId)!;
      const perPackage = packageAmount(food, ingredient.unit, lot);
      const quantity = remaining.get(lot.id) ?? lot.quantity;
      if (quantity <= 0) return result;
      if (
        perPackage === undefined ||
        lotMatch(data, ingredient, { food, lot, recipe }) !== 'compatible'
      )
        return { ...result, unknown: true };
      return { ...result, available: result.available + perPackage * quantity };
    },
    { available: 0, unknown: false },
  );
  return { ...amount, earliestExpiry: lots.find((lot) => lot.expires)?.expires };
}
function reserveAmount(
  data: Snapshot,
  ingredient: RecipeIngredient,
  { needed, remaining, recipe }: { needed: number; remaining: Map<string, number>; recipe: Recipe },
) {
  let left = needed;
  for (const lot of matchingLots(data, ingredient, recipe)) {
    const food = data.foods.find((item) => item.id === lot.foodId)!;
    if (lotMatch(data, ingredient, { food, lot, recipe }) !== 'compatible') continue;
    const amount = packageAmount(food, ingredient.unit, lot);
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
  { scale, remaining, recipe }: { scale: number; remaining: Map<string, number>; recipe: Recipe },
): IngredientAvailability {
  const required = ingredient.quantity * scale;
  const amount = getAmounts(data, ingredient, remaining, recipe);
  const sufficient = amount.available + 1e-9 >= required;
  const status = sufficient ? 'confirmed' : amount.unknown ? 'needs-review' : 'missing';
  reserveAmount(data, ingredient, { needed: required, remaining, recipe });
  const lots = matchingLots(data, ingredient, recipe);
  return {
    ingredient,
    required,
    status,
    available: amount.unknown && !sufficient ? undefined : amount.available,
    missing: amount.unknown && !sufficient ? undefined : Math.max(0, required - amount.available),
    foodIds: [...new Set(lots.map((lot) => lot.foodId))],
    lotIds: lots.map((lot) => lot.id),
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
    ingredientAvailability(data, ingredient, {
      scale: servings / recipe.servings,
      remaining,
      recipe,
    }),
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
    recipe.ingredients.flatMap((ingredient) =>
      matchingLots(data, ingredient, recipe).map((lot) => lot.id),
    ),
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
