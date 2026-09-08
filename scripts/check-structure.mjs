import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ignored = new Set([
  '.git',
  'node_modules',
  '.pnpm-store',
  'dist',
  'coverage',
  '.terraform',
  '.tools',
  'artifacts',
  'test-results',
  'playwright-report',
]);
const errors = [];
async function inspect(directory) {
  const entries = (await readdir(directory, { withFileTypes: true })).filter(
    (entry) => !ignored.has(entry.name),
  );
  const files = entries.filter((entry) => entry.isFile());
  if (files.length > 20) errors.push(`${directory}: ${files.length} files (maximum 20 per folder)`);
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await inspect(file);
      continue;
    }
    if (!/\.(ts|tsx|mjs|css|tf)$/.test(file)) continue;
    const content = await readFile(file, 'utf8');
    const lines = content.split('\n').filter((line) => line.trim()).length;
    const limit = file.endsWith('.css') ? 350 : 300;
    if (lines > limit) errors.push(`${file}: ${lines} nonempty lines (maximum ${limit})`);
    if (
      file.startsWith(path.join('src', 'domain')) &&
      /\b(window|document|localStorage|fetch)\b/.test(content)
    )
      errors.push(`${file}: domain code must be platform independent`);
  }
}
await inspect('.');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('Structure passed: bounded files and folders; independent domain model.');
