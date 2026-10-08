import type { Food, Stock } from '../model';
import type { RecipeIngredient } from '../recipes/model';
import type { IngredientIdentity } from '../ingredient-matching/model';
import { matchHash } from '../ingredient-matching/hash';
import { standardizationVersion, type Evidence, type SavedStandardization } from './model';

export const foodEvidence = (food: Food): Evidence => ({
  name: food.name,
  brand: food.brand,
  details: '',
  context: 'food',
});
export const stockEvidence = (food: Food, stock: Stock): Evidence => ({
  name: stock.product?.name || food.name,
  brand: stock.product?.brand || food.brand,
  details: '',
  context: stock.product ? 'product' : 'food',
  sourceId: stock.product?.barcode,
});
export const recipeEvidence = (item: RecipeIngredient): Evidence => ({
  name: item.name,
  brand: '',
  details: item.note ?? '',
  context: 'recipe',
});
export function evidenceFingerprint(evidence: Evidence): string {
  return matchHash(
    JSON.stringify([
      standardizationVersion,
      evidence.context,
      evidence.name.trim().toLowerCase().replace(/\s+/g, ' '),
      evidence.brand.trim().toLowerCase().replace(/\s+/g, ' '),
      evidence.details.trim().toLowerCase().replace(/\s+/g, ' '),
      evidence.sourceId ?? '',
    ]),
  );
}
export function savedIdentity(
  saved: SavedStandardization | undefined,
  evidence: Evidence,
): IngredientIdentity | undefined {
  if (
    !saved ||
    saved.fingerprint !== evidenceFingerprint(evidence) ||
    saved.status !== 'recognized' ||
    !saved.identity
  )
    return undefined;
  return { id: saved.identity, preparation: saved.preparation, basis: 'as-sold' };
}

export function currentStandardization(
  saved: SavedStandardization | undefined,
  evidence: Evidence,
) {
  return saved?.fingerprint === evidenceFingerprint(evidence) ? saved : undefined;
}
