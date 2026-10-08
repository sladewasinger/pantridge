import { setTimeout } from 'node:timers/promises';
import { requestStructured as realRequest } from '../products/ai';
import { ProductError } from '../products/errors';
import { takeQuota } from './quota';
import { faults } from './faults';
import { fullConfiguration } from './config';
import { z } from 'zod';

export { apiKey } from '../products/ai';
const fixtureInput = z.array(z.object({ index: z.number(), name: z.string() }));
export async function requestStructured(
  owner: string,
  request: Parameters<typeof realRequest>[1],
): Promise<unknown> {
  const state = faults(owner);
  state.calls++;
  if (state.providerDelay) await setTimeout(state.providerDelay);
  if (state.providerFailures > 0) {
    state.providerFailures--;
    throw new ProductError(503, 'Simulated local provider failure.');
  }
  if (fullConfiguration().mode === 'real') return realRequest(owner, request);
  await takeQuota(`ai-user#${owner}`, 50);
  await takeQuota('ai-global', 50);
  if (request.name !== 'ingredient_standardization_v1')
    throw new ProductError(
      503,
      'This feature needs --real-ai. Fixture mode only simulates food recognition.',
    );
  // Explicit test vectors, never food-classification rules or production data.
  return {
    items: fixtureInput.parse(request.input).map(({ index, name }) => ({
      index,
      result:
        name === 'Brown Rice (microwaveable)'
          ? { status: 'recognized', identity: 'brown-rice', preparation: 'cooked', reason: '' }
          : {
              status: 'unknown',
              identity: null,
              preparation: 'unknown',
              reason: 'Local fixture: review this test item.',
            },
    })),
  };
}
