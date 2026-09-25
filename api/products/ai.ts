import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { z } from 'zod';
import { boundedJson, ProductError } from './errors';
import { takeQuota } from './cache';

const ssm = new SSMClient({ maxAttempts: 1 });
let credential: { value: string; until: number } | undefined;
async function apiKey(): Promise<string> {
  if (credential && credential.until > Date.now()) return credential.value;
  const { Parameter } = await ssm.send(
    new GetParameterCommand({
      Name: process.env.CLASSIFIER_KEY_PARAMETER,
      WithDecryption: true,
    }),
    { abortSignal: AbortSignal.timeout(2000) },
  );
  if (!Parameter?.Value) throw new Error('AI key is not configured.');
  credential = { value: Parameter.Value, until: Date.now() + 300000 };
  return credential.value;
}
const outputSchema = z.object({
  status: z.string().optional(),
  output: z.array(
    z.object({
      content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
    }),
  ),
});
export async function requestStructured(
  owner: string,
  {
    name,
    schema,
    instructions,
    input,
  }: {
    name: string;
    schema: Record<string, unknown>;
    instructions: string;
    input: unknown;
  },
): Promise<unknown> {
  if (process.env.CLASSIFIER_PROVIDER !== 'openai') return null;
  await takeQuota(`ai-user#${owner}`, 20);
  await takeQuota('ai-global', Number(process.env.CLASSIFIER_DAILY_LIMIT ?? 100));
  try {
    const key = await apiKey();
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.CLASSIFIER_MODEL ?? 'gpt-4.1-nano',
        store: false,
        max_output_tokens: Math.max(
          128,
          Math.min(2048, Number(process.env.CLASSIFIER_MAX_OUTPUT_TOKENS ?? 200) || 200),
        ),
        ...(process.env.CLASSIFIER_REASONING_EFFORT
          ? { reasoning: { effort: process.env.CLASSIFIER_REASONING_EFFORT } }
          : {}),
        instructions,
        input: JSON.stringify(input),
        text: { format: { type: 'json_schema', name, strict: true, schema } },
      }),
    });
    if (!response.ok) throw new Error('Provider unavailable');
    const output = outputSchema.parse(await boundedJson(response));
    if (output.status && output.status !== 'completed') return null;
    const text = output.output
      .flatMap((item) => item.content ?? [])
      .find((part) => part.type === 'output_text')?.text;
    return text ? (JSON.parse(text) as unknown) : null;
  } catch {
    throw new ProductError(503, 'Estimation is temporarily unavailable. Try again later.');
  }
}
