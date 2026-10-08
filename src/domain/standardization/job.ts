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

export function classificationDueSoon(job: ClassificationJob | undefined, now: number): boolean {
  return Boolean(
    job && ['queued', 'processing', 'retry'].includes(job.state) && job.dueAt <= now + 30_000,
  );
}
