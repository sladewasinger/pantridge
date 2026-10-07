import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { cookbookFixture, seedKitchen, readKitchen } from './fixtures';

test('ready rice and canned beans match locally and editing preparation survives offline reload', async ({
  page,
  context,
}) => {
  const data = cookbookFixture();
  const rice = {
    ...data.foods[0]!,
    name: 'Brown rice',
    unit: 'bags' as const,
    location: 'pantry' as const,
    packageSize: '250 g',
    size: { amount: 250, measure: 'g' as const, packs: 1 },
  };
  const beans = {
    ...data.foods[1]!,
    name: 'Black Beans (Unsalted)',
    unit: 'cans' as const,
    location: 'pantry' as const,
    packageSize: '432 g',
    size: { amount: 432, measure: 'g' as const, packs: 1 },
  };
  data.foods = [rice, beans];
  data.stock = [
    {
      id: randomUUID(),
      foodId: rice.id,
      quantity: 2,
      product: { barcode: '12345670', name: 'Microwaveable brown rice', brand: 'Test' },
    },
    { id: randomUUID(), foodId: beans.id, quantity: 1 },
  ];
  const recipe = data.recipes![0]!;
  recipe.title = 'Ready rice bowl';
  recipe.ingredients = [
    {
      ...recipe.ingredients[0]!,
      name: 'Rice',
      quantity: 100,
      unit: 'g',
      note: 'dry',
      ingredient: { id: 'rice', preparation: 'dry', basis: 'as-sold' },
    },
    { ...recipe.ingredients[1]!, name: 'Canned black beans', quantity: 100, unit: 'g' },
  ];
  const matchingRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/v1/products/resolve')) matchingRequests.push(request.url());
  });
  await seedKitchen(page, data);
  await page.getByRole('button', { name: 'Open cookbook', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Find a recipe' }).fill('Ready rice bowl');
  await page.getByRole('button', { name: /Ready rice bowl/ }).click();
  await expect(page.getByRole('dialog')).toContainText('On hand · review preparation and amount');
  await expect(page.getByRole('dialog')).not.toContainText('Need 100 g more');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const first = page.locator('.recipe-ingredient-editor').first();
  await first.getByLabel(/Note/).fill('cooked');
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('500 g on hand');
  await expect(page.getByRole('dialog')).toContainText('432 g on hand');
  expect((await readKitchen(page)).stock).toEqual(data.stock);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('dialog')).toContainText('500 g on hand');
  await page.getByRole('button', { name: 'Review cooked meal', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirm cooked & update stock' })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel without changes' }).click();
  expect((await readKitchen(page)).stock).toEqual(data.stock);
  expect(matchingRequests).toEqual([]);
  await context.setOffline(false);
});
