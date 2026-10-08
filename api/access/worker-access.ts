import { getRecord } from './store';
import { AccessError, assertActive, assertEnabled } from './config';

export async function activeWorkerAccount(owner: string, signal?: AbortSignal): Promise<string> {
  assertEnabled();
  const account = await getRecord(`account#${owner}`, signal);
  if (!account || typeof account.identity !== 'string')
    throw new AccessError(401, 'Account is not admitted.');
  assertActive(account.status);
  const identity = await getRecord(`identity#${account.identity}`, signal);
  assertActive(identity?.status);
  if (identity?.owner !== owner) throw new AccessError(403, 'Account identity changed.');
  return account.identity;
}
