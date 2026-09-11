import { normalizeBarcode } from '../../src/domain/products/barcode';
import { lookupRequestSchema, type Lookup } from '../../src/domain/products/lookup';
import { cachedProduct, cacheProduct, takeQuota, takeLookupSlot } from './cache';
import { lookupOpenFoodFacts } from './openfoodfacts';
import { classifyProduct } from './classifier';
import { ProductError } from './errors';
import { artworkVersion } from '../../src/domain/artwork/catalog';

function keys(barcode: string) {
  const config = [
    artworkVersion,
    process.env.CLASSIFIER_PROVIDER ?? 'none',
    process.env.CLASSIFIER_MODEL ?? '',
    process.env.CLASSIFIER_REASONING_EFFORT ?? '',
    process.env.CLASSIFIER_MAX_OUTPUT_TOKENS ?? '200',
  ];
  return { raw: `product#raw-v2#${barcode}`, refined: `product#v4#${config.join('#')}#${barcode}` };
}
async function initial(barcode: string, key: string): Promise<Lookup> {
  const cached = await cachedProduct(key);
  if (cached) return cached;
  await takeLookupSlot();
  const { result, confident, categories } = await lookupOpenFoodFacts(barcode);
  const raw: Lookup = {
    ...result,
    categoryHints: categories,
    enhancement: result.found && !confident ? 'pending' : 'complete',
  };
  await cacheProduct(key, raw);
  return raw;
}
export async function resolveProduct(owner: string, body: string) {
  if (!process.env.PRODUCT_TABLE) throw new ProductError(503, 'Scanning is not configured yet.');
  const request = lookupRequestSchema.parse(JSON.parse(body));
  const barcode = normalizeBarcode(request.barcode);
  const key = keys(barcode);
  if (request.stage !== 'enhance') await takeQuota(`scan#${owner}`, 200);
  const cached = await cachedProduct(key.refined);
  if (cached) return cached;
  // Refinement reads trusted cache provenance, never client-supplied text or prompts.
  const raw =
    request.stage === 'enhance' ? await cachedProduct(key.raw) : await initial(barcode, key.raw);
  if (!raw) throw new ProductError(409, 'Look up this product again before refining it.');
  if (request.stage === 'lookup')
    return {
      ...raw,
      enhancement: process.env.CLASSIFIER_PROVIDER === 'openai' ? raw.enhancement : 'unavailable',
    };
  const ai =
    raw.enhancement === 'pending'
      ? await classifyProduct(raw, raw.categoryHints ?? '', owner)
      : null;
  const result: Lookup = {
    ...raw,
    suggestion: ai ?? raw.suggestion,
    classifiedBy: ai ? 'openai' : 'rules',
    enhancement: ai || raw.enhancement === 'complete' ? 'complete' : 'unavailable',
  };
  await cacheProduct(key.refined, result);
  return result;
}
