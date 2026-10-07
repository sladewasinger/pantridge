import { ZodError } from 'zod';
import { resolveRecipeSuggestions } from '../recipes/suggest';
import { resolveNutrition } from '../products/nutrition-estimate';
import { resolveProduct } from '../products/resolve';
import { ProductError } from '../products/errors';
import { takeQuota } from './cache';
import type { LocalResponse } from './server';

export async function localProductRequest(input: unknown): Promise<LocalResponse> {
  try {
    await takeQuota(`requests-minute#${Math.floor(Date.now() / 60_000)}`, 60);
    await takeQuota('requests-day', 240);
    let body: unknown;
    if (typeof input === 'object' && input !== null && 'kind' in input) {
      body =
        input.kind === 'recipe'
          ? await resolveRecipeSuggestions('local-development', input)
          : await resolveNutrition('local-development', input);
    } else body = await resolveProduct('local-development', JSON.stringify(input));
    return { statusCode: 200, body };
  } catch (error) {
    if (error instanceof ProductError)
      return { statusCode: error.status, body: { message: error.message } };
    if (error instanceof ZodError)
      return { statusCode: 400, body: { message: 'This request is invalid.' } };
    console.error('Local API request failed', {
      type: error instanceof Error ? error.name : 'Unknown',
    });
    return { statusCode: 503, body: { message: 'Local AI is temporarily unavailable.' } };
  }
}
