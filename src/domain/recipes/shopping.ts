import type { ShoppingItem, Snapshot } from '../model';
import { packageLabel } from '../products/variants';
import { getRecipeAvailability, matchingFoods, type IngredientAvailability } from './availability';
import type { Recipe } from './model';
import { normalizeIngredientName } from './names';
import { convertRecipeAmount, packageAmount } from './units';

function matchingShopping(data: Snapshot, name: string): ShoppingItem[] {
  const normalized = normalizeIngredientName(name);
  const foods = new Set(matchingFoods(data, name).map((food) => food.id));
  return data.shopping.filter(
    (item) =>
      !item.purchased &&
      (item.foodId ? foods.has(item.foodId) : normalizeIngredientName(item.name) === normalized),
  );
}
function amountOnList(data: Snapshot, assessment: IngredientAvailability): number {
  return matchingShopping(data, assessment.ingredient.name).reduce((total, item) => {
    const food = data.foods.find((value) => value.id === item.foodId);
    const amount = food ? packageAmount(food, assessment.ingredient.unit) : undefined;
    return total + (amount === undefined ? 0 : item.quantity * amount);
  }, 0);
}
function unknownCandidate(
  existing: ShoppingItem[],
  assessment: IngredientAvailability,
  recipeNote: string,
  newId: () => string,
): ShoppingItem | undefined {
  if (existing.length) return undefined;
  return {
    id: newId(),
    name: assessment.ingredient.name,
    unit: 'items',
    quantity: 1,
    purchased: false,
    recipeNote,
  };
}
function shoppingCandidate(
  data: Snapshot,
  assessment: IngredientAvailability,
  newId: () => string,
): ShoppingItem | undefined {
  const { ingredient, status, required } = assessment;
  const existing = matchingShopping(data, ingredient.name);
  const missing = assessment.missing ?? required;
  if (missing <= 1e-9) return undefined;
  const food = matchingFoods(data, ingredient.name).find(
    (item) => packageAmount(item, ingredient.unit) !== undefined,
  );
  const amount = food && packageAmount(food, ingredient.unit);
  const noteAmount = Number(missing.toFixed(3));
  const recipeNote = `${status === 'needs-review' ? 'Check stock; recipe needs' : 'Recipe needs'} ${noteAmount} ${ingredient.unit}. ${amount ? 'Package count rounded up.' : 'Check package size and quantity.'}`;
  if (!amount || !food) return unknownCandidate(existing, assessment, recipeNote, newId);
  const remaining = missing - amountOnList(data, assessment);
  if (remaining <= 1e-9) return undefined;
  // A standalone amount-review row already represents this ingredient; never duplicate it.
  if (existing.some((item) => !item.foodId)) return undefined;
  const current = existing.find((item) => item.foodId === food.id);
  const quantity = (current?.quantity ?? 0) + Math.ceil(remaining / amount - 1e-9);
  if (quantity > 999) throw new Error('Shopping quantity is too large. Review the recipe amount.');
  return {
    id: current?.id ?? newId(),
    foodId: food.id,
    name: food.name,
    unit: food.unit,
    quantity,
    purchased: false,
    packageSize: packageLabel(food),
    recipeNote,
  };
}
function mergedRequirements(recipe: Recipe): Recipe {
  const ingredients: Recipe['ingredients'] = [];
  for (const ingredient of recipe.ingredients.filter((item) => !item.optional)) {
    const existing = ingredients.find(
      (item) =>
        normalizeIngredientName(item.name) === normalizeIngredientName(ingredient.name) &&
        (item.unit === ingredient.unit ||
          convertRecipeAmount(1, ingredient.unit, item.unit) !== undefined),
    );
    if (
      !existing &&
      ingredients.some(
        (item) => normalizeIngredientName(item.name) === normalizeIngredientName(ingredient.name),
      )
    )
      throw new Error(
        `${ingredient.name} uses incompatible recipe units. Review its mass, volume, or package amounts before shopping.`,
      );
    if (!existing) ingredients.push({ ...ingredient });
    else
      existing.quantity +=
        ingredient.unit === existing.unit
          ? ingredient.quantity
          : convertRecipeAmount(ingredient.quantity, ingredient.unit, existing.unit)!;
  }
  return { ...recipe, ingredients };
}
export function buildMissingShopping(
  data: Snapshot,
  recipe: Recipe,
  servings: number,
  newId: () => string,
): ShoppingItem[] {
  const missing = getRecipeAvailability(
    data,
    mergedRequirements(recipe),
    servings,
  ).ingredients.filter((item) => !item.ingredient.optional);
  const result: ShoppingItem[] = [];
  let next = data;
  for (const ingredient of missing) {
    const candidate = shoppingCandidate(next, ingredient, newId);
    if (!candidate) continue;
    const previous = result.findIndex((item) => item.id === candidate.id);
    if (previous >= 0) result[previous] = candidate;
    else result.push(candidate);
    next = {
      ...next,
      shopping: [...next.shopping.filter((item) => item.id !== candidate.id), candidate],
    };
  }
  return result;
}
export function addMissingShopping(
  data: Snapshot,
  recipe: Recipe,
  servings: number,
  items: ShoppingItem[],
): Snapshot {
  if (!items.length) return data;
  let nextId = 0;
  const newItems = items.filter((item) => !data.shopping.some((entry) => entry.id === item.id));
  const expected = buildMissingShopping(data, recipe, servings, () => newItems[nextId++]?.id ?? '');
  // Repeated submissions become no-ops once their ingredient needs are already on the list.
  if (!expected.length) return data;
  const reviewed = expected.every((item) =>
    items.some(
      (candidate) =>
        candidate.id === item.id &&
        candidate.name === item.name &&
        candidate.foodId === item.foodId &&
        candidate.quantity === item.quantity &&
        candidate.unit === item.unit &&
        candidate.packageSize === item.packageSize &&
        candidate.recipeNote === item.recipeNote &&
        !candidate.purchased,
    ),
  );
  if (!reviewed)
    throw new Error(
      'Recipe, inventory, or shopping changed. Review the missing ingredients again.',
    );
  const updated = new Map(expected.map((item) => [item.id, item]));
  for (const item of expected) {
    const collision = data.shopping.find((entry) => entry.id === item.id);
    if (collision?.purchased)
      throw new Error('Shopping entry changed. Review the missing ingredients again.');
  }
  return {
    ...data,
    shopping: [...data.shopping.filter((item) => !updated.has(item.id)), ...expected],
  };
}
