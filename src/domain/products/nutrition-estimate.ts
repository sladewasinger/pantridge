import { z } from 'zod';

const grams = z.number().finite().min(0).max(200);
export const estimatedNutrientsSchema = z.object({
  calories: z.number().finite().min(0).max(1000),
  fat: grams,
  saturatedFat: grams.nullable(),
  carbohydrates: grams,
  sugars: grams.nullable(),
  fiber: grams.nullable(),
  protein: grams,
  sodium: z.number().finite().min(0).max(100000).nullable(),
});
export const estimateValuesSchema = z.object({
  basis: z.enum(['g', 'ml']),
  per100: estimatedNutrientsSchema,
  assumptions: z.string().trim().min(1).max(240),
});
export const nutritionEstimateSchema = estimateValuesSchema.extend({
  source: z.literal('ai'),
  name: z.string().trim().min(1).max(80),
  details: z.string().trim().max(200),
  estimatedAt: z.iso.datetime(),
});
export const nutritionRequestSchema = z.strictObject({
  kind: z.literal('nutrition'),
  name: z.string().trim().min(1).max(80),
  details: z.string().trim().max(200).default(''),
});
export const nutritionResultSchema = z.object({ estimate: nutritionEstimateSchema.nullable() });
export type NutritionEstimate = z.infer<typeof nutritionEstimateSchema>;
export type NutritionRequest = z.infer<typeof nutritionRequestSchema>;
export function estimateNutrition(estimate: NutritionEstimate) {
  return {
    basis: estimate.basis,
    per100: Object.fromEntries(
      Object.entries(estimate.per100).filter(([, value]) => value !== null),
    ),
  };
}
