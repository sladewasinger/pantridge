import { recipeSchema, type Recipe, type RecipeUnit } from '../../domain/recipes/model';
import type { IngredientIdentity } from '../../domain/ingredient-matching/model';

export interface IngredientDraft {
  id: string;
  name: string;
  quantity: string;
  unit: RecipeUnit;
  optional: boolean;
  note?: string;
  ingredient?: IngredientIdentity;
}
export interface RecipeDraft {
  title: string;
  description: string;
  servings: string;
  minutes: string;
  cuisine: string;
  sourceUrl: string;
  ingredients: IngredientDraft[];
  steps: string;
  extras: string;
}
export const emptyIngredient = (): IngredientDraft => ({
  id: crypto.randomUUID(),
  name: '',
  quantity: '',
  unit: 'count',
  optional: false,
});
export function recipeDraft(recipe?: Recipe): RecipeDraft {
  if (!recipe)
    return {
      title: '',
      description: '',
      servings: '2',
      minutes: '',
      cuisine: '',
      sourceUrl: '',
      ingredients: [emptyIngredient()],
      steps: '',
      extras: '',
    };
  return {
    title: recipe.title,
    description: recipe.description ?? '',
    servings: String(recipe.servings),
    minutes: recipe.minutes ? String(recipe.minutes) : '',
    cuisine: recipe.cuisine ?? '',
    sourceUrl: recipe.sourceUrl ?? '',
    ingredients: recipe.ingredients.map((item) => ({
      ...item,
      quantity: String(item.quantity),
      optional: item.optional ?? false,
    })),
    steps: recipe.steps.join('\n'),
    extras: recipe.untrackedIngredients?.join('\n') ?? '',
  };
}
export function parseRecipeDraft(
  draft: RecipeDraft,
  original: Recipe | undefined,
  id: string,
): Recipe {
  const parsed = recipeSchema.safeParse({
    id,
    source: original && original.source !== 'starter' ? original.source : 'manual',
    title: draft.title,
    description: draft.description.trim() || undefined,
    servings: Number(draft.servings),
    minutes: draft.minutes ? Number(draft.minutes) : undefined,
    cuisine: draft.cuisine.trim() || undefined,
    sourceUrl: draft.sourceUrl.trim() || undefined,
    untrackedIngredients: draft.extras.trim()
      ? draft.extras
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
      : undefined,
    ingredients: draft.ingredients.map((item) => ({ ...item, quantity: Number(item.quantity) })),
    steps: draft.steps
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(' · ') || 'Recipe';
    throw new Error(`${path}: ${issue?.message ?? 'Check the recipe fields.'}`);
  }
  return parsed.data;
}
