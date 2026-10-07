import type { ShoppingItem, Snapshot } from '../model';
import { packageLabel } from '../products/variants';
import { getRecipeAvailability, matchingFoods, type IngredientAvailability } from './availability';
import type { Recipe } from './model';
import { matchingShopping, amountOnList, reserveShopping } from './shopping-amounts';
import { convertRecipeAmount, packageAmount } from './units';
import { foodAmountCompatible } from '../ingredient-matching/resolver';
import { requirementKey } from '../ingredient-matching/context';
import { classifyRecipeIngredient, recipeIdentity } from '../ingredient-matching/classification';

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
    ingredient: recipeIdentity(assessment.ingredient),
  };
}
function shoppingCandidate(
  data: Snapshot,
  assessment: IngredientAvailability,
  newId: () => string,
  reserved: Map<string, number>,
): ShoppingItem | undefined {
  const { ingredient, status, required } = assessment;
  if (status === 'needs-review' && assessment.lotIds.length) return undefined;
  const existing = matchingShopping(data, assessment);
  const missing = assessment.missing ?? required;
  if (missing <= 1e-9) return undefined;
  const { food, amount } = shoppingPackage(data, assessment);
  const noteAmount = Number(missing.toFixed(3));
  const recipeNote = `Recipe needs ${noteAmount} ${ingredient.unit}. ${amount ? 'Package count rounded up.' : 'Check package size and quantity.'}`;
  if (!amount || !food) return unknownCandidate(existing, assessment, recipeNote, newId);
  const remaining = missing - amountOnList(data, assessment, reserved);
  if (remaining <= 1e-9) return undefined;
  // A standalone amount-review row already represents this ingredient; never duplicate it.
  if (existing.some((item) => !item.foodId)) return undefined;
  const current = existing.find((item) => item.foodId === food.id);
  const quantity = existingQuantity(current) + Math.ceil(remaining / amount - 1e-9);
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
const existingQuantity = (item: ShoppingItem | undefined) => item?.quantity ?? 0;
function shoppingPackage(data: Snapshot, assessment: IngredientAvailability) {
  const food =
    recipeIdentity(assessment.ingredient)?.basis === 'as-sold'
      ? shoppingFood(data, assessment)
      : undefined;
  const amount =
    food && foodAmountCompatible(food, assessment.ingredient)
      ? packageAmount(food, assessment.ingredient.unit)
      : undefined;
  return { food, amount };
}
function shoppingFood(data: Snapshot, assessment: IngredientAvailability) {
  const eligible = new Set(assessment.foodIds);
  const unstocked = matchingFoods(data, assessment.ingredient).filter(
    (food) => !data.stock.some((lot) => lot.foodId === food.id && lot.quantity > 0),
  );
  const compatible = new Set(matchingFoods(data, assessment.ingredient).map((food) => food.id));
  return data.foods
    .filter((food) => eligible.has(food.id))
    .concat(unstocked)
    .find(
      (food) =>
        compatible.has(food.id) && packageAmount(food, assessment.ingredient.unit) !== undefined,
    );
}
function mergedRequirements(recipe: Recipe): Recipe {
  const ingredients: IngredientAvailability['ingredient'][] = [];
  for (const ingredient of recipe.ingredients.filter((item) => !item.optional)) {
    const existing = ingredients.find(
      (item) =>
        requirementKey(recipe, item) === requirementKey(recipe, ingredient) &&
        (item.unit === ingredient.unit ||
          convertRecipeAmount(1, ingredient.unit, item.unit) !== undefined),
    );
    if (
      !existing &&
      ingredients.some(
        (item) => requirementKey(recipe, item) === requirementKey(recipe, ingredient),
      )
    )
      throw new Error(
        `${ingredient.name} uses incompatible recipe units. Review its mass, volume, or package amounts before shopping.`,
      );
    if (!existing) ingredients.push(classifyRecipeIngredient(ingredient));
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
  const reserved = new Map<string, number>();
  let next = data;
  for (const ingredient of missing) {
    const candidate = shoppingCandidate(next, ingredient, newId, reserved);
    if (!candidate) {
      reserveShopping(next, ingredient, reserved);
      continue;
    }
    const previous = result.findIndex((item) => item.id === candidate.id);
    if (previous >= 0) result[previous] = candidate;
    else result.push(candidate);
    next = {
      ...next,
      shopping: [...next.shopping.filter((item) => item.id !== candidate.id), candidate],
    };
    reserveShopping(next, ingredient, reserved);
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
        JSON.stringify(candidate.ingredient) === JSON.stringify(item.ingredient) &&
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
