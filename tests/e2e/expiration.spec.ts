import { expect, test } from '@playwright/test';
import { cookbookFixture, readKitchen, seedKitchen } from './cookbook/fixtures';

test('distant shelf dates stay hidden while details retain the year and near/past lots are shown', async ({
  page,
}) => {
  const data = cookbookFixture();
  const today = new Date();
  const date = (offset: number) => {
    const value = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  };
  const distant = `${today.getFullYear() + 1}-09-27`;
  data.stock[0]!.expires = distant;
  data.stock[1]!.expires = date(1);
  await seedKitchen(page, data);
  const cellar = page.getByRole('region', { name: 'Cellar inventory' });
  await expect(cellar.getByRole('button', { name: /Eggs/ }).locator('.expiration')).toHaveCount(0);
  await expect(cellar.getByRole('button', { name: /Butter/ }).locator('.expiration')).toHaveText(
    'Tomorrow',
  );
  await page.getByRole('button', { name: 'Open fridge', exact: true }).click();
  const fridge = page.locator('.interior.fridge');
  await expect(fridge.getByRole('button', { name: /Eggs/ }).locator('.expiration')).toHaveCount(0);
  await fridge.getByRole('button', { name: /Eggs/ }).click();
  await expect(
    page.getByLabel(`Expiration for lot ${data.stock[0]!.id}`, { exact: true }),
  ).toHaveValue(distant);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  expect((await readKitchen(page)).stock).toEqual(data.stock);
  await fridge.getByRole('button', { name: /Eggs/ }).click();
  await page.getByLabel(`Expiration for lot ${data.stock[0]!.id}`, { exact: true }).fill(date(-1));
  await expect.poll(async () => (await readKitchen(page)).stock[0]!.expires).toBe(date(-1));
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(
    page.locator('.food-tile').filter({ hasText: 'Eggs' }).first().locator('.expiration'),
  ).toContainText('Past date');
});
