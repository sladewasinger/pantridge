import { z } from 'zod';

export const classificationJobSchema = z.object({
  state: z.enum(['queued', 'processing', 'retry', 'failed', 'paused']),
  input: z.string(),
  generation: z.number().int().nonnegative(),
  firstQueuedAt: z.number(),
  dueAt: z.number(),
  attempts: z.number().int().nonnegative(),
  lease: z.string().optional(),
  leaseUntil: z.number().optional(),
});
export type ClassificationJob = z.infer<typeof classificationJobSchema>;
