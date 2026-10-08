import { mkdir, appendFile } from 'node:fs/promises';
import { fixtures, shuffled } from './fixtures';
import { experimentRequest } from './provider';
import { score } from './score';
import type { Format } from './contracts';

const phase = process.argv[2] ?? 'matrix';
if (!['matrix', 'workload', 'cap', 'followup'].includes(phase))
  throw new Error('Choose matrix, workload, cap or followup');
const path = `artifacts/local/batching-${phase}-${Date.now()}.jsonl`;
await mkdir('artifacts/local', { recursive: true });
async function run(format: Format, batch: typeof fixtures, label: string, cap?: number) {
  const result = await experimentRequest(
    format,
    batch.map((item) => item.evidence),
    cap,
  );
  const report = {
    label,
    model: process.env.CLASSIFIER_MODEL,
    reasoning: process.env.CLASSIFIER_REASONING_EFFORT,
    ...result,
    score: score(batch, 'results' in result ? result.results : undefined),
  };
  await appendFile(path, JSON.stringify(report) + '\n');
  console.log(
    JSON.stringify({
      ...report,
      results: undefined,
      score: { ...report.score, errors: undefined },
    }),
  );
  return report;
}
if (phase === 'matrix') {
  for (let repeat = 0; repeat < 3; repeat++) {
    const cases = shuffled(
      [10, 40, 100, 200].flatMap((count) =>
        (['full', 'compact'] as Format[]).map((format) => ({ count, format })),
      ),
      321 + repeat,
    );
    for (const item of cases)
      await run(
        item.format,
        shuffled(fixtures.slice(0, item.count), 900 + repeat),
        `repeat-${repeat + 1}`,
      );
  }
} else if (phase === 'followup') {
  for (let repeat = 0; repeat < 2; repeat++)
    await run('compact', shuffled(fixtures.slice(0, 20), 920 + repeat), `twenty-${repeat + 1}`);
  process.env.CLASSIFIER_REASONING_EFFORT = 'none';
  for (const count of [40, 200])
    await run('compact', shuffled(fixtures.slice(0, count), 901), 'reasoning-none-exploratory');
} else if (phase === 'cap') {
  for (const format of ['full', 'compact'] as Format[])
    await run(format, shuffled(fixtures, 901), '2048-output-cap', 2048);
} else {
  const size = Number(process.argv[3] ?? 40);
  const concurrency = Number(process.argv[4] ?? 1);
  if (![10, 40, 100, 200].includes(size) || ![1, 2].includes(concurrency))
    throw new Error('Unsupported workload');
  const items = shuffled(fixtures, 987);
  const begin = Date.now();
  for (let offset = 0; offset < items.length; offset += size * concurrency)
    await Promise.all(
      Array.from({ length: concurrency }, (_, index) =>
        items.slice(offset + index * size, offset + (index + 1) * size),
      )
        .filter((batch) => batch.length)
        .map((batch, index) =>
          run('compact', batch, `workload-${size}-${concurrency}-${offset + index * size}`),
        ),
    );
  console.log(JSON.stringify({ totalElapsedMs: Date.now() - begin, size, concurrency }));
}
console.log(`Report: ${path}`);
