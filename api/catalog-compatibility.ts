import type { Envelope, Snapshot } from '../src/domain/model';
import type { IngredientIdentity } from '../src/domain/ingredient-matching/model';
import type { SavedStandardization } from '../src/domain/standardization/model';
import type { StandardizationResult } from '../src/domain/standardization/model';
import type { Recipe } from '../src/domain/recipes/model';
import { catalogRevision, knownInCatalog } from '../src/domain/ingredient-matching/catalog-version';
import { ProductError } from './products/errors';

interface Classified {
  ingredient?: IngredientIdentity;
  standardization?: SavedStandardization;
}
export const requestedCatalogRevision = (value?: string) =>
  value === String(catalogRevision) ? catalogRevision : 1;

function unsupported(item: Classified, revision: number) {
  return Boolean(
    (item.ingredient && !knownInCatalog(item.ingredient.id, revision)) ||
    (item.standardization?.identity && !knownInCatalog(item.standardization.identity, revision)),
  );
}
function project<T extends Classified>(item: T, revision: number): T {
  if (!unsupported(item, revision)) return item;
  const next = { ...item };
  if (next.ingredient && !knownInCatalog(next.ingredient.id, revision)) delete next.ingredient;
  if (next.standardization)
    next.standardization = projectClassification(next.standardization, revision);
  return next;
}
export function projectClassification<T extends StandardizationResult>(
  result: T,
  revision: number,
): T {
  if (!result.identity || knownInCatalog(result.identity, revision)) return result;
  return {
    ...result,
    status: 'unknown',
    identity: null,
    preparation: 'unknown',
    reason: 'Identity unavailable in this app version.',
  };
}
export function projectRecipes<T extends { recipes: Recipe[] }>(result: T, revision: number): T {
  if (revision >= catalogRevision) return result;
  return {
    ...result,
    recipes: result.recipes.map((recipe) => ({
      ...recipe,
      ingredients: recipe.ingredients.map((item) => project(item, revision)),
    })),
  };
}
export function projectCatalog(envelope: Envelope, revision: number): Envelope {
  if (revision >= catalogRevision) return envelope;
  const data = envelope.data;
  return {
    ...envelope,
    data: {
      ...data,
      foods: data.foods.map((item) => project(item, revision)),
      stock: data.stock.map((item) => project(item, revision)),
      shopping: data.shopping.map((item) => project(item, revision)),
      ...(data.recipes
        ? {
            recipes: projectRecipes({ recipes: data.recipes }, revision).recipes,
          }
        : {}),
    },
  };
}
export function assertCatalogWritable(data: Snapshot, revision: number) {
  if (revision >= catalogRevision) return;
  const items: Classified[] = [
    ...data.foods,
    ...data.stock,
    ...data.shopping,
    ...(data.recipes ?? []).flatMap((recipe) => recipe.ingredients),
  ];
  if (items.some((item) => unsupported(item, revision)))
    throw new ProductError(
      426,
      'Update the app to sync this kitchen. Your changes are saved on this device.',
    );
}
