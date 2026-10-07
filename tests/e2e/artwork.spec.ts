import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { artwork } from '../../src/domain/artwork/catalog';

async function chooseOysters(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add food', exact: true }).click();
  await page.getByLabel('Food name').fill('Canned oysters');
  await page.getByRole('combobox', { name: 'Unit', exact: true }).selectOption('cans');
  await page.setViewportSize({ width: 320, height: 700 });
  const picker = page.locator('.art-picker');
  await expect(picker.getByRole('button')).toHaveCount(artwork.length);
  await page.getByRole('button', { name: 'Freezer', exact: true }).click();
  await expect(picker.getByRole('button')).toHaveCount(10);
  await page.getByRole('button', { name: 'Drinks', exact: true }).click();
  await expect(picker.getByRole('button')).toHaveCount(18);
  await page.getByRole('button', { name: 'Packaging', exact: true }).click();
  await expect(picker.getByRole('button')).toHaveCount(11);
  await page.getByRole('searchbox', { name: 'Search illustrations' }).fill('oysters');
  await expect(picker.getByRole('button')).toHaveCount(1);
  await picker.getByRole('button', { name: 'Use Plain seafood tin artwork' }).click();
  await expect(picker.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
}

test('filtered artwork editor has no accessibility violations', async ({ page }) => {
  await chooseOysters(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('artwork catalog loads, filters on mobile, and preserves a new selection', async ({
  page,
  context,
  browserName,
}) => {
  await chooseOysters(page);
  const picker = page.locator('.art-picker');
  await picker.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'artifacts/artwork-picker.png' });
  await page.getByRole('button', { name: 'Add to pantry', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => history.state.pantridge.overlay)).toBeNull();
  await page.getByRole('button', { name: 'Open pantry', exact: true }).click();
  const tile = page.getByRole('button', { name: 'Canned oysters, 1 can', exact: true });
  await expect(tile.locator('img')).toHaveAttribute('src', '/art/packaging/1/plain-tin.svg');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  if (browserName === 'chromium') await context.setOffline(true);
  await page.reload();
  await expect(tile.locator('img')).toHaveAttribute('src', '/art/packaging/1/plain-tin.svg');
  expect(
    await tile.locator('img').evaluate((img) => (img as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(0);
});

test('a new drink illustration persists and remains available without a network', async ({
  page,
  context,
  browserName,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add food', exact: true }).click();
  await page.getByLabel('Food name').fill('Yellow Chartreuse');
  await page.getByRole('combobox', { name: 'Unit', exact: true }).selectOption('bottles');
  await expect(page.locator('.art-selected')).toHaveText('Yellow Chartreuse');
  await page.getByRole('button', { name: 'Add to pantry', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open pantry', exact: true }).click();
  const tile = page.getByRole('button', { name: 'Yellow Chartreuse, 1 bottle', exact: true });
  await expect(tile.locator('img')).toHaveAttribute('src', '/art/drinks/1/yellow-chartreuse.svg');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  if (browserName === 'chromium') await context.setOffline(true);
  await page.reload();
  await expect(tile.locator('img')).toHaveAttribute('src', '/art/drinks/1/yellow-chartreuse.svg');
  await expect
    .poll(() => tile.locator('img').evaluate((img) => (img as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
});
