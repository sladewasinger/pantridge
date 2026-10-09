import type { Food, Stock } from '../model';
import type { RecipeIngredient } from '../recipes/model';
import type { IngredientIdentity } from './model';
import {
  standardizationVersion,
  type Evidence,
  type SavedStandardization,
} from '../standardization/model';
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
function negativeBlocks(
  saved: SavedStandardization | undefined,
  evidence: Evidence,
  known?: IngredientIdentity,
) {
  const result = currentStandardization(saved, evidence);
  return Boolean(
    result &&
    result.status !== 'recognized' &&
    !(result.status === 'taxonomy-gap' && result.version !== standardizationVersion && known),
  );
}
export function foodIdentity(food: Food): IngredientIdentity | undefined {
  if (food.ingredient) return food.ingredient;
  const known = identifyIngredient(food.name);
  if (negativeBlocks(food.standardization, foodEvidence(food), known)) return undefined;
  return (
    savedIdentity(food.standardization, foodEvidence(food)) ?? known ?? customIngredient(food.name)
  );
}
export function stockIdentity(food: Food, lot: Stock): IngredientIdentity | undefined {
  if (lot.ingredient) return lot.ingredient;
  const productIdentity = identifyIngredient(lot.product?.name ?? '');
  if (
    !food.ingredient &&
    negativeBlocks(lot.standardization, stockEvidence(food, lot), productIdentity)
  )
    return undefined;
  const standardized = savedIdentity(lot.standardization, stockEvidence(food, lot));
  if (standardized && !food.ingredient) return classifiedStock(standardized, food, lot);
  const identity = foodIdentity(food);
  if (!identity) return undefined;
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
function classifiedStock(identity: IngredientIdentity, food: Food, lot: Stock): IngredientIdentity {
  return {
    ...identity,
    preparation:
      identity.preparation === 'unknown'
        ? (explicitStockPreparation(food, lot, identity.id) ?? 'unknown')
        : identity.preparation,
  };
}
function stockPreparation(
  food: Food,
  lot: Stock,
  identity: IngredientIdentity,
  product?: IngredientIdentity,
): IngredientIdentity['preparation'] {
  if (lot.product && !product) return 'unknown';
  const explicit = explicitStockPreparation(food, lot, identity.id);
  if (explicit) return explicit;
  if (lot.product && product?.preparation === 'dry' && !preparationFrom(lot.product.name))
    return 'unknown';
  const preparation = product?.preparation ?? identity.preparation;
  return preparation === 'unknown' && legumes.has(identity.id) && food.unit === 'cans'
    ? 'canned'
    : preparation;
}
function explicitStockPreparation(food: Food, lot: Stock, identity: string) {
  const forms = new Set(
    [
      preparationFrom(lot.product ? lot.product.name : food.name),
      food.unit === 'cans' && legumes.has(identity) ? ('canned' as const) : undefined,
    ].filter((form) => form !== undefined),
  );
  return forms.size > 1 ? 'unknown' : [...forms][0];
}
export const primaryIngredientNote = (ingredient: RecipeIngredient) =>
  (ingredient.note?.toLowerCase() ?? '').split(/\b(?:or|alternatively|instead)\b/)[0]!;
export function recipeIdentity(ingredient: RecipeIngredient): IngredientIdentity | undefined {
  if (ingredient.ingredient) return ingredient.ingredient;
  const known = identifyIngredient(ingredient.name);
  if (negativeBlocks(ingredient.standardization, recipeEvidence(ingredient), known))
    return undefined;
  const identity =
    savedIdentity(ingredient.standardization, recipeEvidence(ingredient)) ??
    known ??
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
