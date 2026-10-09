import type { Snapshot, Food } from '../model';
import { isSupply } from '../supplies';
import { identifyIngredient, preparationFrom } from '../ingredient-matching/identity';
import {
  foodEvidence,
  stockEvidence,
  recipeEvidence,
  evidenceFingerprint,
  currentStandardization,
} from './evidence';
import { standardizationVersion, type Evidence, type SavedStandardization } from './model';

export interface ClassificationTarget {
  key: string;
  evidence: Evidence;
  fingerprint: string;
  barcode?: string;
}
function unresolved(evidence: Evidence, saved?: SavedStandardization): boolean {
  const known = identifyIngredient(evidence.name);
  const current = currentStandardization(saved, evidence);
  if (current) {
    if (current.status === 'recognized' || current.version === standardizationVersion) return false;
    return !(current.status === 'taxonomy-gap' && known);
  }
  if (
    evidence.context === 'product' &&
    (!known || ['dry', 'unknown'].includes(known.preparation)) &&
    !preparationFrom(evidence.name)
  )
    return true;
  return !known;
}
function foodTargets(data: Snapshot, foods: Map<string, Food>): ClassificationTarget[] {
  const targets: ClassificationTarget[] = [];
  for (const food of foods.values()) {
    const evidence = foodEvidence(food);
    if (
      !food.ingredient &&
      !data.stock.some((lot) => lot.foodId === food.id && lot.ingredientSize && !lot.ingredient) &&
      unresolved(evidence, food.standardization)
    )
      targets.push({
        key: `food:${food.id}`,
        evidence,
        fingerprint: evidenceFingerprint(evidence),
      });
  }
  return targets;
}
function stockTargets(data: Snapshot, foods: Map<string, Food>): ClassificationTarget[] {
  const targets: ClassificationTarget[] = [];
  for (const stock of data.stock) {
    const food = foods.get(stock.foodId);
    if (
      !food ||
      !stock.product ||
      stock.ingredient ||
      food.ingredient ||
      stock.ingredientSize ||
      stock.quantity <= 0
    )
      continue;
    const evidence = stockEvidence(food, stock);
    if (unresolved(evidence, stock.standardization))
      targets.push({
        key: `stock:${stock.id}`,
        evidence,
        fingerprint: evidenceFingerprint(evidence),
        barcode: stock.product.barcode,
      });
  }
  return targets;
}
function recipeTargets(data: Snapshot): ClassificationTarget[] {
  const targets: ClassificationTarget[] = [];
  for (const recipe of data.recipes ?? []) {
    for (const item of recipe.ingredients) {
      const evidence = recipeEvidence(item);
      if (!item.ingredient && unresolved(evidence, item.standardization))
        targets.push({
          key: `recipe:${recipe.id}:${item.id}`,
          evidence,
          fingerprint: evidenceFingerprint(evidence),
        });
    }
  }
  return targets;
}
export function classificationTargets(data: Snapshot): ClassificationTarget[] {
  const foods = new Map(
    data.foods.filter((food) => !isSupply(food)).map((food) => [food.id, food]),
  );
  return [...foodTargets(data, foods), ...stockTargets(data, foods), ...recipeTargets(data)];
}
export function applyClassifications(
  data: Snapshot,
  results: Map<string, SavedStandardization>,
): Snapshot {
  const applicable = new Map(
    classificationTargets(data).flatMap((target) => {
      const result = results.get(target.key);
      return result?.fingerprint === target.fingerprint && result.version === standardizationVersion
        ? [[target.key, result] as const]
        : [];
    }),
  );
  if (!applicable.size) return data;
  return {
    ...data,
    foods: data.foods.map((food) =>
      applicable.has(`food:${food.id}`)
        ? { ...food, standardization: applicable.get(`food:${food.id}`) }
        : food,
    ),
    stock: data.stock.map((stock) =>
      applicable.has(`stock:${stock.id}`)
        ? {
            ...stock,
            standardization: applicable.get(`stock:${stock.id}`),
          }
        : stock,
    ),
    ...(data.recipes
      ? {
          recipes: data.recipes.map((recipe) => ({
            ...recipe,
            ingredients: recipe.ingredients.map((item) =>
              applicable.has(`recipe:${recipe.id}:${item.id}`)
                ? { ...item, standardization: applicable.get(`recipe:${recipe.id}:${item.id}`) }
                : item,
            ),
          })),
        }
      : {}),
  };
}
