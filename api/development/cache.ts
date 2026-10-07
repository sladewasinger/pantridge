import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { lookupSchema, type Lookup } from '../../src/domain/products/lookup';
import { ProductError } from '../products/errors';

const recordSchema = z.object({
  ttl: z.number(),
  result: z.unknown().optional(),
  used: z.number().optional(),
  next: z.number().optional(),
});
const directory = () => process.env.LOCAL_CACHE_DIRECTORY ?? 'artifacts/local/cache';
const filename = (key: string) =>
  join(directory(), `${createHash('sha256').update(key).digest('hex')}.json`);
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work, work);
  queue = result.catch(() => undefined);
  return result;
}
async function load(key: string) {
  try {
    const record = recordSchema.parse(JSON.parse(await readFile(filename(key), 'utf8')));
    return record.ttl > Date.now() / 1000 ? record : null;
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
    return null;
  }
}
async function save(key: string, record: z.infer<typeof recordSchema>) {
  await mkdir(directory(), { recursive: true });
  const target = filename(key);
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(record), { flag: 'wx', mode: 0o600 });
  await rename(temporary, target);
}
export async function cachedResult<T>(key: string, schema: z.ZodType<T>): Promise<T | null> {
  const record = await load(key);
  const result = schema.safeParse(record?.result);
  return record && result.success ? result.data : null;
}
export function cachedProduct(key: string): Promise<Lookup | null> {
  return cachedResult(key, lookupSchema);
}
export function cacheResult(key: string, result: unknown, days: number): Promise<void> {
  return serialize(() => save(key, { result, ttl: Math.floor(Date.now() / 1000) + days * 86400 }));
}
export function cacheProduct(key: string, result: Lookup): Promise<void> {
  return cacheResult(key, result, result.found ? 30 : 1);
}
export function takeQuota(key: string, limit: number): Promise<void> {
  return serialize(async () => {
    const localLimit = localDailyLimit(key, limit);
    const datedKey = `quota#${key}#${new Date().toISOString().slice(0, 10)}`;
    const used = (await load(datedKey))?.used ?? 0;
    if (localLimit <= 0 || used >= localLimit)
      throw new ProductError(429, 'Local testing daily limit reached.');
    await save(datedKey, { used: used + 1, ttl: Math.floor(Date.now() / 1000) + 172800 });
  });
}
function localDailyLimit(key: string, limit: number): number {
  if (limit <= 0) return limit;
  return key === 'ai-user#local-development' || key === 'ai-global' ? Math.max(50, limit) : limit;
}
export function takeLookupSlot(): Promise<void> {
  return serialize(async () => {
    const key = 'upstream#openfoodfacts';
    const record = await load(key);
    if ((record?.next ?? 0) > Date.now())
      throw new ProductError(429, 'Lookup is busy. Try again in a few seconds.');
    await save(key, { next: Date.now() + 4300, ttl: Math.floor(Date.now() / 1000) + 60 });
  });
}
