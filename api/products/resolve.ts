import { normalizeBarcode } from '../../src/domain/products/barcode';
import { lookupRequestSchema } from '../../src/domain/products/lookup';
import { cachedProduct, cacheProduct, takeQuota, takeLookupSlot } from './cache';
import { lookupOpenFoodFacts } from './openfoodfacts';
import { classifyProduct } from './classifier';
import { ProductError } from './errors';

export async function resolveProduct(owner: string, body: string) {
  if (!process.env.PRODUCT_TABLE) throw new ProductError(503, 'Scanning is not configured yet.');
  const barcode = normalizeBarcode(lookupRequestSchema.parse(JSON.parse(body)).barcode);
  await takeQuota(`scan#${owner}`, 200);
  const key = `product#v2#${process.env.CLASSIFIER_PROVIDER ?? 'none'}#${process.env.CLASSIFIER_MODEL ?? ''}#${barcode}`;
  const cached = await cachedProduct(key);
  if (cached) return cached;
  await takeLookupSlot();
  const { result, confident, categories } = await lookupOpenFoodFacts(barcode);
  const ai = result.found && !confident ? await classifyProduct(result, categories, owner) : null;
  const resolved = ai ? { ...result, suggestion: ai, classifiedBy: 'openai' as const } : result;
  await cacheProduct(key, resolved);
  return resolved;
}
