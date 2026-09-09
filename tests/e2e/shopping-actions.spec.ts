import { expect, test } from '@playwright/test';

test('shopping badge counts active rows and checked items can be discarded and undone offline', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Shopping', exact: true }).click();
  await page.getByRole('button', { name: 'Add shopping item', exact: true }).click();
  await page.getByRole('textbox', { name: 'Item name' }).fill('Eggs');
  await page.getByRole('button', { name: 'Add to list', exact: true }).click();
  await expect(page.locator('.shopping-badge')).toHaveText('1');
  await page.getByRole('checkbox', { name: 'Mark Eggs purchased' }).click();
  await expect(page.getByRole('checkbox', { name: 'Mark Eggs purchased' })).toBeChecked();
  await expect(page.locator('.shopping-badge')).toHaveCount(0);
  await page.getByRole('button', { name: 'Discard checked items' }).click();
  await expect(page.getByRole('checkbox', { name: 'Mark Eggs purchased' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Mark Eggs purchased' })).toBeChecked();
  await page.getByRole('button', { name: 'Discard checked items' }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'A fresh list' })).toBeVisible();
  await page.getByRole('button', { name: 'Kitchen', exact: true }).click();
  await page.getByRole('button', { name: 'Open fridge', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Eggs, 1 carton', exact: true })).toBeVisible();
});
