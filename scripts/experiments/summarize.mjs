import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import console from 'node:console';
const names = process.argv.slice(2);
if (!names.length || names.some((name) => !/^batching-[\w-]+\.jsonl$/.test(name)))
  throw new Error(
    'Pass the exact report filenames to compare; unrelated experiments must not be silently combined.',
  );
const selected = names;
const rows = (
  await Promise.all(
    selected.map(async (name) =>
      (await readFile(`artifacts/local/${name}`, 'utf8'))
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => ({ ...JSON.parse(line), file: name })),
    ),
  )
).flat();
const groups = new Map();
for (const row of rows) {
  const key = `${row.label.startsWith('repeat') ? 'matrix' : row.label}/${row.format}/${row.count}/${row.reasoning}`;
  groups.set(key, [...(groups.get(key) ?? []), row]);
}
const summaries = [...groups].map(([group, records]) => {
  const completed = records.filter((row) => !row.failure);
  const times = completed.map((row) => row.elapsedMs).sort((a, b) => a - b);
  const known = records.filter((row) => row.usage);
  const tokens = known.reduce(
    (sum, row) => ({
      input: sum.input + row.usage.input_tokens,
      cached: sum.cached + (row.usage.input_tokens_details?.cached_tokens ?? 0),
      output: sum.output + row.usage.output_tokens,
    }),
    { input: 0, cached: 0, output: 0 },
  );
  const median = times.length
    ? times.length % 2
      ? times[(times.length - 1) / 2]
      : (times[times.length / 2 - 1] + times[times.length / 2]) / 2
    : null;
  return {
    group,
    attempts: records.length,
    completed: completed.length,
    failures: records.filter((row) => row.failure).map((row) => row.failure),
    medianMs: median,
    minMs: times[0],
    maxMs: times.at(-1),
    identityCorrect: completed.reduce((sum, row) => sum + row.score.identityCorrect, 0),
    scored: completed.reduce((sum, row) => sum + row.count, 0),
    hardCorrect: completed.reduce((sum, row) => sum + row.score.hardCorrect, 0),
    hardScored: completed.reduce((sum, row) => sum + row.score.hardCount, 0),
    falseRecognized: completed.reduce((sum, row) => sum + row.score.falseRecognition, 0),
    tokens,
    knownCostUsd:
      ((tokens.input - tokens.cached) * 0.2 + tokens.cached * 0.02 + tokens.output * 1.2) / 1e6,
    unknownUsageAttempts: records.length - known.length,
    maxProductionBodyBytes: Math.max(...records.map((row) => row.productionBodyBytes)),
  };
});
await writeFile('artifacts/local/batching-summary.json', JSON.stringify(summaries, null, 2));
console.log(JSON.stringify(summaries, null, 2));
