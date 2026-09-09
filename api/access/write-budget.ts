import { countRequest } from './store';
import { limit } from './config';

export async function reserveWriteBudget(snapshot: unknown): Promise<void> {
  const seconds = Math.floor(Date.now() / 1000);
  // JSON byte size plus metadata headroom; transactions bill two units per KiB.
  // Reserve before every attempt, including conflicts, with no optimistic refunds.
  const units = 2 * (Math.ceil((Buffer.byteLength(JSON.stringify(snapshot)) + 1024) / 1024) + 1);
  await countRequest(
    `writes#${Math.floor(seconds / 86400)}`,
    seconds + 172800,
    limit('KITCHEN_WRITE_UNITS_PER_DAY', 1000000),
    units,
  );
}
