import { apiKey } from '../products/ai';
import { takeQuota } from '../development/cache';
import { boundedJson } from '../products/errors';
import { contract, type Format } from './contracts';
import type { Evidence } from '../../src/domain/standardization/model';
import { z } from 'zod';
import { reserveExperiment } from './budget';

export const responseSchema = z.object({
  status: z.string().optional(),
  incomplete_details: z.object({ reason: z.string() }).nullish(),
  usage: z
    .object({
      input_tokens: z.number(),
      output_tokens: z.number(),
      input_tokens_details: z.object({ cached_tokens: z.number() }).optional(),
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
  error: z
    .object({ type: z.string().optional(), code: z.string().nullable().optional() })
    .nullish(),
});
export async function experimentRequest(format: Format, items: Evidence[], tokenLimit?: number) {
  if (
    process.env.PANTRIDGE_EXPERIMENT !== 'true' ||
    process.env.PRODUCT_TABLE !== 'local-only' ||
    process.env.TABLE_NAME ||
    process.env.ACCESS_TABLE
  )
    throw new Error('Experiments require isolated local configuration');
  const definition = contract(format, items.length);
  const maxOutputTokens = tokenLimit ?? definition.maxOutputTokens;
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 128 || maxOutputTokens > 12000)
    throw new Error('Experiment budget exhausted');
  await reserveExperiment(maxOutputTokens);
  await takeQuota('ai-user#local-development', 20);
  await takeQuota('ai-global', Number(process.env.CLASSIFIER_DAILY_LIMIT ?? 100));
  const key = await apiKey();
  const body = JSON.stringify({
    model: process.env.CLASSIFIER_MODEL,
    store: false,
    max_output_tokens: maxOutputTokens,
    reasoning: { effort: process.env.CLASSIFIER_REASONING_EFFORT ?? 'low' },
    instructions: definition.instructions,
    input: JSON.stringify(items.map((item, index) => ({ index, ...item }))),
    text: {
      format: {
        type: 'json_schema',
        name: `food_experiment_${format}`,
        strict: true,
        schema: definition.schema,
      },
    },
  });
  const metadata = {
    format,
    count: items.length,
    maxOutputTokens,
    requestBytes: Buffer.byteLength(body),
    productionBodyBytes: Buffer.byteLength(
      JSON.stringify({
        kind: 'standardization',
        mode: 'resolve',
        items: items.map((evidence, index) => ({ key: String(index), evidence })),
      }),
    ),
  };
  const begin = Date.now();
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body,
    });
    return {
      ...metadata,
      ...(await readOutput(response, definition)),
      elapsedMs: Date.now() - begin,
    };
  } catch (error) {
    return {
      ...metadata,
      elapsedMs: Date.now() - begin,
      failure: failureKind(error),
    };
  }
}

async function readOutput(response: Response, definition: ReturnType<typeof contract>) {
  const parsed = responseSchema.parse(await boundedJson(response));
  const observed = {
    httpStatus: response.status,
    providerStatus: parsed.status,
    incompleteReason: parsed.incomplete_details?.reason,
    usage: parsed.usage,
  };
  if (!response.ok || parsed.status !== 'completed')
    return {
      ...observed,
      failure: parsed.error?.code ?? parsed.incomplete_details?.reason ?? 'provider-error',
    };
  const text = parsed.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === 'output_text')?.text;
  try {
    return { ...observed, results: definition.decode(JSON.parse(text ?? 'null')) };
  } catch {
    return { ...observed, failure: 'invalid-output' };
  }
}
function failureKind(error: unknown): string {
  if (error instanceof z.ZodError) return 'invalid-envelope';
  if (!(error instanceof Error)) return 'transport';
  if (error.name === 'TimeoutError') return 'timeout';
  return error.message.includes('too much data') ? 'response-too-large' : 'transport';
}
