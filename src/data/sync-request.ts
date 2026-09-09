import { envelopeSchema, type Envelope } from '../domain/model';

const api = import.meta.env.VITE_API_URL as string | undefined;
const blockedUntil = new Map<string, number>();
export const syncAllowed = (account: string) => Date.now() >= (blockedUntil.get(account) ?? 0);
export async function cloudRequest(
  account: string,
  path: string,
  token: string,
  body?: string,
): Promise<Envelope> {
  if (!syncAllowed(account))
    throw new Error('Cloud access is paused. Your changes remain on this device.');
  const response = await fetch(`${api}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body,
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  });
  if (response.status === 401) {
    blockedUntil.set(account, Date.now() + 300000);
    throw new Error('Sign in again to sync. Your changes are safe on this device.');
  }
  if (!response.ok) {
    const retry = Number(response.headers.get('Retry-After'));
    const seconds = response.status === 403 ? 3600 : Math.max(60, Math.min(retry || 300, 86400));
    blockedUntil.set(account, Date.now() + seconds * 1000);
    const error = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(error.message ?? 'Sync is unavailable. Your changes are saved on this device.');
  }
  return envelopeSchema.parse(await response.json());
}
