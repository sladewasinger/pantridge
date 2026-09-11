import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('deletion can be undone and quantity can be cleared before typing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open fridge', exact: true }).click();
  await page.getByRole('button', { name: 'Eggs, 1 carton', exact: true }).click();
  await page.getByRole('button', { name: 'Move or edit item' }).click();
  await page.getByRole('button', { name: 'Delete food', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Eggs, 1 carton', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Eggs, 1 carton', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Eggs, 1 carton', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add food', exact: true }).click();
  await page.getByLabel('Food name').fill('Yogurt');
  const quantity = page.getByRole('spinbutton', { name: 'Quantity', exact: true });
  await quantity.fill('');
  await expect(quantity).toHaveValue('');
  await quantity.pressSequentially('12');
  await page.getByRole('button', { name: 'Add to fridge', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Yogurt, 12 items', exact: true })).toBeVisible();
});

test('shopping search, progress, and large check targets work offline', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Shopping', exact: true }).click();
  await page.getByRole('button', { name: 'Add your first item' }).click();
  await page.getByLabel('Item name').fill('Eggs');
  await page.getByRole('button', { name: 'Add to list', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add shopping item' }).click();
  await page.getByLabel('Item name').fill('Apples');
  await page.getByRole('button', { name: 'Add to list', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.getByRole('searchbox').fill('  eggs  ');
  await expect(page.locator('.shop-row')).toHaveCount(1);
  const target = await page.locator('.purchase-target').boundingBox();
  expect(target!.width).toBeGreaterThanOrEqual(44);
  expect(target!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('checkbox', { name: 'Mark Eggs purchased' }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '1');
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.locator('.shop-row').first()).toContainText('Apples');
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Mark Eggs purchased' })).toBeChecked();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('empty shelves preselect placement and artwork buttons preview the saved item', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open freezer', exact: true }).click();
  await page.getByRole('button', { name: 'Add food to middle shelf', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Shelf', exact: true })).toHaveValue('1');
  await page.getByLabel('Food name').fill('Salmon');
  await page.getByRole('button', { name: 'Use Fish artwork', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Use Fish artwork', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 700 });
    expect(
      await page.getByRole('dialog').evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth),
    ).toBe(true);
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Add to freezer', exact: true }).click();
  await expect(page.locator('[data-shelf="1"] img')).toHaveAttribute('src', '/art/fish.svg');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('searchbox').fill(' salmon ');
  await expect(page.locator('.search-result')).toContainText('Freezer');
});
