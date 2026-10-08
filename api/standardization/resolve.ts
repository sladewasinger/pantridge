import { createHash } from 'node:crypto';
import { cachedProduct, cachedResult, cacheResult, claimCache, takeQuota } from '../products/cache';
import { ProductError } from '../products/errors';
import { catalogEvidence, publishCatalog } from './catalog';
import { normalizeBarcode, validBarcode } from '../../src/domain/products/barcode';
import { evidenceFingerprint } from '../../src/domain/standardization/evidence';
import {
  resultSchema,
  standardizationRequestSchema,
  type StandardizationRequest,
} from '../../src/domain/standardization/model';
import { classifyBatch } from './classify';

async function publicEvidence(item: StandardizationRequest['items'][number]) {
  const raw =
    item.barcode && validBarcode(item.barcode)
      ? await cachedProduct(`product#raw-v2#${normalizeBarcode(item.barcode)}`)
      : null;
  const stored =
    !raw && item.barcode && validBarcode(item.barcode)
      ? await catalogEvidence(normalizeBarcode(item.barcode))
      : undefined;
  const publicMetadata =
    raw?.found && raw.source === 'openfoodfacts'
      ? { ...raw.product, details: raw.categoryHints ?? '' }
      : stored;
  return publicMetadata &&
    publicMetadata.name === item.evidence.name &&
    publicMetadata.brand === item.evidence.brand &&
    item.evidence.context === 'product' &&
    !item.evidence.details
    ? publicMetadata
    : undefined;
}
async function cacheInput(owner: string, item: StandardizationRequest['items'][number]) {
  const publicMetadata = await publicEvidence(item);
  const publicProduct = Boolean(publicMetadata);
  const evidence = publicProduct
    ? {
        name: publicMetadata!.name,
        brand: publicMetadata!.brand,
        context: 'product' as const,
        sourceId: normalizeBarcode(item.barcode!),
        details: publicMetadata!.details,
      }
    : item.evidence;
  const scope = publicProduct ? `catalog#${normalizeBarcode(item.barcode!)}` : `private#${owner}`;
  const key =
    'standardization#v2#' +
    createHash('sha256')
      .update(
        JSON.stringify([
          scope,
          evidenceFingerprint(evidence),
          process.env.CLASSIFIER_MODEL,
          process.env.CLASSIFIER_REASONING_EFFORT,
        ]),
      )
      .digest('hex');
  return {
    key,
    evidence,
    barcode: publicProduct ? normalizeBarcode(item.barcode!) : undefined,
    source: publicProduct ? ('ai-catalog' as const) : ('ai-private' as const),
  };
}
async function reserveMissing(owner: string, missing: Awaited<ReturnType<typeof cacheInput>>[]) {
  for (const item of missing) {
    if (!(await claimCache(item.key)))
      throw new ProductError(409, 'Classification is already queued. Try again shortly.');
    if (item.barcode) {
      await takeQuota(`catalog-user#${owner}`, 100);
      await takeQuota('catalog-global', 1000);
    }
  }
}
export async function resolveStandardization(owner: string, input: unknown) {
  const request = standardizationRequestSchema.parse(input);
  const inputs = await Promise.all(request.items.map((item) => cacheInput(owner, item)));
  const cached = await Promise.all(inputs.map((item) => cachedResult(item.key, resultSchema)));
  if (request.mode === 'resolve')
    await Promise.all(
      inputs.map(async (item, index) => {
        const result = cached[index];
        if (item.barcode && result)
          await publishCatalog(
            item.key,
            { barcode: item.barcode, evidence: item.evidence },
            result,
          );
      }),
    );
  const missing = [
    ...new Map(
      inputs.flatMap((item, index) => (cached[index] ? [] : [[item.key, item] as const])),
    ).values(),
  ];
  const generated = new Map<string, Awaited<ReturnType<typeof classifyBatch>>[number]>();
  if (request.mode === 'resolve' && missing.length) {
    await reserveMissing(owner, missing);
    const results = await classifyBatch(
      owner,
      missing.map((item) => item.evidence),
    );
    for (const [index, result] of results.entries()) {
      const key = missing[index]!.key;
      await cacheResult(key, result, result.status === 'recognized' ? 365 : 30);
      const item = missing[index]!;
      if (item.barcode)
        await publishCatalog(key, { barcode: item.barcode, evidence: item.evidence }, result);
      generated.set(key, result);
    }
  }
  return {
    items: request.items.map((item, index) => ({
      key: item.key,
      result: cached[index] ?? generated.get(inputs[index]!.key) ?? null,
      source: inputs[index]!.source,
      reused: Boolean(cached[index]),
    })),
  };
}
