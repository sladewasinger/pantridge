import { expect, test } from '@playwright/test';

test('new food matches artwork offline, clears uncertain matches, and respects manual choices', async ({
  page,
  context,
  browserName,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  if (browserName === 'chromium') await context.setOffline(true);
  await page.getByRole('button', { name: 'Add food', exact: true }).click();
  const name = page.getByLabel('Food name');
  const selected = page.locator('.art-selected');
  await expect(page.locator('.art-picker [aria-pressed="true"]')).toHaveCount(0);
  await name.fill('Banannas');
  await expect(selected).toHaveText('Bananas');
  await name.fill('great value sardines');
  await expect(selected).toHaveText('Plain seafood tin');
  await name.fill('Mystery food');
  await expect(selected).toHaveCount(0);
  await expect(page.locator('.art-picker [aria-pressed="true"]')).toHaveCount(0);
  await name.fill('Bananas');
  await page.getByRole('button', { name: 'Pantry', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Use Bananas artwork' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Use Apple artwork' }).click();
  await name.fill('Small bananas');
  await expect(selected).toHaveText('Apple');
  await page.getByRole('button', { name: 'Add to pantry', exact: true }).click();
  await page.getByRole('button', { name: 'Open pantry', exact: true }).click();
  const tile = page.getByRole('button', { name: 'Small bananas, 1 item', exact: true });
  await expect(tile.locator('img')).toHaveAttribute('src', '/art/apple.svg');
  await page.reload();
  await expect(tile.locator('img')).toHaveAttribute('src', '/art/apple.svg');
});
