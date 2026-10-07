import { randomUUID } from 'node:crypto';
import { plausibleIngredientAmount } from './amounts';
import { z } from 'zod';
import { recipeUnitSchema } from '../../src/domain/recipes/model';
import { normalizeIngredientName } from '../../src/domain/recipes/names';
import { isRecipeFoodName } from '../../src/domain/recipe-suggestions/foods';
import { emptyPreferences } from '../../src/domain/recipe-preferences/model';
import { excludedIngredient } from '../../src/domain/recipe-preferences/fit';
import { allowedNames } from './preferences';
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
        basisKey: z
          .string()
          .regex(/^(none|base-[1-3])$/)
          .optional(),
        reason: z.string().trim().max(160).optional(),
      }),
    )
    .max(3),
});
export type SuggestionOutput = z.infer<typeof suggestionOutputSchema>;
export function generationSchema(inventoryNames: string[], request?: RecipeSuggestionRequest) {
  const additions = [
    'Salt',
    'Black pepper',
    'Olive oil',
    'Garlic',
    'Onion',
    'Tomatoes',
    'Cheese',
    'Lemon juice',
    'Vegetable broth',
    'Cumin',
    'Paprika',
  ];
  const allowed = request
    ? allowedNames(request, [
        ...additions.filter(isRecipeFoodName),
        ...(request.bases ?? []).flatMap((base) => base.ingredients.map((item) => item.name)),
      ])
    : [...new Set([...inventoryNames, ...additions.filter(isRecipeFoodName)])];
  const recipe = suggestionOutputSchema.shape.recipes.element;
  return suggestionOutputSchema.extend({
    recipes: z
      .array(
        recipe.extend({
          basisKey: z.enum(['none', ...(request?.bases?.map((base) => base.key) ?? [])]),
          reason: z.string().trim().max(160),
          ingredients: z
            .array(ingredient.extend({ name: z.enum(allowed.length ? allowed : ['Water']) }))
            .min(1)
            .max(8),
        }),
      )
      .max(3),
  });
}
const unsafeText =
  /(?:https?:|www\.|[<>]|\b(?:bleach|detergent|soap|shampoo|disinfectant|pesticide|batter(?:y|ies)|tobacco|medicine|medication|toilet|napkins|paper towels|cleaning|antifreeze|poison|cure|calories|nutrition|diabet(?:es|ic)|allergen[- ]free)\b)/i;
const stockClaims =
  /\b(?:you (?:have|own)|your (?:pantry|fridge|inventory)|on[- ]hand|already (?:have|available)|no shopping|all ingredients available)\b/i;
function validRecipe(
  recipe: SuggestionOutput['recipes'][number],
  request: RecipeSuggestionRequest,
) {
  const inventory = new Set(
    request.inventory.flatMap((item) => item.members ?? [item.name]).map(normalizeIngredientName),
  );
  const preferences = request.preferences ?? emptyPreferences();
  const names = allowedNames(request, [
    'Salt',
    'Black pepper',
    'Olive oil',
    'Garlic',
    'Onion',
    'Tomatoes',
    'Cheese',
    'Lemon juice',
    'Vegetable broth',
    'Cumin',
    'Paprika',
    ...(request.bases ?? []).flatMap((base) => base.ingredients.map((item) => item.name)),
  ]);
  const text = JSON.stringify(recipe);
  return (
    !unsafeText.test(text) &&
    !stockClaims.test(text) &&
    recipe.steps.every((step) => !excludedIngredient(step, preferences)) &&
    recipe.ingredients.every(
      (item) =>
        isRecipeFoodName(item.name) &&
        plausibleIngredientAmount(item, recipe.servings) &&
        !excludedIngredient(item.name, preferences) &&
        !excludedIngredient(item.note, preferences) &&
        (!request.inventory.some((food) => food.members) || names.includes(item.name)),
    ) &&
    recipe.ingredients.some((item) => inventory.has(normalizeIngredientName(item.name))) &&
    new Set(recipe.ingredients.map((item) => normalizeIngredientName(item.name))).size ===
      recipe.ingredients.length &&
    (!recipe.basisKey ||
      recipe.basisKey === 'none' ||
      request.bases?.some((base) => base.key === recipe.basisKey))
  );
}
export function validSuggestions(output: SuggestionOutput, request: RecipeSuggestionRequest) {
  const signatures = output.recipes.map((recipe) =>
    JSON.stringify([
      recipe.ingredients
        .map((item) => [
          normalizeIngredientName(item.name),
          Number((item.quantity / recipe.servings).toFixed(6)),
          item.unit,
        ])
        .sort(),
      recipe.steps.map((step) => step.toLowerCase().replace(/\s+/g, ' ').trim()),
    ]),
  );
  return (
    new Set(signatures).size === signatures.length &&
    output.recipes.every((recipe) => validRecipe(recipe, request))
  );
}
export function previewRecipes(output: SuggestionOutput) {
  return recipeSuggestionResultSchema.parse({
    recipes: output.recipes.map((recipe) => ({
      ...recipe,
      id: randomUUID(),
      source: 'ai',
      ...(recipe.basisKey
        ? { generation: { basisKey: recipe.basisKey, reason: recipe.reason ?? '' } }
        : {}),
      ingredients: recipe.ingredients.map((item) => ({ ...item, id: randomUUID() })),
    })),
  });
}
