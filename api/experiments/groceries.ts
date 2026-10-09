import { appendFile, mkdir } from 'node:fs/promises';
import { classifyBatch } from '../standardization/classify';
import { resolveStandardization } from '../standardization/resolve';
import { fullConfiguration } from '../development-full/config';
import { groceryFixtures } from './grocery-fixtures';
import { shuffled } from './fixtures';
import { score } from './score';

if (fullConfiguration().mode !== 'real') throw new Error('Real local AI configuration required.');
const path = `artifacts/local/grocery-recognition-${Date.now()}.jsonl`;
await mkdir('artifacts/local', { recursive: true });
const namesOnly = process.argv.includes('names-only');
if (namesOnly) {
  const batch = groceryFixtures.slice(0, 12).map(({ evidence }) => ({ ...evidence, details: '' }));
  const start = Date.now();
  const results = await classifyBatch('dev-grocery-evaluation', batch);
  const report = {
    namesOnly: true,
    elapsedMs: Date.now() - start,
    items: batch.map((item, index) => ({ name: item.name, result: results[index] })),
  };
  await appendFile(path, JSON.stringify(report) + '\n');
  console.log(JSON.stringify(report));
}
for (let repeat = 0; repeat < (namesOnly ? 0 : 3); repeat++) {
  const batch = shuffled(groceryFixtures, 720 + repeat);
  const start = Date.now();
  let results: Awaited<ReturnType<typeof classifyBatch>> | undefined;
  let failure: string | undefined;
  try {
    results = await classifyBatch(
      'dev-grocery-evaluation',
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
  console.log(JSON.stringify({ ...report, results: undefined }));
}
// Same inputs through the real resolver: one bounded call, then persisted local cache only.
const request = {
  kind: 'standardization',
  mode: 'resolve',
  items: groceryFixtures.map(({ evidence }, index) => ({ key: String(index), evidence })),
};
for (let repeat = 0; repeat < (namesOnly ? 0 : 2); repeat++) {
  const start = Date.now();
  try {
    const response = await resolveStandardization('dev-grocery-evaluation', request);
    const report = {
      cachePass: repeat + 1,
      elapsedMs: Date.now() - start,
      reused: response.items.filter((item) => item.reused).length,
      count: response.items.length,
    };
    await appendFile(path, JSON.stringify(report) + '\n');
    console.log(JSON.stringify(report));
  } catch (error) {
    const failure = error instanceof Error ? error.message : 'Request failed';
    await appendFile(path, JSON.stringify({ cachePass: repeat + 1, failure }) + '\n');
    console.log(JSON.stringify({ cachePass: repeat + 1, failure }));
    break;
  }
}
console.log(`Report: ${path}`);
