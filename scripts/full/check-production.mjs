import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import console from 'node:console';
async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await check(path);
    else if (/\.(js|mjs)$/.test(path)) {
      const code = await readFile(path, 'utf8');
      if (
        ['/v1/dev/session', 'Full local test', 'Local integration', 'localdevelopment'].some(
          (marker) => code.includes(marker),
        )
      )
        throw new Error(`Development integration code leaked into ${path}`);
    }
  }
}
await check('dist');
for (const directory of ['artifacts/api', 'artifacts/auth', 'artifacts/classification'])
  await check(directory);
console.log('Production bundles contain no full-local adapters or test credentials.');
