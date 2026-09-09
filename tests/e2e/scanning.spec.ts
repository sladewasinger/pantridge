import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { emptySnapshot } from '../../src/domain/model';
import { cameraFixture } from './barcode-camera';

async function signedIn(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'oidc.user:https://auth.pantridge.test:pantridge-test',
      JSON.stringify({
        access_token: 'browser-test-token',
        token_type: 'Bearer',
        scope: 'openid',
        profile: { sub: 'scanner-test-user' },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
  });
  await page.route('https://api.pantridge.test/v1/kitchen', (route) =>
    route.fulfill({
      json: { revision: 0, data: { ...emptySnapshot(), starterVersion: 1 } },
    }),
  );
  // Keep edits pending to exercise IndexedDB durability without a real backend.
  await page.route('https://api.pantridge.test/v1/mutations', (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
}
async function scan(page: Page, code: string) {
  await page.getByRole('button', { name: 'Scan food barcode' }).click();
  await page.getByLabel('Barcode', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Find product' }).click();
  await expect(page.locator('.scan-product')).toBeVisible();
}
test('anonymous scanning is disabled while manual package sizes remain available', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sign in to scan', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Add food', exact: true }).click();
  await page.getByLabel('Food name').fill('Test Beans');
  await page.getByLabel('Size', { exact: true }).fill('15');
  await page.getByRole('button', { name: 'Add to pantry', exact: true }).click();
  await page.getByRole('searchbox').fill('Test Beans');
  await expect(page.locator('.search-result')).toContainText('15 oz');
});

test('camera decodes a barcode once and unknown products require an explicit size decision', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Synthetic canvas camera streams are exercised in Chromium.',
  );
  await signedIn(page);
  await cameraFixture(page);
  let lookups = 0;
  await page.route('https://api.pantridge.test/v1/products/resolve', (route) => {
    lookups++;
    return route.fulfill({
      json: {
        product: { barcode: '03017620422003', name: '', brand: '' },
        found: false,
        suggestion: { name: 'Unknown food', unit: 'items', art: 'generic', location: 'pantry' },
        packageText: '',
        source: 'manual',
        classifiedBy: 'rules',
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Scan food barcode' }).click();
  await page.getByRole('button', { name: 'Open camera' }).click();
  await expect(page.getByLabel('Food name')).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
  expect(lookups).toBe(1);
  await page.getByLabel('Food name').fill('Mystery beans');
  await page.getByRole('button', { name: 'Add to pantry', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Enter a size');
  await page.getByRole('checkbox', { name: 'Unspecified size' }).check();
  await page.getByRole('button', { name: 'Add to pantry', exact: true }).click();
  await expect(page.getByLabel('Barcode', { exact: true })).toBeVisible();
});
test('scanning always confirms, groups sizes, retains brands, and remembers products offline', async ({
  page,
  context,
}) => {
  await signedIn(page);
  let lookups = 0;
  await page.route('https://api.pantridge.test/v1/products/resolve', (route) => {
    lookups++;
    const code = (route.request().postDataJSON() as { barcode: string }).barcode;
    return route.fulfill({
      json: {
        product: { barcode: code, name: 'Heinz Black Beans', brand: 'Heinz' },
        found: true,
        suggestion: { name: 'Black Beans', unit: 'cans', art: 'can', location: 'pantry' },
        size: { amount: code.endsWith('8905') ? 29 : 15, measure: 'oz', packs: 1 },
        packageText: '',
        source: 'openfoodfacts',
        classifiedBy: 'rules',
      },
    });
  });
  await page.goto('/');
  await scan(page, '3017620422003');
  await expect(page.getByRole('button', { name: 'Add to pantry', exact: true })).toBeEnabled();
  await expect(page.getByRole('dialog')).toContainText('Open Food Facts');
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('dialog').evaluate((dialog) => {
    dialog.scrollTop = 0;
  });
  await page.screenshot({ path: 'artifacts/scanner-confirmation.png' });
  await page.getByRole('button', { name: 'Add to pantry', exact: true }).click();
  await expect(page.getByLabel('Barcode', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await scan(page, '012345678905');
  await page.getByRole('button', { name: 'Add to pantry', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('searchbox').fill('Black Beans');
  await expect(page.locator('.food-search-group')).toHaveCount(1);
  await expect(page.locator('.search-result')).toHaveCount(2);
  await page.getByRole('button', { name: 'Clear search' }).click();
  await page.getByRole('button', { name: 'Open pantry', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Black Beans, 15 oz, 1 can', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Black Beans, 29 oz, 1 can', exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await scan(page, '3017620422003');
  await page.getByRole('button', { name: 'Add to pantry', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Black Beans, 15 oz, 2 cans', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Black Beans, 15 oz, 2 cans', exact: true }),
  ).toBeVisible();
  expect(lookups).toBe(2);
});
