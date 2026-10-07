import type { Snapshot } from '../model';
import type { Recipe, RecipeIngredient } from '../recipes/model';
import { profileAmount } from './profiles';
import { labelAmount } from './labels';

const nutrients = ['calories', 'protein', 'carbohydrate', 'fat', 'sodium', 'fiber'] as const;
type Evidence = NonNullable<NonNullable<Recipe['nutrition']>['evidence']>[number];
function contribution(
  data: Snapshot,
  ingredient: RecipeIngredient,
  servings: number,
  recipe: Recipe,
) {
  const label = labelAmount(data, ingredient, recipe);
  const generic = label ? undefined : profileAmount(ingredient);
  const values = label?.per100 ?? generic?.profile.per100;
  if (!values) return undefined;
  const evidence: Evidence = {
    ingredient: ingredient.name,
    source: label ? 'package' : 'usda',
    fdcId: generic?.profile.id,
    assumption: (label?.assumption ?? generic!.assumption).slice(0, 240),
  };
  return { values, evidence, factor: (label?.amount ?? generic?.grams ?? 0) / 100 / servings };
}
export function calculateRecipeNutrition(data: Snapshot, recipe: Recipe): Recipe['nutrition'] {
  const totals: Partial<Record<(typeof nutrients)[number], number>> = {};
  const missing: string[] = [];
  const evidence: Evidence[] = [];
  for (const ingredient of recipe.ingredients) {
    const item = contribution(data, ingredient, recipe.servings, recipe);
    if (!item) {
      missing.push(ingredient.name);
      continue;
    }
    evidence.push(item.evidence);
    const absent = nutrients.filter((key) => item.values[key] === undefined);
    if (absent.length) missing.push(`${ingredient.name}: ${absent.join(', ')}`);
    for (const key of nutrients) {
      const value = item.values[key];
      if (value !== undefined) totals[key] = (totals[key] ?? 0) + value * item.factor;
    }
  }
  missing.push(...(recipe.untrackedIngredients ?? []).filter((name) => !/^water\b/i.test(name)));
  for (const key of nutrients) {
    if (totals[key] !== undefined) totals[key] = Math.round(totals[key]! * 10) / 10;
  }
  return { ...totals, source: 'calculated', portion: '1 serving', missing, evidence };
}
export function withCalculatedNutrition(data: Snapshot, recipe: Recipe): Recipe {
  return { ...recipe, nutrition: calculateRecipeNutrition(data, recipe) };
}
