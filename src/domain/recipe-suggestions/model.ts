import { z } from 'zod';
import { recipeSchema, recipeUnitSchema } from '../recipes/model';
import { isRecipeFoodName } from './foods';
import { cookingDetails } from './groups';

export const recipeInventoryItemSchema = z.strictObject({
  name: z.string().trim().min(1).max(80).refine(isRecipeFoodName, 'Use a recognized food name.'),
  // Legacy requests may supply amounts; grouped requests send presence, never invented totals.
  quantity: z.number().finite().positive().max(100000000).optional(),
  unit: recipeUnitSchema.optional(),
  useSoon: z.boolean().optional(),
  details: z.array(z.enum(cookingDetails)).max(cookingDetails.length).optional(),
});
export const recipeSuggestionRequestSchema = z
  .strictObject({
    kind: z.literal('recipe'),
    inventory: z.array(recipeInventoryItemSchema).min(1).max(600),
    useUp: z.boolean(),
  })
  .refine(
    (request) => new TextEncoder().encode(JSON.stringify(request)).length <= 16384,
    'Too many distinct ingredients for one recipe request.',
  );
export const recipeSuggestionResultSchema = z.strictObject({
  recipes: z
    .array(
      recipeSchema.refine(
        (recipe) => recipe.source === 'ai' && recipe.sourceUrl === undefined,
        'AI previews must identify their source and cannot include a source URL.',
      ),
    )
    .max(3),
});
export type RecipeInventoryItem = z.infer<typeof recipeInventoryItemSchema>;
export type RecipeSuggestionRequest = z.infer<typeof recipeSuggestionRequestSchema>;
export type RecipeSuggestionResult = z.infer<typeof recipeSuggestionResultSchema>;
