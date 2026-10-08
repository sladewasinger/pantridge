import { getToken } from '../../auth/session';
import { getAccount, getKitchen, updateKitchen } from '../../data/store';
import { localTesting } from '../../local-testing';
import { classificationTargets, applyClassifications } from '../../domain/standardization/targets';
import {
  standardizationResponseSchema,
  standardizationVersion,
  type SavedStandardization,
} from '../../domain/standardization/model';
import { classificationBatch, classificationRequest } from '../../domain/standardization/batch';

export async function classifyLocalBatch(): Promise<void> {
  if (!localTesting) throw new Error('Local classification is unavailable.');
  const account = getAccount();
  const targets = classificationBatch(classificationTargets(getKitchen().data));
  if (!targets.length) return;
  const token = await getToken(account);
  if (!token || getAccount() !== account) throw new Error('The kitchen changed. Try again.');
  const response = await fetch('/api/v1/products/resolve', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify(classificationRequest(targets)),
  });
  if (!response.ok) throw new Error('Classification could not finish. Try again later.');
  const parsed = standardizationResponseSchema.parse(await response.json());
  if (getAccount() !== account) throw new Error('The kitchen changed. Try again.');
  const results = new Map<string, SavedStandardization>();
  for (const item of parsed.items) {
    const target = targets.find((target) => target.key === item.key);
    if (item.result && target)
      results.set(item.key, {
        ...item.result,
        source: item.source,
        version: standardizationVersion,
        fingerprint: target.fingerprint,
      });
  }
  await updateKitchen((stored) => ({
    ...stored,
    data: applyClassifications(stored.data, results),
  }));
}
