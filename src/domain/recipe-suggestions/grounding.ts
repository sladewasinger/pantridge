import type { Snapshot } from '../model';
import type { Recipe } from '../recipes/model';
import { getCookbookRecipes } from '../recipes/selectors';
import { normalizeIngredientName } from '../recipes/names';
import { preferenceTargets, type RecipePreferences } from '../recipe-preferences/model';
import { excludedIngredient } from '../recipe-preferences/fit';
import { isRecipeFoodName } from './foods';
import { buildRecipeSuggestionRequest } from './inventory';
import type { RecipeSuggestionRequest } from './model';

function eligibleBase(recipe: Recipe, preferences: RecipePreferences) {
  return (
    (recipe.source !== 'starter' || !!recipe.curation) &&
    recipe.ingredients.length <= 8 &&
    recipe.steps.length <= 6 &&
    !!recipe.minutes &&
    recipe.minutes <= 180 &&
    recipe.steps.every((step) => step.length <= 360) &&
    recipe.steps.every((step) => !excludedIngredient(step, preferences)) &&
    !recipe.untrackedIngredients?.length &&
    !/bread|muffin|cake|cookie|waffle|biscuit|pancake/i.test(recipe.title) &&
    recipe.ingredients.every(
      (item) =>
        item.unit !== 'package' &&
        isRecipeFoodName(item.name) &&
        !excludedIngredient(item.name, preferences),
    ) &&
    recipe.minutes <= (preferenceTargets(preferences).minutes ?? 180)
  );
}
export function buildSuggestionContext(
  data: Snapshot,
  useUp: boolean,
  preferences: RecipePreferences,
  today: string,
) {
  const request = buildRecipeSuggestionRequest(data, useUp, today, preferences);
  const names = new Set(
    request.inventory.flatMap((item) => item.members ?? [item.name]).map(normalizeIngredientName),
  );
  const soon = new Set(
    request.inventory
      .filter((item) => item.useSoon)
      .flatMap((item) => item.members ?? [item.name])
      .map(normalizeIngredientName),
  );
  const ranked = getCookbookRecipes(data)
    .filter((recipe) => eligibleBase(recipe, preferences))
    .map((recipe) => ({
      recipe,
      score:
        recipe.ingredients.reduce(
          (score, item) =>
            score +
            (names.has(normalizeIngredientName(item.name)) ? 2 : 0) +
            (useUp && soon.has(normalizeIngredientName(item.name)) ? 3 : 0),
          0,
        ) + (recipe.source !== 'starter' ? 0.5 : 0),
    }))
    .filter((item) => item.score >= 2)
    .sort((a, b) => b.score - a.score || a.recipe.id.localeCompare(b.recipe.id));
  const foundations: Record<string, Recipe> = {};
  const bases: NonNullable<RecipeSuggestionRequest['bases']> = [];
  for (const { recipe } of ranked.slice(0, 3)) {
    const key = `base-${bases.length + 1}`;
    const base = {
      key,
      title: recipe.title,
      servings: recipe.servings,
      minutes: recipe.minutes!,
      ingredients: recipe.ingredients.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit as Exclude<typeof item.unit, 'package'>,
        note: item.note?.slice(0, 160) ?? '',
      })),
      steps: recipe.steps,
    };
    const trial = { ...request, bases: [...bases, base] };
    // Keep every inventory member; optional cookbook context yields to the existing body limit.
    if (new TextEncoder().encode(JSON.stringify(trial)).length > 16384) break;
    foundations[key] = recipe;
    bases.push(base);
  }
  return { request: { ...request, ...(bases.length ? { bases } : {}) }, foundations };
}
