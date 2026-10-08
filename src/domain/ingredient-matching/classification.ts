import type { Food, Stock } from '../model';
import type { RecipeIngredient } from '../recipes/model';
import type { IngredientIdentity } from './model';
import { identifyIngredient, preparationFrom, acceptsIdentity, customIngredient } from './identity';
import {
  foodEvidence,
  stockEvidence,
  recipeEvidence,
  savedIdentity,
  currentStandardization,
} from '../standardization/evidence';

const legumes = new Set([
  'black-beans',
  'kidney-beans',
  'pinto-beans',
  'cannellini-beans',
  'chickpeas',
  'black-eyed-peas',
]);
export function foodIdentity(food: Food): IngredientIdentity | undefined {
  return (
    food.ingredient ??
    savedIdentity(food.standardization, foodEvidence(food)) ??
    identifyIngredient(food.name) ??
    customIngredient(food.name)
  );
}
export function stockIdentity(food: Food, lot: Stock): IngredientIdentity | undefined {
  if (lot.ingredient) return lot.ingredient;
  const result = currentStandardization(lot.standardization, stockEvidence(food, lot));
  if (!food.ingredient && result && result.status !== 'recognized') return undefined;
  const standardized = savedIdentity(lot.standardization, stockEvidence(food, lot));
  if (standardized && !food.ingredient) return standardized;
  const identity = foodIdentity(food);
  if (!identity) return undefined;
  const product = lot.product?.name ?? '';
  const productIdentity = identifyIngredient(product);
  if (
    productIdentity &&
    !acceptsIdentity(identity.id, productIdentity.id) &&
    !acceptsIdentity(productIdentity.id, identity.id)
  )
    return undefined;
  return {
    ...identity,
    id:
      productIdentity && acceptsIdentity(identity.id, productIdentity.id)
        ? productIdentity.id
        : identity.id,
    preparation: stockPreparation(food, lot, identity, productIdentity),
  };
}
function stockPreparation(
  food: Food,
  lot: Stock,
  identity: IngredientIdentity,
  product?: IngredientIdentity,
): IngredientIdentity['preparation'] {
  if (lot.product && !product) return 'unknown';
  if (lot.product && product?.preparation === 'dry' && !preparationFrom(lot.product.name))
    return 'unknown';
  const preparation = product?.preparation ?? identity.preparation;
  return preparation === 'unknown' && legumes.has(identity.id) && food.unit === 'cans'
    ? 'canned'
    : preparation;
}
export const primaryIngredientNote = (ingredient: RecipeIngredient) =>
  (ingredient.note?.toLowerCase() ?? '').split(/\b(?:or|alternatively|instead)\b/)[0]!;
export function recipeIdentity(ingredient: RecipeIngredient): IngredientIdentity | undefined {
  if (ingredient.ingredient) return ingredient.ingredient;
  const identity =
    savedIdentity(ingredient.standardization, recipeEvidence(ingredient)) ??
    identifyIngredient(ingredient.name) ??
    customIngredient(ingredient.name);
  // Alternate ingredients can have different preparations and amounts.
  // Only the primary clause describes the amount on this ingredient row.
  const note = primaryIngredientNote(ingredient);
  const can = /\b(?:cans?|canned)\b/.test(note);
  const drained = /\bdrained\b/.test(note);
  const wholePackage =
    /\b\d+(?:\.\d+)?\s*cans?\s*[×x]\s*\d+(?:\.\d+)?\s*(?:oz|g)\b|\b\d+(?:\.\d+)?\s*(?:ounces?|oz|grams?|g)[)\s]+cans?\b/.test(
      note,
    );
  return {
    ...identity,
    preparation:
      preparationFrom(ingredient.name) ??
      preparationFrom(note) ??
      (can || drained ? 'canned' : identity.preparation),
    // A stated can size measures the whole purchased package before draining.
    basis: drained && !wholePackage ? 'drained' : 'as-sold',
  };
}
export function classifyRecipeIngredient(ingredient: RecipeIngredient): RecipeIngredient {
  const identity = recipeIdentity(ingredient);
  return identity && !identity.id.startsWith('custom-')
    ? { ...ingredient, ingredient: identity }
    : ingredient;
}
