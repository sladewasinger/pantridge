import { writeFile, mkdir, readFile } from 'node:fs/promises';
import process from 'node:process';
import console from 'node:console';
const { fetch } = globalThis;

const products = [
  ["Ben's Original Ready Rice Whole Grain Brown", 'cooked brown rice', 'brown-rice', 'cooked'],
  ['Black Beans (Unsalted)', 'canned black beans', 'black-beans', 'canned'],
  ['Goya Low Sodium Black Beans', 'canned beans', 'black-beans', 'canned'],
  ['Minute Ready to Serve Brown Rice', 'fully cooked microwave rice', 'brown-rice', 'cooked'],
  ['Barilla Penne Rigate', 'dry wheat pasta', 'pasta', 'dry'],
  ['Quaker Old Fashioned Oats', 'rolled oats', 'rolled-oats', 'dry'],
  ['Silk Unsweet Almondmilk', 'almond beverage', 'almond-milk', 'plain'],
  ['Rice-A-Roni Chicken Flavor', 'rice and pasta seasoned mix', null, null],
  ['Black bean and rice burrito', 'prepared composite meal', null, null],
  ['Magic pantry pouch', '', null, null],
  ['Kikkoman Soy Sauce', 'soy sauce', 'soy-sauce', 'plain'],
  ['Pacific Foods Vegetable Broth', 'vegetable broth', 'vegetable-broth', 'plain'],
  ['Sargento Sharp Cheddar Shreds', 'shredded cheddar cheese', 'cheddar-cheese', 'plain'],
  ['Dole Pineapple Chunks in Juice', 'canned pineapple', 'pineapple', 'canned'],
  ['Birds Eye Steamfresh Broccoli Florets', 'frozen broccoli', 'broccoli', 'frozen'],
  ['Cinnamon Toast Crunch', 'breakfast cereal', null, null],
  ['Tomato Basil Crackers', 'crackers with tomato and basil', null, null],
  ['Clorox Disinfecting Wipes', 'household wipes', null, null],
  ['Bob’s Red Mill Teff', 'dry teff grain', null, null],
  ['S&B Golden Curry', 'curry sauce roux cubes', null, null],
  ['Gold Medal All Purpose Flour', 'wheat flour', 'all-purpose-flour', 'dry'],
  ['Thai Kitchen Coconut Milk', 'canned coconut milk', 'coconut-milk', 'canned'],
  ['StarKist Chunk Light Tuna', 'canned tuna', 'canned-tuna', 'canned'],
  ['Del Monte Whole Kernel Corn', 'canned corn', 'corn', 'canned'],
  ['Swanson Chicken Broth', 'chicken broth', 'chicken-broth', 'plain'],
];
const count = Number(process.argv[2] ?? 10);
if (![10, 25, 40, 200].includes(count)) throw new Error('Use 10, 25, 40 or 200 items.');
const distinct = process.argv.includes('--distinct');
const registry = JSON.parse(await readFile('src/domain/ingredient-matching/registry.json', 'utf8'));
const fixtures = distinct
  ? registry
      .slice(0, count)
      .map((item) => [
        `${item.label} evaluation package`,
        `Food: ${item.label}. Preparation: ${item.preparation}.`,
        item.id,
        item.preparation,
      ])
  : products;
const origin = 'http://127.0.0.1:5175';
const session = await fetch(`${origin}/api/v1/local/session`, {
  headers: { 'Sec-Fetch-Site': 'same-origin' },
});
const { token } = await session.json();
if (!token) throw new Error('Local session unavailable.');
const items = Array.from({ length: count }, (_, index) => {
  const product = fixtures[index % fixtures.length];
  return {
    key: String(index),
    evidence: {
      name: product[0],
      brand: '',
      details: product[1],
      context: 'product',
      ...(process.argv.includes('--verify-25') ? { sourceId: 'batch-25-verification-v1' } : {}),
    },
  };
});
const report = {
  count,
  uniqueInputs: Math.min(count, fixtures.length),
  syntheticRegistryPackages: distinct,
  batches: [],
  failures: 0,
  reused: 0,
  results: [],
};
for (let index = 0; index < count; index += 25) {
  const started = Date.now();
  const response = await fetch(`${origin}/api/v1/products/resolve`, {
    method: 'POST',
    headers: {
      Origin: origin,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      kind: 'standardization',
      mode: 'resolve',
      items: items.slice(index, index + 25),
    }),
  });
  const body = await response.json();
  report.batches.push({
    index,
    elapsedMs: Date.now() - started,
    status: response.status,
    ...(!response.ok ? { error: body } : {}),
  });
  if (!response.ok) {
    report.failures++;
    continue;
  }
  report.reused += body.items.filter((item) => item.reused).length;
  report.results.push(...body.items);
}
await mkdir('artifacts/local', { recursive: true });
await writeFile(
  `artifacts/local/standardization-${count}${distinct ? '-distinct' : ''}.json`,
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify({ ...report, results: undefined }, null, 2));
