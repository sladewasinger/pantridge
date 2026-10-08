import { takeQuota as realQuota } from '../products/cache';
import { fullConfiguration } from './config';
export * from '../products/cache';
export async function takeQuota(key: string, limit: number): Promise<void> {
  fullConfiguration();
  return realQuota(key, key.startsWith('ai-user#') || key === 'ai-global' ? 50 : limit);
}
