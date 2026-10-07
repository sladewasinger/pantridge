import { z } from 'zod';

const amount = z.number().finite().min(0).max(100000);
export const recipeNutritionSchema = z.object({
  calories: amount,
  protein: amount,
  carbohydrate: amount.optional(),
  fat: amount,
  sodium: amount.optional(),
  fiber: amount.optional(),
  source: z.literal('publisher'),
  portion: z.string().trim().min(1).max(100),
});
export const recipeCurationSchema = z.object({
  publisher: z.string().trim().min(1).max(80),
  author: z.string().trim().min(1).max(100),
  rating: z.number().finite().min(0).max(5),
  ratingCount: z.number().int().min(1).max(10000000),
  checkedAt: z.iso.date(),
});
