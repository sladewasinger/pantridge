import type { Recipe } from '../recipes/model';
import { normalizeIngredientName } from '../recipes/names';
import { preferenceTargets, type RecipePreferences } from './model';
import { restrictionConflicts } from './restrictions';

export function excludedIngredient(name: string, preferences: RecipePreferences) {
  const normalized = normalizeIngredientName(name);
  return (
    restrictionConflicts(name, preferences).length > 0 ||
    preferences.avoid.some((avoid) =>
      normalized
        .split(/[^a-z0-9]+/)
        .join(' ')
        .includes(
          normalizeIngredientName(avoid)
            .split(/[^a-z0-9]+/)
            .join(' '),
        ),
    )
  );
}
export function recipeFit(recipe: Recipe, preferences: RecipePreferences) {
  const target = preferenceTargets(preferences);
  const notes: string[] = [];
  if (target.minutes) notes.push(timeFit(recipe.minutes, target.minutes));
  const complete = !!recipe.nutrition && !recipe.nutrition.missing?.length;
  for (const [key, goal, label, compare] of [
    ['protein', target.protein, 'protein', (actual: number, value: number) => actual >= value],
    ['carbohydrate', target.carbs, 'carbs', (actual: number, value: number) => actual <= value],
  ] as const) {
    if (!goal) continue;
    const actual = recipe.nutrition?.[key];
    if (!complete || actual === undefined)
      notes.push(`${label} target unverified: incomplete nutrition`);
    else
      notes.push(
        `${actual} g ${label}/serving · ${compare(actual, goal) ? 'meets' : 'outside'} ${goal} g target`,
      );
  }
  return notes;
}
function timeFit(minutes: number | undefined, target: number) {
  if (minutes !== undefined && minutes <= target) return `Within ${target} min`;
  return `Time target: ${target} min; this recipe ${minutes ? `takes about ${minutes} min` : 'has no verified time'}`;
}
