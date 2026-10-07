import { z } from 'zod';

export const directions = ['quick', 'high-protein', 'lower-carb', 'comfort', 'one-pan'] as const;
export const restrictions = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'celiac',
  'dairy-free',
  'lactose-free',
  'milk',
  'egg',
  'fish',
  'shellfish',
  'peanut',
  'tree-nut',
  'wheat',
  'soy',
  'sesame',
] as const;
const unique = <T>(values: T[]) => new Set(values).size === values.length;
export const recipePreferencesSchema = z.strictObject({
  directions: z.array(z.enum(directions)).max(3).refine(unique).default([]),
  restrictions: z.array(z.enum(restrictions)).max(restrictions.length).refine(unique).default([]),
  maxMinutes: z.number().int().min(5).max(180).optional(),
  minProtein: z.number().int().min(5).max(100).optional(),
  maxCarbs: z.number().int().min(5).max(150).optional(),
  meal: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  cuisine: z.string().trim().max(60).optional(),
  equipment: z.string().trim().max(80).optional(),
  request: z.string().trim().max(160).optional(),
  avoid: z.array(z.string().trim().min(1).max(80)).max(10).refine(unique).default([]),
});
export type RecipePreferences = z.infer<typeof recipePreferencesSchema>;
export const emptyPreferences = (): RecipePreferences => ({
  directions: [],
  restrictions: [],
  avoid: [],
});
export function preferenceTargets(value: RecipePreferences) {
  return {
    minutes: value.maxMinutes ?? (value.directions.includes('quick') ? 20 : undefined),
    protein: value.minProtein ?? (value.directions.includes('high-protein') ? 30 : undefined),
    carbs: value.maxCarbs ?? (value.directions.includes('lower-carb') ? 30 : undefined),
  };
}
