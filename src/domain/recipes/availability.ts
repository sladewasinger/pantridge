import type { Snapshot, Food, Stock } from '../model';
import { isSupply } from '../supplies';
import type { Recipe, RecipeIngredient } from './model';
import { normalizeIngredientName } from './names';
import { packageAmount } from './units';
import { lotMatch, resolvedLots } from '../ingredient-matching/resolver';
import { foodIdentity, recipeIdentity } from '../ingredient-matching/classification';
import { acceptsIdentity } from '../ingredient-matching/identity';
import { allocateIngredients, availableForIngredient } from '../ingredient-matching/allocation';

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
function ingredientAvailability(
  data: Snapshot,
  ingredient: RecipeIngredient,
  {
    scale,
    remaining,
    recipe,
    crossed,
  }: { scale: number; remaining: Map<string, number>; recipe: Recipe; crossed: boolean },
): IngredientAvailability {
  const required = ingredient.quantity * scale;
  const amount = getAmounts(data, ingredient, remaining, recipe);
  const sufficient = amount.available + 1e-9 >= required;
  const uncertain = amount.unknown || crossed;
  const status = sufficient ? 'confirmed' : uncertain ? 'needs-review' : 'missing';
  const lots = matchingLots(data, ingredient, recipe);
  return {
    ingredient,
    required,
    status,
    available: uncertain && !sufficient ? undefined : amount.available,
    missing: uncertain && !sufficient ? undefined : Math.max(0, required - amount.available),
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
  const allocation = allocateIngredients(data, recipe, servings);
  const ingredients = recipe.ingredients.map((ingredient) =>
    ingredientAvailability(data, ingredient, {
      scale: servings / recipe.servings,
      remaining: availableForIngredient(allocation, ingredient),
      recipe,
      crossed: allocation.crossed.has(ingredient),
    }),
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
