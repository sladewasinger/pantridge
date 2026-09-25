import { expect, test } from '@playwright/test';

test('Back and Forward restore screens, including after an offline reload', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open fridge', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fridge', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'My kitchen' })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Fridge', exact: true })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Fridge', exact: true })).toBeVisible();
  await page.goBack();
  await page.getByRole('button', { name: 'Open pantry', exact: true }).click();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'My kitchen' })).toBeVisible();
});

test('Back closes dialogs first; typing search creates only one history step', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open fridge', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Fridge', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add food', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('searchbox').pressSequentially('black beans');
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Fridge', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to kitchen', exact: true }).click();
  await page.getByRole('button', { name: 'Shopping', exact: true }).click();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'My kitchen' })).toBeVisible();
});
