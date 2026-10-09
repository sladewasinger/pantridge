import { z } from 'zod';
import { recipeSchema, mealPlanSchema, cookingRecordSchema } from './recipes/model';
import { dateSchema, foodSchema, id, shoppingSchema, stockSchema } from './model';
import { nutritionEstimateSchema } from './products/nutrition-estimate';
import { ingredientIdentitySchema } from './ingredient-matching/model';
import { sizeSchema } from './products/size';

export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('kitchen.initialize') }),
  z.object({ type: z.literal('classification.retry') }),
  z.object({
    type: z.literal('classification.review'),
    key: z.string().min(1).max(120),
    expected: z.string().regex(/^[a-f0-9]{64}$/),
    ingredient: ingredientIdentitySchema,
  }),
  z.object({ type: z.literal('recipe.save'), recipe: recipeSchema }),
  z.object({ type: z.literal('recipe.restore'), recipe: recipeSchema }),
  z.object({ type: z.literal('recipe.remove'), recipeId: id }),
  z.object({ type: z.literal('mealPlan.save'), entry: mealPlanSchema }),
  z.object({ type: z.literal('mealPlan.restore'), entry: mealPlanSchema }),
  z.object({ type: z.literal('mealPlan.remove'), entryId: id }),
  z.object({
    type: z.literal('mealPlan.addMissing'),
    entryIds: z.array(id).min(1).max(20),
    expectedEntries: z.array(mealPlanSchema).min(1).max(20),
    items: z.array(shoppingSchema).max(40),
  }),
  z.object({
    type: z.literal('recipe.cook'),
    reviewed: z.literal(true),
    record: cookingRecordSchema,
    expectedPlan: mealPlanSchema.optional(),
  }),
  z.object({ type: z.literal('recipe.history.restore'), record: cookingRecordSchema }),
  z.object({
    type: z.literal('recipe.addMissing'),
    recipeId: id,
    servings: z.number().positive().max(100),
    items: z.array(shoppingSchema).max(40),
  }),
  z.object({ type: z.literal('food.remove'), foodId: id }),
  z.object({ type: z.literal('food.restore'), food: foodSchema }),
  z.object({ type: z.literal('food.save'), food: foodSchema }),
  z.object({
    type: z.literal('food.nutrition'),
    foodId: id,
    name: z.string().trim().min(1).max(80),
    estimate: nutritionEstimateSchema.nullable(),
  }),
  z.object({ type: z.literal('stock.add'), stock: stockSchema }),
  z.object({ type: z.literal('stock.remove'), stockId: id }),
  z.object({
    type: z.literal('stock.classify'),
    stockId: id,
    ingredient: ingredientIdentitySchema.nullable(),
  }),
  z.object({ type: z.literal('stock.recipeAmount'), stockId: id, size: sizeSchema.nullable() }),
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
  z.object({ type: z.literal('shopping.move'), itemId: id, beforeId: id.nullable() }),
  z.object({
    type: z.literal('shopping.putAway'),
    itemId: id,
    food: foodSchema,
    stock: stockSchema,
  }),
]);
export const mutationSchema = z
  .object({
    id,
    command: commandSchema,
    catalogRevision: z.number().int().min(1).max(1000).optional(),
  })
  .refine(
    (mutation) => new TextEncoder().encode(JSON.stringify(mutation)).length <= 16000,
    'This change is too large to sync. Use fewer ingredients or shorter instructions.',
  );
export type Command = z.infer<typeof commandSchema>;
export type Mutation = z.infer<typeof mutationSchema>;
