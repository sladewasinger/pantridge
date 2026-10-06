import { z } from 'zod';
import { recipeSchema, recipeUnitSchema } from '../recipes/model';
import { isRecipeFoodName } from './foods';

export const recipeInventoryItemSchema = z.strictObject({
  name: z.string().trim().min(1).max(80).refine(isRecipeFoodName, 'Use a recognized food name.'),
  quantity: z.number().finite().positive().max(100000000),
  unit: recipeUnitSchema,
  useSoon: z.boolean(),
});
export const recipeSuggestionRequestSchema = z.strictObject({
  kind: z.literal('recipe'),
  inventory: z.array(recipeInventoryItemSchema).min(1).max(40),
  useUp: z.boolean(),
});
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
