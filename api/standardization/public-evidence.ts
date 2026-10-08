import type { Lookup } from '../../src/domain/products/lookup';
import type { Evidence } from '../../src/domain/standardization/model';
export function matchesPublicEvidence(raw: Lookup | null, evidence: Evidence): boolean {
  return Boolean(
    raw?.found &&
    raw.source === 'openfoodfacts' &&
    raw.product.name === evidence.name &&
    raw.product.brand === evidence.brand &&
    (raw.categoryHints ?? '') === evidence.details &&
    evidence.context === 'product',
  );
}
