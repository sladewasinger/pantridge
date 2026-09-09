import { z } from 'zod';
import { parseSize } from '../../src/domain/products/size';
import type { Lookup } from '../../src/domain/products/lookup';
import { boundedJson, ProductError } from './errors';
import { classifyRules } from './rules';

const text = z.string().catch('');
const responseSchema = z.object({
  product: z
    .object({
      product_name: text,
      product_name_en: text,
      generic_name_en: text,
      brands: text,
      quantity: text,
      categories_tags: z.array(z.string()).catch([]),
    })
    .optional(),
});
export async function lookupOpenFoodFacts(barcode: string) {
  const url = new URL(
    `https://world.openfoodfacts.org/api/v3/product/${barcode.replace(/^0+(?=\d{13}$)/, '')}.json`,
  );
  url.searchParams.set(
    'fields',
    'product_name,product_name_en,generic_name_en,brands,quantity,categories_tags',
  );
  const response = await fetch(url, {
    headers: {
      'User-Agent': process.env.OFF_USER_AGENT ?? 'Pantridge/1.0',
    },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok && response.status !== 404)
    throw new ProductError(
      503,
      'Product lookup is unavailable. Try again or enter the food manually.',
    );
  const parsed = response.status === 404 ? {} : responseSchema.parse(await boundedJson(response));
  return productResult(barcode, parsed.product);
}
function productResult(barcode: string, p: z.infer<typeof responseSchema>['product']) {
  const name = (p?.product_name_en || p?.product_name || '').slice(0, 160);
  const brand = (p?.brands ?? '').slice(0, 80);
  const categories = (p?.categories_tags ?? []).slice(0, 30).join(' ').slice(0, 1500);
  const { suggestion, confident } = classifyRules(name, brand, categories);
  const packageText = (p?.quantity ?? '').slice(0, 80);
  const size = parseSize(packageText);
  const result: Lookup = {
    product: { barcode, name, brand, ...(name ? { source: 'openfoodfacts' as const } : {}) },
    found: !!name,
    suggestion,
    ...(size ? { size } : {}),
    packageText,
    source: name ? 'openfoodfacts' : 'manual',
    classifiedBy: 'rules',
  };
  return { result, confident, categories };
}
