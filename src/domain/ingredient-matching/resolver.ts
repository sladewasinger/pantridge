import type { Snapshot, Food, Stock } from '../model';
import type { Recipe, RecipeIngredient } from '../recipes/model';
import { normalizeIngredientName } from '../recipes/names';
import { isSupply } from '../supplies';
import { acceptsIdentity } from './identity';
import { recipeIdentity, stockIdentity, foodIdentity } from './classification';
import type { IngredientIdentity } from './model';

interface Index {
  foods: Map<string, Food>;
  identities: Map<string, IngredientIdentity | undefined>;
  resolved: Map<string, Stock[]>;
}
const indices = new WeakMap<Snapshot, Index>();
const countable = new Set([
  'eggs',
  'apples',
  'avocado',
  'bananas',
  'potatoes',
  'russet-potatoes',
  'yukon-gold-potatoes',
  'red-potatoes',
  'fingerling-potatoes',
  'sweet-potatoes',
  'tomatoes',
  'roma-tomatoes',
  'grape-tomatoes',
  'onions',
  'red-onions',
  'yellow-onions',
  'white-onions',
  'bell-peppers',
  'red-bell-pepper',
  'green-bell-pepper',
  'yellow-bell-pepper',
  'carrots',
  'cucumber',
  'english-cucumber',
  'lemon',
  'lime',
  'garlic',
  'garlic-bulb',
  'cauliflower-head',
  'whole-chicken',
  'bay-leaves',
  'beef-bouillon-cube',
  'flour-tortillas',
  'corn-tortillas',
  'hamburger-buns',
  'pie-crust',
  'bacon-slices',
  'pancetta-slices',
]);
function indexFor(data: Snapshot): Index {
  let index = indices.get(data);
  if (!index) {
    const foods = new Map(data.foods.map((food) => [food.id, food]));
    const identities = new Map(
      data.stock.map((lot) => {
        const food = foods.get(lot.foodId);
        return [lot.id, food && stockIdentity(food, lot)] as const;
      }),
    );
    index = { foods, identities, resolved: new Map() };
    indices.set(data, index);
  }
  return index;
}

export function lotMatch(
  data: Snapshot,
  ingredient: RecipeIngredient,
  { food, lot }: { food: Food; lot: Stock; recipe?: Recipe },
): 'compatible' | 'review' | 'none' {
  if (isSupply(food) || lot.quantity <= 0) return 'none';
  const required = recipeIdentity(ingredient);
  const present = indexFor(data).identities.get(lot.id);
  if (!required || !present) {
    const exact = normalizeIngredientName(food.name) === normalizeIngredientName(ingredient.name);
    return exact && !required && !present ? 'review' : 'none';
  }
  if (!acceptsIdentity(required.id, present.id)) return 'none';
  if (ambiguousGarlicCount(food, lot, ingredient)) return 'review';
  return amountCompatible(required, present, ingredient, lot) ? 'compatible' : 'review';
}
function ambiguousGarlicCount(food: Food, lot: Stock, ingredient: RecipeIngredient): boolean {
  return (
    ingredient.unit === 'count' &&
    stockIdentity(food, lot)?.id === 'garlic' &&
    !lot.ingredientSize &&
    !lot.ingredient &&
    !food.ingredient &&
    !/^garlic cloves?$/i.test(food.name.trim())
  );
}
function amountCompatible(
  required: IngredientIdentity,
  present: IngredientIdentity,
  ingredient: RecipeIngredient,
  lot: Stock,
): boolean {
  if (
    ingredient.unit === 'count' &&
    !countable.has(required.id) &&
    lot.ingredientSize?.measure !== 'count'
  )
    return false;
  if (present.basis !== 'as-sold' && !lot.ingredientSize) return false;
  if (lot.ingredientSize && lot.ingredientSizeBasis !== present.basis) return false;
  if (required.basis === 'unknown' || required.basis !== present.basis) return false;
  if (
    required.preparation === 'unknown' ||
    present.preparation === 'unknown' ||
    present.preparation === 'any'
  )
    return false;
  return required.preparation === 'any' || required.preparation === present.preparation;
}
export function foodAmountCompatible(food: Food, ingredient: RecipeIngredient): boolean {
  const required = recipeIdentity(ingredient);
  const present = foodIdentity(food);
  const lot = { id: food.id, foodId: food.id, quantity: 1 };
  return Boolean(
    required &&
    present &&
    acceptsIdentity(required.id, present.id) &&
    !ambiguousGarlicCount(food, lot, ingredient) &&
    amountCompatible(required, present, ingredient, lot),
  );
}
export function resolvedLots(
  data: Snapshot,
  ingredient: RecipeIngredient,
  recipe?: Recipe,
): Stock[] {
  const index = indexFor(data);
  const key = JSON.stringify([
    recipeIdentity(ingredient),
    normalizeIngredientName(ingredient.name),
  ]);
  const cached = index.resolved.get(key);
  if (cached) return cached;
  const result = data.stock
    .filter((lot) => {
      const food = index.foods.get(lot.foodId);
      return food && lotMatch(data, ingredient, { food, lot, recipe }) !== 'none';
    })
    .sort(
      (a, b) =>
        (a.expires ?? '9999').localeCompare(b.expires ?? '9999') || a.id.localeCompare(b.id),
    );
  index.resolved.set(key, result);
  return result;
}
