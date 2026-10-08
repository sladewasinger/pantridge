import { expect, test } from '@playwright/test';
import { client } from './client';
test('two devices sync real writes, process recognition, reload, and isolate a switched account', async ({
  page,
  browser,
  request,
}) => {
  const alice = await client(request);
  const unique = `Browser grocery ${crypto.randomUUID()}`;
  const second = await browser.newPage();
  let foodId: string | undefined;
  try {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Kitchen synced', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Add food', exact: true }).click();
    await page.getByRole('textbox', { name: 'Food name', exact: true }).fill(unique);
    await page.getByRole('button', { name: 'Add to pantry', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect
      .poll(async () => (await alice.read()).data.foods.find((food) => food.name === unique)?.id)
      .toBeTruthy();
    foodId = (await alice.read()).data.foods.find((food) => food.name === unique)!.id;
    await second.goto('http://127.0.0.1:5179/');
    await second.getByRole('searchbox', { name: 'Find your food' }).fill(unique);
    await expect(second.getByRole('region', { name: unique, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByText(/Food recognition ·/).click();
    await page.getByRole('button', { name: 'Process now', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Queued for processing.');
    await expect(page.getByRole('dialog')).toContainText('0 changes waiting to sync');
    await page.getByText('Test controls', { exact: true }).click();
    await page.getByRole('button', { name: 'Run due worker jobs', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Worker checked due jobs.');
    await page.getByRole('button', { name: 'Sync now', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('No food recognition pending.');
    await page.reload();
    await page.getByText('Food recognition', { exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('No food recognition pending.');
    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('combobox', { name: 'Test account' }).selectOption('dev-bob'),
    ]);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Test account' })).toHaveValue('dev-bob');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Kitchen synced', exact: true })).toBeVisible();
    await page.getByRole('searchbox', { name: 'Find your food' }).fill(unique);
    await expect(page.getByRole('region', { name: unique, exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('combobox', { name: 'Test account' }).selectOption('dev-alice'),
    ]);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Test account' })).toHaveValue('dev-alice');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Find your food' }).fill(unique);
    await expect(page.getByRole('region', { name: unique, exact: true })).toBeVisible();
  } finally {
    await second.close();
    if (foodId) await alice.mutate({ type: 'food.remove', foodId });
  }
});
