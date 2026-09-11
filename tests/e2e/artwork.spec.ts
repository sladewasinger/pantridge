import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { artwork } from '../../src/domain/artwork/catalog';

test('artwork catalog loads, filters on mobile, and preserves a new selection', async ({
  page,
  context,
  browserName,
}) => {
  await page.goto('/');
  const broken = await page.evaluate(
    async (sources) => {
      const checks = await Promise.all(
        sources.map(async (src) => {
          const img = new Image();
          img.src = src;
          try {
            await img.decode();
            return '';
          } catch {
            return src;
          }
        }),
      );
      return checks.filter(Boolean);
    },
    artwork.map((art) => art.src),
  );
  expect(broken).toEqual([]);
  await page.getByRole('button', { name: 'Add food', exact: true }).click();
  await page.getByLabel('Food name').fill('Canned oysters');
  await page.getByRole('combobox', { name: 'Unit', exact: true }).selectOption('cans');
  await page.setViewportSize({ width: 320, height: 700 });
  const picker = page.locator('.art-picker');
  await expect(picker.getByRole('button')).toHaveCount(artwork.length);
  await page.getByRole('button', { name: 'Freezer', exact: true }).click();
  await expect(picker.getByRole('button')).toHaveCount(10);
  await page.getByRole('button', { name: 'Packaging', exact: true }).click();
  await expect(picker.getByRole('button')).toHaveCount(8);
  await page.getByRole('searchbox', { name: 'Search illustrations' }).fill('oysters');
  await expect(picker.getByRole('button')).toHaveCount(1);
  await picker.getByRole('button', { name: 'Use Plain seafood tin artwork' }).click();
  await expect(picker.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await picker.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'artifacts/artwork-picker.png' });
  await page.getByRole('button', { name: 'Add to pantry', exact: true }).click();
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
