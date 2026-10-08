import { readFile, writeFile, open, unlink } from 'node:fs/promises';
const day = new Date().toISOString().slice(0, 10);
const path = `artifacts/local/experiment-budget-${day}.json`;
let queue: Promise<unknown> = Promise.resolve();
export function reserveExperiment(outputTokens: number): Promise<void> {
  const next = queue.then(async () => {
    const lock = await open(`${path}.lock`, 'wx');
    try {
      let budget = { calls: 0, reservedOutput: 0 };
      try {
        budget = JSON.parse(await readFile(path, 'utf8'));
      } catch (error) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
      }
      if (budget.calls >= 40 || budget.reservedOutput + outputTokens > 200000)
        throw new Error('Persistent experiment budget exhausted');
      await writeFile(
        path,
        JSON.stringify({
          calls: budget.calls + 1,
          reservedOutput: budget.reservedOutput + outputTokens,
        }),
      );
    } finally {
      await lock.close();
      await unlink(`${path}.lock`);
    }
  });
  queue = next.catch(() => undefined);
  return next;
}
