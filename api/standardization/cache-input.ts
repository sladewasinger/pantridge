import { createHash } from 'node:crypto';
import { cachedProduct } from '../products/cache';
import { catalogEvidence } from './catalog';
import { normalizeBarcode, validBarcode } from '../../src/domain/products/barcode';
import { evidenceFingerprint } from '../../src/domain/standardization/evidence';
import {
  standardizationVersion,
  type StandardizationRequest,
} from '../../src/domain/standardization/model';
import { standardizationReasoning } from './config';

async function publicEvidence(item: StandardizationRequest['items'][number], signal?: AbortSignal) {
  const barcode =
    item.barcode && validBarcode(item.barcode) ? normalizeBarcode(item.barcode) : null;
  if (!barcode) return undefined;
  const raw = await cachedProduct(`product#raw-v2#${barcode}`, signal);
  const stored = !raw ? await catalogEvidence(barcode, signal) : undefined;
  const metadata =
    raw?.found && raw.source === 'openfoodfacts'
      ? { ...raw.product, details: raw.categoryHints ?? '' }
      : stored;
  return metadata &&
    metadata.name === item.evidence.name &&
    metadata.brand === item.evidence.brand &&
    item.evidence.context === 'product' &&
    !item.evidence.details
    ? metadata
    : undefined;
}
export async function cacheInput(
  owner: string,
  item: StandardizationRequest['items'][number],
  signal?: AbortSignal,
) {
  const metadata = await publicEvidence(item, signal);
  const evidence = metadata
    ? {
        name: metadata.name,
        brand: metadata.brand,
        context: 'product' as const,
        sourceId: normalizeBarcode(item.barcode!),
        details: metadata.details,
      }
    : item.evidence;
  const scope = metadata ? `catalog#${normalizeBarcode(item.barcode!)}` : `private#${owner}`;
  const key =
    'standardization#v2#' +
    createHash('sha256')
      .update(
        JSON.stringify([
          scope,
          standardizationVersion,
          evidenceFingerprint(evidence),
          process.env.CLASSIFIER_MODEL,
          standardizationReasoning(),
        ]),
      )
      .digest('hex');
  return {
    key,
    evidence,
    barcode: metadata ? normalizeBarcode(item.barcode!) : undefined,
    source: metadata ? ('ai-catalog' as const) : ('ai-private' as const),
  };
}
