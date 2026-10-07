import 'fake-indexeddb/auto';
import { afterEach, expect, it, vi } from 'vitest';
import { kitchen } from '../fixtures';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
it('keeps earlier browser kitchens separate from connected local tests', async () => {
  const key = crypto.randomUUID();
  vi.stubEnv('VITE_LOCAL_TESTING', '');
  vi.resetModules();
  const ordinary = await import('../../../src/data/database');
  await ordinary.changeKitchen(key, (current) => ({ ...current, data: kitchen() }));
  vi.stubEnv('VITE_LOCAL_TESTING', 'true');
  vi.resetModules();
  const isolated = await import('../../../src/data/database');
  expect((await isolated.readKitchen(key)).data.foods).toHaveLength(0);
  await isolated.changeKitchen(key, (current) => ({ ...current, revision: 9 }));
  expect((await ordinary.readKitchen(key)).revision).toBe(0);
});
it('cannot enable the development namespace in a production build', async () => {
  vi.stubEnv('VITE_LOCAL_TESTING', 'true');
  vi.stubEnv('DEV', false);
  vi.resetModules();
  expect((await import('../../../src/local-testing')).localTesting).toBe(false);
});
