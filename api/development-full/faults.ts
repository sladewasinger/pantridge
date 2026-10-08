import { z } from 'zod';
export const controlsSchema = z.object({
  syncFailures: z.number().int().min(0).max(5).optional(),
  providerFailures: z.number().int().min(0).max(5).optional(),
  providerDelay: z.number().int().min(0).max(12000).optional(),
});
type Faults = {
  syncFailures: number;
  providerFailures: number;
  providerDelay: number;
  calls: number;
};
const accounts = new Map<string, Faults>();
export function faults(owner: string): Faults {
  if (!accounts.has(owner))
    accounts.set(owner, { syncFailures: 0, providerFailures: 0, providerDelay: 0, calls: 0 });
  return accounts.get(owner)!;
}
