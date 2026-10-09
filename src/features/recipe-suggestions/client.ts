import { getToken } from '../../auth/session';
import { requestSignIn } from '../../auth/errors';
import { getAccount } from '../../data/store';
import { localTesting } from '../../local-testing';
import { catalogRevision } from '../../domain/ingredient-matching/catalog-version';
import {
  recipeSuggestionRequestSchema,
  recipeSuggestionResultSchema,
  type RecipeSuggestionRequest,
} from '../../domain/recipe-suggestions/model';

function requireAccount(account: string) {
  if ((account === 'local' && !localTesting) || account !== getAccount())
    throw new Error('Sign in with Google to suggest recipes.');
}
export async function requestRecipeSuggestions(
  request: RecipeSuggestionRequest,
  account: string,
  signal: AbortSignal,
) {
  requireAccount(account);
  if (!navigator.onLine) throw new Error('Connect to the internet to suggest recipes.');
  const api = import.meta.env.VITE_API_URL as string | undefined;
  if (!api) throw new Error('Recipe suggestions are not configured yet.');
  const parsed = recipeSuggestionRequestSchema.safeParse(request);
  if (!parsed.success)
    throw new Error(
      parsed.error.issues[0]?.message ?? 'Review your ingredients before suggesting recipes.',
    );
  const input = parsed.data;
  const token = await getToken(account);
  signal.throwIfAborted();
  requireAccount(account);
  if (!token) throw new Error('Sign in again to suggest recipes.');
  const response = await fetch(`${api}/v1/products/resolve?catalogRevision=${catalogRevision}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
    body: JSON.stringify(input),
  });
  requireAccount(account);
  if (response.status === 401) throw requestSignIn(account);
  const body: unknown = await response.json();
  signal.throwIfAborted();
  requireAccount(account);
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String(body.message).slice(0, 300)
        : 'Could not suggest recipes. Try again.';
    throw new Error(message);
  }
  return recipeSuggestionResultSchema.parse(body).recipes;
}
