import { z } from 'zod';

const amount = z.number().finite().min(0).max(100000);
export const recipeNutritionSchema = z
  .object({
    calories: amount.optional(),
    protein: amount.optional(),
    carbohydrate: amount.optional(),
    fat: amount.optional(),
    sodium: amount.optional(),
    fiber: amount.optional(),
    source: z.enum(['publisher', 'calculated']),
    portion: z.string().trim().min(1).max(100),
    missing: z.array(z.string().trim().min(1).max(240)).max(60).optional(),
    evidence: z
      .array(
        z.object({
          ingredient: z.string().trim().min(1).max(80),
          source: z.enum(['package', 'usda']),
          fdcId: z.number().int().positive().optional(),
          assumption: z.string().trim().max(240),
        }),
      )
      .max(40)
      .optional(),
  })
  .refine(
    (value) =>
      value.source !== 'publisher' ||
      [value.calories, value.protein, value.fat].every((number) => number !== undefined),
    'Publisher estimates require calories, protein and fat.',
  );
export const recipeCurationSchema = z.object({
  publisher: z.string().trim().min(1).max(80),
  author: z.string().trim().min(1).max(100),
  rating: z.number().finite().min(0).max(5),
  ratingCount: z.number().int().min(1).max(10000000),
  checkedAt: z.iso.date(),
});
