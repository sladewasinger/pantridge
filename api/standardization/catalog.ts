import { createHash } from 'node:crypto';
import { z } from 'zod';
import { cacheResult, cachedResult, findCatalog, cacheCatalogEvidence } from '../products/cache';
import {
  resultSchema,
  evidenceSchema,
  type Evidence,
  type StandardizationResult,
} from '../../src/domain/standardization/model';

const catalogRecordSchema = z.object({
  barcode: z.string(),
  name: z.string(),
  brand: z.string(),
  metadataFingerprint: z.string(),
  version: z.string(),
  result: resultSchema,
  source: z.literal('openfoodfacts'),
});
const publicEvidenceSchema = z.object({
  source: z.literal('openfoodfacts'),
  evidence: evidenceSchema,
});
export async function catalogEvidence(barcode: string) {
  return (await cachedResult(`catalog-evidence#${barcode}`, publicEvidenceSchema))?.evidence;
}
export const catalogNameKey = (name: string) =>
  createHash('sha256')
    .update(name.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' '))
    .digest('hex');
export async function publishCatalog(
  key: string,
  input: { barcode: string; evidence: Evidence },
  result: StandardizationResult,
) {
  const previous = await catalogEvidence(input.barcode);
  if (JSON.stringify(previous) !== JSON.stringify(input.evidence))
    await cacheCatalogEvidence(input.barcode, input.evidence);
  if (await cachedResult(`catalog-record#${key}`, catalogRecordSchema)) return;
  await cacheResult(
    `catalog-record#${key}`,
    {
      barcode: input.barcode,
      name: input.evidence.name,
      brand: input.evidence.brand,
      metadataFingerprint: key,
      version: '1',
      result,
      source: 'openfoodfacts',
    },
    result.status === 'recognized' ? 365 : 30,
    { classificationName: catalogNameKey(input.evidence.name) },
  );
}
export async function lookupCatalog(input: unknown) {
  const request = z
    .object({ kind: z.literal('classification-catalog'), name: z.string().trim().min(2).max(160) })
    .strict()
    .parse(input);
  const rows = await findCatalog(catalogNameKey(request.name));
  return {
    candidates: rows.flatMap((row) => {
      const parsed = catalogRecordSchema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    }),
    limit: 10,
  };
}
