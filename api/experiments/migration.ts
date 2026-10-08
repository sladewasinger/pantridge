import { appendFile, mkdir } from 'node:fs/promises';
import { classifyBatch } from '../standardization/classify';
import { fullConfiguration } from '../development-full/config';
import { hardFixtures, shuffled } from './fixtures';
import { score } from './score';

if (fullConfiguration().mode !== 'real') throw new Error('Real local AI configuration required.');
const path = `artifacts/local/model-migration-${Date.now()}.jsonl`;
await mkdir('artifacts/local', { recursive: true });
for (let repeat = 0; repeat < 3; repeat++) {
  const items = shuffled(hardFixtures, 610 + repeat);
  for (let offset = 0; offset < items.length; offset += 25) {
    const batch = items.slice(offset, offset + 25);
    const start = Date.now();
    let results: Awaited<ReturnType<typeof classifyBatch>> | undefined;
    let failure: string | undefined;
    try {
      results = await classifyBatch(
        'dev-model-evaluation',
        batch.map((item) => item.evidence),
      );
    } catch (error) {
      failure = error instanceof Error ? error.message : 'Request failed';
    }
    const report = {
      model: process.env.CLASSIFIER_MODEL,
      reasoning: process.env.CLASSIFIER_REASONING_EFFORT,
      repeat: repeat + 1,
      count: batch.length,
      elapsedMs: Date.now() - start,
      failure,
      score: score(batch, results),
      results,
    };
    await appendFile(path, JSON.stringify(report) + '\n');
    console.log(
      JSON.stringify({
        ...report,
        results: undefined,
        score: { ...report.score, errors: undefined },
      }),
    );
  }
}
console.log(`Report: ${path}`);
