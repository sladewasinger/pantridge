import { getToken } from '../../auth/session';
import { getAccount, getKitchen } from '../../data/store';
import { normalizeBarcode } from '../../domain/products/barcode';
import { rememberedProduct } from '../../domain/products/variants';
import { lookupSchema, type Lookup } from '../../domain/products/lookup';

export function requireScanAccount(account: string) {
  if (account === 'local' || getAccount() !== account)
    throw new Error('Sign in with Google to scan food.');
}
export async function resolveBarcode(code: string, account: string): Promise<Lookup> {
  requireScanAccount(account);
  const barcode = normalizeBarcode(code);
  const remembered = rememberedProduct(getKitchen().data, barcode);
  if (remembered) {
    const { food, product } = remembered;
    return {
      product,
      found: true,
      source: product.source ?? 'manual',
      classifiedBy: 'rules',
      packageText: food.packageSize,
      size: food.size,
      suggestion: {
        name: food.name,
        unit: food.unit,
        art: food.art,
        location: food.frozen ? 'freezer' : food.location,
      },
    };
  }
  if (!navigator.onLine)
    throw new Error('This barcode needs an internet connection. You can enter the food manually.');
  return requestProduct(barcode, account, 'lookup');
}
export async function refineBarcode(
  barcode: string,
  account: string,
  signal: AbortSignal,
): Promise<Lookup> {
  return requestProduct(barcode, account, 'enhance', signal);
}
async function requestProduct(
  barcode: string,
  account: string,
  stage: 'lookup' | 'enhance',
  signal?: AbortSignal,
): Promise<Lookup> {
  const api = import.meta.env.VITE_API_URL as string | undefined;
  if (!api) throw new Error('Scanning is not configured yet.');
  const token = await getToken(account);
  requireScanAccount(account);
  if (!token) throw new Error('Sign in again to scan food.');
  const response = await fetch(`${api}/v1/products/resolve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ barcode, stage }),
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(12000),
  });
  const body: unknown = await response.json();
  requireScanAccount(account);
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String(body.message)
        : 'Product lookup failed. Try again.';
    throw new Error(message);
  }
  return lookupSchema.parse(body);
}
