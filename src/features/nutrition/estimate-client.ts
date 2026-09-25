import { getToken } from '../../auth/session';
import { getAccount } from '../../data/store';
import {
  nutritionRequestSchema,
  nutritionResultSchema,
  type NutritionRequest,
} from '../../domain/products/nutrition-estimate';

function requireAccount(account: string) {
  if (account === 'local' || account !== getAccount())
    throw new Error('Sign in with Google to estimate nutrition.');
}
export async function requestNutrition(
  request: NutritionRequest,
  account: string,
  signal: AbortSignal,
) {
  requireAccount(account);
  if (!navigator.onLine) throw new Error('Connect to the internet to estimate nutrition.');
  const api = import.meta.env.VITE_API_URL as string | undefined;
  if (!api) throw new Error('Nutrition estimation is not configured yet.');
  const token = await getToken(account);
  signal.throwIfAborted();
  requireAccount(account);
  if (!token) throw new Error('Sign in again to estimate nutrition.');
  const response = await fetch(`${api}/v1/products/resolve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    body: JSON.stringify(nutritionRequestSchema.parse(request)),
  });
  const body: unknown = await response.json();
  signal.throwIfAborted();
  requireAccount(account);
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String(body.message)
        : 'Could not estimate nutrition. Try again.';
    throw new Error(message);
  }
  const { estimate } = nutritionResultSchema.parse(body);
  if (estimate && (estimate.name !== request.name || estimate.details !== request.details))
    throw new Error('The estimate does not match this food. Try again.');
  return estimate;
}
