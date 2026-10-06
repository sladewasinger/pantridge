import { randomUUID } from 'node:crypto';
import { plausibleIngredientAmount } from './amounts';
import { z } from 'zod';
import { recipeUnitSchema } from '../../src/domain/recipes/model';
import { normalizeIngredientName } from '../../src/domain/recipes/names';
import { isRecipeFoodName } from '../../src/domain/recipe-suggestions/foods';
import {
  recipeSuggestionResultSchema,
  type RecipeSuggestionRequest,
} from '../../src/domain/recipe-suggestions/model';

const ingredient = z.strictObject({
  name: z.string().trim().min(1).max(80),
  quantity: z.number().positive().max(5000),
  unit: recipeUnitSchema.exclude(['package']),
  note: z.string().trim().max(160),
});
export const suggestionOutputSchema = z.strictObject({
  recipes: z
    .array(
      z.strictObject({
        title: z.string().trim().min(1).max(100),
        description: z.string().trim().max(240),
        servings: z.number().int().min(1).max(6),
        minutes: z.number().int().min(1).max(180),
        ingredients: z.array(ingredient).min(1).max(10),
        steps: z.array(z.string().trim().min(1).max(360)).min(1).max(6),
      }),
    )
    .max(3),
});
export type SuggestionOutput = z.infer<typeof suggestionOutputSchema>;
const unsafeText =
  /(?:https?:|www\.|[<>]|\b(?:bleach|detergent|soap|shampoo|disinfectant|pesticide|batter(?:y|ies)|tobacco|medicine|medication|toilet|napkins|paper towels|cleaning|antifreeze|poison|cure|calories|nutrition|diabet(?:es|ic)|allergen[- ]free)\b)/i;
const stockClaims =
  /\b(?:you (?:have|own)|your (?:pantry|fridge|inventory)|on[- ]hand|already (?:have|available)|no shopping|all ingredients available)\b/i;
function validRecipe(
  recipe: SuggestionOutput['recipes'][number],
  request: RecipeSuggestionRequest,
) {
  const inventory = new Set(request.inventory.map((item) => normalizeIngredientName(item.name)));
  const text = JSON.stringify(recipe);
  return (
    !unsafeText.test(text) &&
    !stockClaims.test(text) &&
    recipe.ingredients.every(
      (item) => isRecipeFoodName(item.name) && plausibleIngredientAmount(item, recipe.servings),
    ) &&
    recipe.ingredients.some((item) => inventory.has(normalizeIngredientName(item.name))) &&
    new Set(recipe.ingredients.map((item) => normalizeIngredientName(item.name))).size ===
      recipe.ingredients.length
  );
}
export function validSuggestions(output: SuggestionOutput, request: RecipeSuggestionRequest) {
  return output.recipes.every((recipe) => validRecipe(recipe, request));
}
export function previewRecipes(output: SuggestionOutput) {
  return recipeSuggestionResultSchema.parse({
    recipes: output.recipes.map((recipe) => ({
      ...recipe,
      id: randomUUID(),
      source: 'ai',
      ingredients: recipe.ingredients.map((item) => ({ ...item, id: randomUUID() })),
    })),
  });
}
