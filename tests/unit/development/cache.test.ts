import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cacheResult, cachedResult, takeQuota } from '../../../api/development/cache';

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'pantridge-cache-test-'));
  vi.stubEnv('LOCAL_CACHE_DIRECTORY', directory);
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});
it('enforces a durable shared AI quota under concurrent requests and across module restarts', async () => {
  const results = await Promise.allSettled(
    Array.from({ length: 55 }, () => takeQuota('ai-user#local-development', 20)),
  );
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(50);
  vi.resetModules();
  const restarted = await import('../../../api/development/cache');
  await expect(restarted.takeQuota('ai-user#local-development', 20)).rejects.toMatchObject({
    status: 429,
  });
});
it('validates cached results and ignores expired entries', async () => {
  const schema = z.object({ title: z.string() });
  await cacheResult('recipe', { title: 'Beans and rice' }, 1);
  expect(await cachedResult('recipe', schema)).toEqual({ title: 'Beans and rice' });
  expect(await cachedResult('recipe', z.number())).toBeNull();
  await cacheResult('expired', { title: 'Old' }, -1);
  expect(await cachedResult('expired', schema)).toBeNull();
});
