import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import console from 'node:console';
const { fetch, TextEncoder, performance, AbortSignal } = globalThis;

await mkdir('artifacts/local', { recursive: true });
await build({
  stdin: {
    contents: [
      "export { recipeBenchmarkKitchen } from './tests/unit/recipe-suggestions/benchmark-fixtures';",
      "export { snapshotSchema } from './src/domain/model';",
      "export { buildRecipeSuggestionRequest } from './src/domain/recipe-suggestions/inventory';",
      "export { recipeSuggestionRequestSchema, recipeSuggestionResultSchema } from './src/domain/recipe-suggestions/model';",
    ].join('\n'),
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  outfile: 'artifacts/local/benchmark-domain.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
});
const domain = await import('../../artifacts/local/benchmark-domain.mjs');
const origin = 'http://127.0.0.1:5175';
const report = [];
let nonce;
if (!process.argv.includes('--dry')) {
  const session = await fetch(`${origin}/api/v1/local/session`, {
    headers: { 'Sec-Fetch-Site': 'same-origin' },
  });
  if (!session.ok) throw new Error('Start the isolated local API before benchmarking.');
  nonce = (await session.json()).token;
}
for (const count of [10, 40, 200]) {
  const kitchen = domain.snapshotSchema.parse(domain.recipeBenchmarkKitchen(count));
  const request = domain.recipeSuggestionRequestSchema.parse(
    domain.buildRecipeSuggestionRequest(kitchen, false),
  );
  const metadata = {
    inventoryItems: kitchen.foods.length,
    distinctNames: new Set(kitchen.foods.map((food) => food.name)).size,
    groupsSent: request.inventory.length,
    requestBytes: new TextEncoder().encode(JSON.stringify(request)).length,
  };
  if (!nonce) {
    console.info(metadata);
    continue;
  }
  const started = performance.now();
  const response = await fetch(`${origin}/api/v1/products/resolve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${nonce}`,
      Origin: origin,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify(request),
  });
  const body = await response.json();
  const parsed = domain.recipeSuggestionResultSchema.safeParse(body);
  const result = {
    ...metadata,
    elapsedMs: Math.round(performance.now() - started),
    httpStatus: response.status,
    validated: response.ok && parsed.success,
    recipeCount: parsed.success ? parsed.data.recipes.length : 0,
  };
  console.info(result);
  report.push({
    ...result,
    recipes: parsed.success ? parsed.data.recipes : [],
    error: response.ok ? undefined : body.message,
  });
}
if (report.length)
  await writeFile('artifacts/local/recipe-benchmark.json', JSON.stringify(report, null, 2));
