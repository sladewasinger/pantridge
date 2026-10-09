import type { Food, Stock } from '../model';
import type { RecipeIngredient } from '../recipes/model';
import type { IngredientIdentity } from '../ingredient-matching/model';
import { matchHash } from '../ingredient-matching/hash';
import type { Evidence, SavedStandardization } from './model';

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
      // Evidence format is independent of classifier policy. Reuse good saved results
      // when the taxonomy expands; only outdated negative results need another attempt.
      '1',
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
