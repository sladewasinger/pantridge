import { z } from 'zod';

export const roundQuantity = (quantity: number): number => Number(quantity.toFixed(6));
export const stockQuantitySchema = z
  .number()
  .min(0)
  .max(9999)
  .refine(
    (quantity) => roundQuantity(quantity) === quantity,
    'Use at most six decimal places for package quantities.',
  );
