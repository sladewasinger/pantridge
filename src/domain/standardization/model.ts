import { z } from 'zod';
import registry from '../ingredient-matching/registry.json' with { type: 'json' };
import { preparationSchema } from '../ingredient-matching/model';

export const standardizationVersion = '2';
export const batchSize = 25;
export const evidenceSchema = z.object({
  name: z.string().trim().min(1).max(160),
  brand: z.string().trim().max(80),
  details: z.string().trim().max(1500),
  context: z.enum(['product', 'food', 'recipe']),
  sourceId: z.string().max(80).optional(),
});
export const resultSchema = z.object({
  status: z.enum(['recognized', 'uncertain', 'unknown', 'taxonomy-gap', 'composite', 'nonfood']),
  identity: z.enum(registry.map((item) => item.id)).nullable(),
  preparation: preparationSchema,
  reason: z.string().max(160),
});
export const savedStandardizationSchema = resultSchema.extend({
  version: z.string().min(1).max(20),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  source: z.enum(['ai-private', 'ai-catalog']),
});
export const standardizationRequestSchema = z
  .object({
    kind: z.literal('standardization'),
    mode: z.enum(['lookup', 'resolve']).default('lookup'),
    items: z
      .array(
        z
          .object({
            key: z.string().min(1).max(120),
            evidence: evidenceSchema,
            barcode: z
              .string()
              .regex(/^\d{8,14}$/)
              .optional(),
          })
          .strict(),
      )
      .min(1)
      .max(batchSize),
  })
  .strict();
export const standardizationResponseSchema = z.object({
  items: z
    .array(
      z.object({
        key: z.string(),
        result: resultSchema.nullable(),
        source: z.enum(['ai-private', 'ai-catalog']),
        reused: z.boolean(),
      }),
    )
    .max(batchSize),
});
export type Evidence = z.infer<typeof evidenceSchema>;
export type StandardizationResult = z.infer<typeof resultSchema>;
export type SavedStandardization = z.infer<typeof savedStandardizationSchema>;
export type StandardizationRequest = z.infer<typeof standardizationRequestSchema>;
