import { z } from 'zod';
import { artSchema, unitSchema } from '../model';
import { productSchema, barcodeSchema } from './barcode';
import { sizeSchema } from './size';

export const lookupRequestSchema = z.object({ barcode: barcodeSchema }).strict();
export const classificationSchema = z.object({
  name: z.string().trim().min(1).max(80),
  location: z.enum(['pantry', 'fridge', 'freezer']),
  unit: unitSchema,
  art: artSchema,
});
export const lookupSchema = z.object({
  product: productSchema,
  found: z.boolean(),
  suggestion: classificationSchema,
  size: sizeSchema.optional(),
  packageText: z.string().max(80),
  source: z.enum(['openfoodfacts', 'manual']),
  classifiedBy: z.enum(['rules', 'openai']),
});
export type Lookup = z.infer<typeof lookupSchema>;
export type Classification = z.infer<typeof classificationSchema>;
