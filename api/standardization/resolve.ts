import { cachedResult, cacheResult, claimCache, takeQuota } from '../products/cache';
import { ProductError } from '../products/errors';
import { publishCatalog } from './catalog';
import { resultSchema, standardizationRequestSchema } from '../../src/domain/standardization/model';
import { classifyBatch } from './classify';
import { cacheInput } from './cache-input';
import { classificationMetric } from './metrics';

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
  classificationMetric({
    event: 'cache',
    source: request.mode,
    outcome: 'success',
    hits: cached.filter(Boolean).length,
    misses: cached.filter((item) => !item).length,
  });
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
