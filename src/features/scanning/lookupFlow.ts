import type { Lookup } from '../../domain/products/lookup';
import { refineBarcode, resolveBarcode } from './client';

export async function lookupFlow(
  barcode: string,
  account: string,
  signal: AbortSignal,
  callbacks: {
    receive: (result: Lookup, refined: boolean) => void;
    progress: (stage: 'lookup' | 'enhance' | 'complete') => void;
    failure: (message: string) => void;
  },
) {
  const { receive, progress, failure } = callbacks;
  let hasResult = false;
  try {
    const result = await resolveBarcode(barcode, account, signal);
    if (signal.aborted) return;
    hasResult = true;
    receive(result, false);
    if (result.enhancement !== 'pending') return;
    progress('enhance');
    const enhanced = await refineBarcode(barcode, account, signal);
    if (!signal.aborted) receive(enhanced, true);
  } catch {
    if (!signal.aborted && !hasResult)
      failure('Lookup unavailable. You can enter the details below.');
  } finally {
    if (!signal.aborted) progress('complete');
  }
}
