import { recipeSchema, type Recipe } from '../recipes/model';
import type { RecipeVariation } from './model';

export function applyVariation(recipe: Recipe, variation: RecipeVariation, id: string): Recipe {
  const old = recipe.ingredients.find((item) => item.id === variation.replaces);
  if (variation.replaces && !old)
    throw new Error('The ingredient changed. Review this recipe again.');
  const next = { ...variation.ingredient, id: old?.id ?? id };
  const escaped = old?.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const steps = old
    ? recipe.steps.map((step) => {
        const changed = step.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), next.name);
        return /^butter$/i.test(old.name) && /^olive oil$/i.test(next.name)
          ? changed.replace(/\bmelt\b/gi, 'warm')
          : changed;
      })
    : recipe.steps;
  const { curation: _curation, nutrition: _nutrition, ...base } = recipe;
  return recipeSchema.parse({
    ...base,
    source: recipe.source === 'starter' ? 'manual' : recipe.source,
    ingredients: old
      ? recipe.ingredients.map((item) => (item.id === old.id ? next : item))
      : [...recipe.ingredients, next],
    steps: [...steps, variation.preparation],
    minutes: recipe.minutes ? recipe.minutes + variation.minutes : undefined,
  });
}
