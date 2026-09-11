import { z } from 'zod';
import { dateSchema, foodSchema, id, shoppingSchema, stockSchema } from './model';

export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('kitchen.initialize') }),
  z.object({ type: z.literal('food.remove'), foodId: id }),
  z.object({ type: z.literal('food.restore'), food: foodSchema }),
  z.object({ type: z.literal('food.save'), food: foodSchema }),
  z.object({ type: z.literal('stock.add'), stock: stockSchema }),
  z.object({ type: z.literal('stock.remove'), stockId: id }),
  z.object({ type: z.literal('stock.scan'), food: foodSchema, stock: stockSchema }),
  z.object({
    type: z.literal('stock.adjust'),
    stockId: id,
    delta: z.number().int().min(-9999).max(9999),
  }),
  z.object({ type: z.literal('stock.date'), stockId: id, expires: dateSchema.nullable() }),
  z.object({ type: z.literal('shopping.save'), item: shoppingSchema }),
  z.object({ type: z.literal('shopping.purchase'), itemId: id, purchased: z.boolean() }),
  z.object({ type: z.literal('shopping.remove'), itemId: id }),
  z.object({ type: z.literal('shopping.discard'), itemId: id }),
  z.object({ type: z.literal('shopping.restore'), item: shoppingSchema }),
  z.object({
    type: z.literal('shopping.putAway'),
    itemId: id,
    food: foodSchema,
    stock: stockSchema,
  }),
]);
export const mutationSchema = z.object({ id, command: commandSchema });
export type Command = z.infer<typeof commandSchema>;
export type Mutation = z.infer<typeof mutationSchema>;
