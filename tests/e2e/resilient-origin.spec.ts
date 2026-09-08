import { expect, test } from '@playwright/test';
import { serveBuild } from './build-server';

test('cached kitchen and shopping survive reloads when the origin is unavailable', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'webkit', 'Chromium covers device disconnection in the main suite.');
  const server = await serveBuild();
  try {
    await page.goto(server.url);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await page.getByRole('button', { name: 'Shopping', exact: true }).click();
    await page.getByRole('button', { name: 'Add your first item' }).click();
    await page.getByLabel('Item name').fill('Eggs');
    await page.getByRole('button', { name: 'Add to list', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await server.stop();
    await page.reload();
    await page.getByRole('checkbox', { name: 'Mark Eggs purchased' }).click();
    await expect(page.getByRole('checkbox', { name: 'Mark Eggs purchased' })).toBeChecked();
    await page.reload();
    await expect(page.getByRole('checkbox', { name: 'Mark Eggs purchased' })).toBeChecked();
    await page.getByRole('button', { name: /Put groceries away/ }).click();
    await page.getByRole('button', { name: 'Put in fridge', exact: true }).click();
    await page.getByRole('button', { name: 'Back to my kitchen', exact: true }).click();
    await page.getByRole('button', { name: 'Kitchen', exact: true }).click();
    await page.getByRole('button', { name: 'Open fridge', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Eggs, 2 cartons', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Eggs, 2 cartons', exact: true })).toBeVisible();
    await expect(page.locator('img[src="/art/eggs.svg"]')).toBeVisible();
  } finally {
    await server.stop();
  }
});
