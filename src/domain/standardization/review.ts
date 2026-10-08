import type { Snapshot, Food, Stock } from '../model';
import type { IngredientIdentity } from '../ingredient-matching/model';
import { foodIdentity, stockIdentity, recipeIdentity } from '../ingredient-matching/classification';
import { matchHash } from '../ingredient-matching/hash';
import { isSupply } from '../supplies';
import { currentStandardization, foodEvidence, stockEvidence, recipeEvidence } from './evidence';
import type { SavedStandardization } from './model';

export interface RecognitionReview {
  key: string;
  name: string;
  context: string;
  signature: string;
  identity?: IngredientIdentity;
  result?: SavedStandardization;
}
function needsReview(identity?: IngredientIdentity, result?: SavedStandardization) {
  if (result && result.status !== 'recognized') return true;
  return Boolean(
    identity && !identity.id.startsWith('custom-') && identity.preparation === 'unknown',
  );
}
const measurement = (lot: Stock) => [
  lot.id,
  lot.product,
  lot.ingredient,
  lot.ingredientSize,
  lot.ingredientSizeBasis,
];
function foodReview(food: Food, lots: Stock[]): RecognitionReview[] {
  if (food.ingredient || isSupply(food)) return [];
  const result = currentStandardization(food.standardization, foodEvidence(food));
  const identity = foodIdentity(food);
  if (!needsReview(identity, result)) return [];
  return [
    {
      key: `food:${food.id}`,
      name: food.name,
      context: 'Kitchen item',
      identity,
      result,
      signature: matchHash(
        JSON.stringify([
          foodEvidence(food),
          food.kind,
          food.unit,
          food.size,
          food.packageSize,
          food.ingredient,
          result,
          lots.map(measurement),
        ]),
      ),
    },
  ];
}
function stockReview(food: Food, lot: Stock): RecognitionReview[] {
  if (food.ingredient || lot.ingredient || !lot.product || lot.quantity <= 0 || isSupply(food))
    return [];
  const result = currentStandardization(lot.standardization, stockEvidence(food, lot));
  const identity = stockIdentity(food, lot);
  if (!needsReview(identity, result)) return [];
  return [
    {
      key: `stock:${lot.id}`,
      name: lot.product.name,
      context: `Package · ${food.name}`,
      identity,
      result,
      signature: matchHash(
        JSON.stringify([
          stockEvidence(food, lot),
          foodEvidence(food),
          food.ingredient,
          food.standardization,
          food.kind,
          food.unit,
          food.size,
          food.packageSize,
          measurement(lot),
          result,
        ]),
      ),
    },
  ];
}
export function recognitionReviews(data: Snapshot): RecognitionReview[] {
  const foods = new Map(data.foods.map((food) => [food.id, food]));
  return [
    ...data.foods.flatMap((food) =>
      foodReview(
        food,
        data.stock.filter((lot) => lot.foodId === food.id),
      ),
    ),
    ...data.stock.flatMap((lot) => {
      const food = foods.get(lot.foodId);
      return food ? stockReview(food, lot) : [];
    }),
    ...(data.recipes ?? []).flatMap((recipe) =>
      recipe.ingredients.flatMap((item) => {
        if (item.ingredient) return [];
        const result = currentStandardization(item.standardization, recipeEvidence(item));
        const identity = recipeIdentity(item);
        if (!needsReview(identity, result)) return [];
        return [
          {
            key: `recipe:${recipe.id}:${item.id}`,
            name: item.name,
            context: `Recipe · ${recipe.title}`,
            identity,
            result,
            signature: matchHash(
              JSON.stringify([
                recipeEvidence(item),
                item.ingredient,
                item.quantity,
                item.unit,
                result,
              ]),
            ),
          },
        ];
      }),
    ),
  ];
}
