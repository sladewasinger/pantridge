import { z } from 'zod';
import { recipeSchema, recipeUnitSchema } from '../recipes/model';
import { isRecipeFoodName } from './foods';
import { cookingDetails } from './groups';
import { recipePreferencesSchema } from '../recipe-preferences/model';

export const recipeInventoryItemSchema = z.strictObject({
  name: z.string().trim().min(1).max(80).refine(isRecipeFoodName, 'Use a recognized food name.'),
  // Legacy requests may supply amounts; grouped requests send presence, never invented totals.
  quantity: z.number().finite().positive().max(100000000).optional(),
  unit: recipeUnitSchema.optional(),
  useSoon: z.boolean().optional(),
  details: z.array(z.enum(cookingDetails)).max(cookingDetails.length).optional(),
  members: z
    .array(z.string().trim().min(1).max(80).refine(isRecipeFoodName))
    .min(1)
    .max(600)
    .optional(),
});
export const recipeSuggestionRequestSchema = z
  .strictObject({
    kind: z.literal('recipe'),
    inventory: z.array(recipeInventoryItemSchema).min(1).max(600),
    useUp: z.boolean(),
    preferences: recipePreferencesSchema.optional(),
    bases: z
      .array(
        z.strictObject({
          key: z.string().regex(/^base-[1-3]$/),
          title: z.string().trim().min(1).max(120),
          servings: z.number().int().min(1).max(100),
          minutes: z.number().int().min(1).max(180),
          ingredients: z
            .array(
              z.strictObject({
                name: z.string().trim().min(1).max(80).refine(isRecipeFoodName),
                quantity: z.number().positive().max(100000),
                unit: recipeUnitSchema.exclude(['package']),
                note: z.string().trim().max(160),
              }),
            )
            .min(1)
            .max(8),
          steps: z.array(z.string().trim().min(1).max(360)).min(1).max(6),
        }),
      )
      .max(3)
      .optional(),
  })
  .refine(
    (request) =>
      new Set(request.bases?.map((base) => base.key)).size === (request.bases?.length ?? 0),
    'Each cookbook foundation needs a unique key.',
  )
  .refine(
    (request) =>
      request.inventory.reduce((count, item) => count + (item.members?.length ?? 1), 0) <= 600,
    'Too many foods for one recipe request.',
  )
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
