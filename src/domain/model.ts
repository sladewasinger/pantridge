import { z } from 'zod';

export const id = z.uuid();
export const locationSchema = z.enum(['fridge', 'pantry']);
export const unitSchema = z.enum([
  'items',
  'cartons',
  'cans',
  'bottles',
  'bags',
  'boxes',
  'cups',
  'jars',
  'tubs',
  'packs',
]);
export const artSchema = z.enum([
  'eggs',
  'milk',
  'greens',
  'yogurt',
  'can',
  'pasta',
  'oats',
  'butter',
  'rice',
  'generic',
]);
const label = z.string().trim().min(1).max(80);
export const dateSchema = z.iso.date();
export const foodSchema = z.object({
  id,
  name: label,
  unit: unitSchema,
  art: artSchema,
  brand: z.string().trim().max(80).default(''),
  packageSize: z.string().trim().max(80).default(''),
  location: locationSchema,
  shelf: z.number().int().min(0).max(2),
  frozen: z.boolean(),
});
export const stockSchema = z.object({
  id,
  foodId: id,
  quantity: z.number().int().min(0).max(9999),
  expires: dateSchema.optional(),
});
export const shoppingSchema = z.object({
  id,
  foodId: id.optional(),
  name: label,
  unit: unitSchema,
  quantity: z.number().int().min(1).max(999),
  purchased: z.boolean(),
});
export const snapshotSchema = z.object({
  version: z.literal(1),
  starterVersion: z.literal(1).optional(),
  foods: z.array(foodSchema).max(600),
  stock: z.array(stockSchema).max(1500),
  shopping: z.array(shoppingSchema).max(500),
});
export const envelopeSchema = z.object({ revision: z.number().int().min(0), data: snapshotSchema });
export type Food = z.infer<typeof foodSchema>;
export type Stock = z.infer<typeof stockSchema>;
export type ShoppingItem = z.infer<typeof shoppingSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export type Envelope = z.infer<typeof envelopeSchema>;
export type Location = Food['location'];
export type Unit = Food['unit'];
export const emptySnapshot = (): Snapshot => ({ version: 1, foods: [], stock: [], shopping: [] });
