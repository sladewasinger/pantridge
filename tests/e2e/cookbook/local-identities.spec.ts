import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { cookbookFixture, seedKitchen, readKitchen } from './fixtures';

test('specific and generic rice requirements share stock without a false shopping shortfall', async ({
  page,
}) => {
  const data = cookbookFixture();
  data.foods = data.foods.map((food, index) => ({
    ...food,
    name: index ? 'White rice' : 'Brown rice',
    unit: 'bags',
    packageSize: '500 g',
    size: { amount: 500, measure: 'g', packs: 1 },
  }));
  data.stock = data.foods.map((food, index) => ({
    id: randomUUID(),
    foodId: food.id,
    quantity: 1,
    expires: index ? '2026-12-01' : '2026-10-08',
  }));
  data.recipes![0]!.title = 'Two rice test';
  data.recipes![0]!.ingredients = ['Rice', 'Brown rice'].map((name) => ({
    id: randomUUID(),
    name,
    quantity: 500,
    unit: 'g',
  }));
  await seedKitchen(page, data);
  await page.getByRole('button', { name: 'Open cookbook', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Find a recipe' }).fill('Two rice test');
  await page.getByRole('button', { name: /Two rice test/ }).click();
  await expect(page.getByRole('dialog').getByText('500 g on hand', { exact: true })).toHaveCount(2);
  await page.getByText('Add missing to shopping', { exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Nothing to add.');
  await expect(page.getByRole('button', { name: 'Add 0 shopping items' })).toBeDisabled();
  await page.getByRole('button', { name: 'Review cooked meal', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Amount used (bags)' }).nth(0)).toHaveValue(
    '1',
  );
  await expect(page.getByRole('spinbutton', { name: 'Amount used (bags)' }).nth(1)).toHaveValue(
    '1',
  );
  await page.getByRole('button', { name: 'Cancel without changes' }).click();
  expect((await readKitchen(page)).stock).toEqual(data.stock);
});

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
