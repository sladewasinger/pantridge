import { expect, test } from '@playwright/test';
import { cookbookFixture, seedKitchen, readKitchen } from './fixtures';
import { evidenceFingerprint, stockEvidence } from '../../../src/domain/standardization/evidence';

test('saved AI product recognition matches locally after offline reload without matching requests', async ({
  page,
  context,
}) => {
  const data = cookbookFixture();
  const food = data.foods[0]!;
  food.name = 'Brown rice';
  food.unit = 'bags';
  food.packageSize = '250 g';
  food.size = { amount: 250, measure: 'g', packs: 1 };
  const lot = data.stock[0]!;
  lot.product = {
    barcode: '012345678905',
    name: "Ben's Original Ready Rice Whole Grain Brown",
    brand: "Ben's Original",
  };
  lot.quantity = 2;
  lot.standardization = {
    version: '1',
    fingerprint: evidenceFingerprint(stockEvidence(food, lot)),
    source: 'ai-catalog',
    status: 'recognized',
    identity: 'brown-rice',
    preparation: 'cooked',
    reason: '',
  };
  data.recipes![0]!.title = 'Standardized rice';
  data.recipes![0]!.ingredients = [
    { id: crypto.randomUUID(), name: 'Cooked brown rice', quantity: 100, unit: 'g' },
  ];
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/v1/products/resolve')) apiRequests.push(request.url());
  });
  await seedKitchen(page, data);
  await page.getByRole('button', { name: 'Open cookbook', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Find a recipe' }).fill('Standardized rice');
  await page.getByRole('button', { name: /Standardized rice/ }).click();
  await expect(page.getByRole('dialog')).toContainText('500 g on hand');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('dialog')).toContainText('500 g on hand');
  expect((await readKitchen(page)).stock[0]!.standardization).toEqual(lot.standardization);
  expect(apiRequests).toEqual([]);
  await context.setOffline(false);
});

test('food recognition stays discoverable offline without starting an AI request', async ({
  page,
}) => {
  const data = cookbookFixture();
  data.foods[0]!.name = 'Unfamiliar branded food';
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/v1/products/resolve')) apiRequests.push(request.url());
  });
  await seedKitchen(page, data);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText(/Food recognition ·/).click();
  await expect(page.getByRole('dialog')).toContainText('Manual recipe matching works offline.');
  expect(apiRequests).toEqual([]);
});
