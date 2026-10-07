import { z } from 'zod';
import { boundedJson } from '../products/errors';
import { suggestionOutputSchema } from '../recipes/output';

const metadataSchema = z.object({
  status: z.string().optional(),
  usage: z
    .object({
      input_tokens: z.number(),
      output_tokens: z.number(),
      output_tokens_details: z.object({ reasoning_tokens: z.number() }).optional(),
    })
    .optional(),
  output: z
    .array(
      z.object({
        content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
      }),
    )
    .optional(),
});
async function summary(response: Response) {
  try {
    const parsed = metadataSchema.parse(await boundedJson(response.clone()));
    const text = parsed.output
      ?.flatMap((item) => item.content ?? [])
      .find((item) => item.type === 'output_text')?.text;
    const recipes = text ? suggestionOutputSchema.safeParse(JSON.parse(text)) : undefined;
    return {
      providerStatus: parsed.status,
      usage: parsed.usage,
      recipeCount: recipes?.success ? recipes.data.recipes.length : undefined,
    };
  } catch {
    return {};
  }
}
// Development-only diagnostics: never log headers, prompts, response text, keys or tokens.
export function observeProvider() {
  const request = globalThis.fetch;
  globalThis.fetch = async (input, options) => {
    if (input !== 'https://api.openai.com/v1/responses') return request(input, options);
    const begin = Date.now();
    try {
      const response = await request(input, options);
      console.info('Local OpenAI request', {
        status: response.status,
        elapsed: Date.now() - begin,
        ...(await summary(response)),
      });
      return response;
    } catch (error) {
      console.info('Local OpenAI transport failed', {
        type: error instanceof Error ? error.name : 'Unknown',
        elapsed: Date.now() - begin,
      });
      throw error;
    }
  };
}
