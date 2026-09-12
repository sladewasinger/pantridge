import { z } from 'zod';
const amount = z.number().finite().min(0).max(100000).optional();
export const nutrientsSchema = z.object({
  calories: amount,
  fat: amount,
  saturatedFat: amount,
  carbohydrates: amount,
  sugars: amount,
  fiber: amount,
  protein: amount,
  sodium: amount,
});
export const nutritionSchema = z.object({
  per100: nutrientsSchema,
  perServing: nutrientsSchema.optional(),
  serving: z.string().max(80).optional(),
  basis: z.enum(['g', 'ml']).optional(),
});
export type Nutrients = z.infer<typeof nutrientsSchema>;
export type Nutrition = z.infer<typeof nutritionSchema>;
