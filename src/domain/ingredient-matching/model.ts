import { z } from 'zod';
import registry from './registry.json' with { type: 'json' };

export const preparationSchema = z.enum([
  'plain',
  'raw',
  'dry',
  'cooked',
  'canned',
  'frozen',
  'unknown',
  'any',
]);
export const ingredientIdentitySchema = z.object({
  id: z
    .string()
    .max(80)
    .refine(
      (value) => /^custom-[a-f0-9]{64}$/.test(value) || registry.some((item) => item.id === value),
      'Choose a recognized ingredient.',
    ),
  preparation: preparationSchema,
  basis: z.enum(['as-sold', 'drained', 'edible', 'unknown']),
});
export type IngredientIdentity = z.infer<typeof ingredientIdentitySchema>;
