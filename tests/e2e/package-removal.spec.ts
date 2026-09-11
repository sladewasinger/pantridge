import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('package deletion preserves other lots, Undo and saved changes', async ({
  page,
  context,
  browserName,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open fridge', exact: true }).click();
  await page.getByRole('button', { name: 'Eggs, 1 carton', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await page.getByRole('button', { name: 'Add a separate package' }).click();
  await expect(dialog.locator('.lot')).toHaveCount(2);
  const second = dialog.getByRole('group', { name: 'Package 2', exact: true });
  await second.getByRole('button', { name: 'Use one', exact: true }).click();
  await expect(second.locator('.lot-quantity')).toContainText('0 cartons');
  await second.getByLabel('Expiration for lot').fill('2027-01-02');
  await expect(second.getByRole('button', { name: 'Delete package 2' })).toBeEnabled();
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  const target = await second.getByRole('button', { name: 'Delete package 2' }).boundingBox();
  expect(target!.width).toBeGreaterThanOrEqual(44);
  expect(target!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: 'artifacts/package-delete-mobile.png' });
  await second.getByRole('button', { name: 'Delete package 2' }).click();
  await expect(dialog.locator('.lot')).toHaveCount(1);
  const undo = dialog.getByRole('button', { name: 'Undo', exact: true });
  await undo.focus();
  await expect(undo).toBeFocused();
  await undo.press('Enter');
  await expect(dialog.locator('.lot')).toHaveCount(2);
  await expect(second.getByLabel('Expiration for lot')).toHaveValue('2027-01-02');
  await expect(second.locator('.lot-quantity')).toContainText('0 cartons');
  await second.getByRole('button', { name: 'Delete package 2' }).click();
  await expect(dialog.locator('.lot')).toHaveCount(1);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // WebKit's simulated offline mode bypasses service workers; Chromium covers this reload offline.
  if (browserName !== 'webkit') await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Eggs, 1 carton', exact: true }).click();
  await expect(dialog.locator('.lot')).toHaveCount(1);
  await page.getByRole('button', { name: 'Delete package 1', exact: true }).click();
  await expect(dialog.locator('.lot')).toHaveCount(0);
  await expect(dialog.locator('.food-overview')).toContainText('0 cartons');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Eggs, 1 carton', exact: true })).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Find your food' }).fill('Eggs');
  await expect(page.locator('.search-result')).toContainText('0 cartons');
});
