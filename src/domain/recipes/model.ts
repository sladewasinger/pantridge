import { z } from 'zod';
import { roundQuantity, stockQuantitySchema } from '../quantity';
import { recipeCurationSchema, recipeNutritionSchema } from './metadata';
import { ingredientIdentitySchema } from '../ingredient-matching/model';
import { savedStandardizationSchema } from '../standardization/model';

export const recipeUnitSchema = z.enum([
  'count',
  'g',
  'kg',
  'oz',
  'lb',
  'ml',
  'l',
  'fl oz',
  'gal',
  'tsp',
  'tbsp',
  'cup',
  'package',
]);
export const ingredientSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(80),
  quantity: z.number().positive().max(100000),
  unit: recipeUnitSchema,
  optional: z.boolean().optional(),
  note: z.string().trim().max(240).optional(),
  ingredient: ingredientIdentitySchema.optional(),
  standardization: savedStandardizationSchema.optional(),
});
export const recipeSchema = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).optional(),
    servings: z.number().int().min(1).max(100),
    minutes: z.number().int().min(1).max(1440).optional(),
    cuisine: z.string().trim().max(60).optional(),
    ingredients: z.array(ingredientSchema).min(1).max(40),
    untrackedIngredients: z.array(z.string().trim().min(1).max(240)).max(20).optional(),
    steps: z.array(z.string().trim().min(1).max(1000)).min(1).max(30),
    source: z.enum(['starter', 'manual', 'import', 'ai']),
    generation: z
      .object({
        basisKey: z.string().regex(/^(none|base-[1-3])$/),
        reason: z.string().trim().max(160),
        baseTitle: z.string().trim().max(120).optional(),
      })
      .optional(),
    curation: recipeCurationSchema.optional(),
    nutrition: recipeNutritionSchema.optional(),
    sourceUrl: z
      .url()
      .max(500)
      .refine((url) => {
        try {
          const parsed = new URL(url);
          return parsed.protocol === 'https:' && !parsed.username && !parsed.password;
        } catch {
          return false;
        }
      }, 'Use a public HTTPS URL without credentials.')
      .optional(),
  })
  .refine(
    (recipe) =>
      new Set(recipe.ingredients.map((item) => item.id)).size === recipe.ingredients.length,
    'Each ingredient must have a unique ID.',
  )
  .refine(
    (recipe) => new TextEncoder().encode(JSON.stringify(recipe)).length <= 12000,
    'This recipe is too large to sync. Shorten its instructions.',
  );
export const mealPlanSchema = z.object({
  id: z.uuid(),
  recipeId: z.uuid(),
  date: z.iso.date(),
  servings: z.number().positive().max(100),
});
export const cookingDeductionSchema = z.object({
  stockId: z.uuid(),
  foodId: z.uuid(),
  quantity: stockQuantitySchema.refine((quantity) => quantity > 0, 'Enter a positive quantity.'),
  expectedQuantity: stockQuantitySchema,
  expectedFoodSignature: z.string().min(1).max(700).optional(),
  expectedLotSignature: z.string().min(1).max(1000).optional(),
  remainingQuantity: stockQuantitySchema,
});
export const cookingRecordSchema = z
  .object({
    id: z.uuid(),
    recipeId: z.uuid(),
    recipeTitle: z.string().trim().min(1).max(120),
    cookedAt: z.iso.datetime({ offset: true }),
    servings: z.number().positive().max(100),
    deductions: z.array(cookingDeductionSchema).max(60),
  })
  .refine(
    (record) =>
      new Set(record.deductions.map((item) => item.stockId)).size === record.deductions.length,
    'A package may only be deducted once per cooking record.',
  )
  .refine(
    (record) =>
      record.deductions.every(
        (item) =>
          item.quantity <= item.expectedQuantity &&
          roundQuantity(item.expectedQuantity - item.quantity) === item.remainingQuantity,
      ),
    'Cooking amounts do not match the reviewed package remainder.',
  )
  .refine(
    (record) => new TextEncoder().encode(JSON.stringify(record)).length <= 14000,
    'This cooking record is too large to sync. Review fewer packages at once.',
  );
export type Recipe = z.infer<typeof recipeSchema>;
export type RecipeIngredient = z.infer<typeof ingredientSchema>;
export type RecipeUnit = z.infer<typeof recipeUnitSchema>;
export type MealPlanEntry = z.infer<typeof mealPlanSchema>;
export type CookingDeduction = z.infer<typeof cookingDeductionSchema>;
export type CookingRecord = z.infer<typeof cookingRecordSchema>;
