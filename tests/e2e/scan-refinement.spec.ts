import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { emptySnapshot } from '../../src/domain/model';

async function setup(page: Page, slowLookup = false, failLookup = false) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'oidc.user:https://auth.pantridge.test:pantridge-test',
      JSON.stringify({
        access_token: 'browser-test-token',
        token_type: 'Bearer',
        scope: 'openid',
        profile: { sub: 'refinement-user' },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
  });
  await page.route('https://api.pantridge.test/v1/kitchen', (route) =>
    route.fulfill({ json: { revision: 0, data: { ...emptySnapshot(), starterVersion: 1 } } }),
  );
  await page.route('https://api.pantridge.test/v1/mutations', (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let releaseLookup = () => {};
  const pendingLookup = new Promise<void>((resolve) => {
    releaseLookup = resolve;
  });
  const raw = {
    product: {
      barcode: '03017620422003',
      name: 'Brand Lentil Crisps',
      brand: 'Brand',
      source: 'openfoodfacts',
      nutrition: {
        per100: { calories: 410, sodium: 300, fat: 9, protein: 12 },
        perServing: { calories: 123, sodium: 90, fat: 2.7, protein: 3.6 },
        serving: '30 g',
      },
    },
    suggestion: { name: 'Brand Lentil Crisps', unit: 'items', art: 'generic', location: 'pantry' },
    found: true,
    size: { amount: 100, measure: 'g', packs: 1 },
    packageText: '100 g',
    source: 'openfoodfacts',
    classifiedBy: 'rules',
    enhancement: 'pending',
  };
  await page.route('https://api.pantridge.test/v1/products/resolve', async (route) => {
    if (route.request().postDataJSON().stage === 'enhance') {
      await pending;
      await route
        .fulfill({
          json: {
            ...raw,
            suggestion: {
              name: 'Lentil Crisps',
              unit: 'bags',
              art: 'plain-bag',
              location: 'freezer',
              estimatedDays: 120,
            },
            enhancement: 'complete',
            classifiedBy: 'openai',
          },
        })
        .catch(() => {});
    } else {
      if (slowLookup) await pendingLookup;
      await route.fulfill(failLookup ? { status: 503, json: {} } : { json: raw }).catch(() => {});
    }
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Scan food barcode' }).click();
  await page.getByLabel('Barcode', { exact: true }).fill('3017620422003');
  await page.getByRole('button', { name: 'Find product' }).click();
  if (!slowLookup) {
    await expect(page.locator('.scan-product')).toContainText('Brand Lentil Crisps');
    await expect(page.getByText('Refining details')).toBeAttached();
  }
  return { release, releaseLookup };
}

test('raw scan and nutrition are immediately usable while AI respects edited fields', async ({
  page,
}) => {
  const { release } = await setup(page);
  await page.getByRole('tab', { name: 'Nutrition', exact: true }).click();
  await expect(page.locator('.nutrition-calories')).toContainText('123');
  await page.getByRole('button', { name: 'Per 100 g/ml' }).click();
  await expect(page.locator('.nutrition-calories')).toContainText('410');
  await expect(page.locator('.nutrition-label')).toContainText('300 mg');
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'artifacts/nutrition-mobile.png' });
  await page.getByRole('tab', { name: 'Item', exact: true }).click();
  await page.getByLabel('Food name').fill('My Lentil Crisps');
  await page.getByRole('button', { name: 'Pantry', exact: true }).click();
  await page.getByLabel('Expiration').fill('2027-01-02');
  release();
  await expect(page.getByText('Refining details')).toHaveCount(0);
  await expect(page.getByLabel('Food name')).toHaveValue('My Lentil Crisps');
  await expect(page.getByRole('combobox', { name: 'Unit', exact: true })).toHaveValue('bags');
  await expect(page.getByLabel('Keep in')).toHaveValue('pantry');
  await expect(page.getByLabel('Expiration')).toHaveValue('2027-01-02');
  await page.getByRole('button', { name: 'Add to pantry', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.locator('.underground .food-tile').click();
  await page.getByRole('tab', { name: 'Nutrition', exact: true }).click();
  await expect(page.locator('.nutrition-calories')).toContainText('123');
  await expect(page.getByRole('link', { name: 'Open Food Facts' }).last()).toHaveAttribute(
    'href',
    'https://world.openfoodfacts.org/product/03017620422003',
  );
});

test('saving during refinement does not let late AI change the saved item', async ({ page }) => {
  const { release } = await setup(page);
  await page.getByRole('button', { name: 'Add to pantry', exact: true }).click();
  await expect(page.getByLabel('Barcode', { exact: true })).toBeVisible();
  release();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await expect(page.locator('.underground .food-tile')).toHaveCount(1);
  await expect(page.locator('.underground .food-tile')).toContainText('Brand Lentil Crisps');
  await expect(page.locator('.underground-location')).toHaveAttribute(
    'aria-label',
    'Stored in pantry',
  );
});

test('the form opens before lookup returns and both stages preserve manual fields', async ({
  page,
}) => {
  const { release, releaseLookup } = await setup(page, true);
  await expect(page.getByText('Fetching details…')).toBeVisible();
  await expect(page.getByLabel('Food name')).toBeVisible();
  await page.setViewportSize({ width: 320, height: 700 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'artifacts/scan-immediate-form.png' });
  await page.getByLabel('Food name').fill('My crisps');
  await page.getByLabel('Size', { exact: true }).fill('50');
  await page.getByRole('combobox', { name: 'Unit', exact: true }).selectOption('boxes');
  releaseLookup();
  await expect(page.getByText('Refining details')).toBeAttached();
  await expect(page.getByLabel('Food name')).toBeVisible();
  await expect(page.getByLabel('Food name')).toHaveValue('My crisps');
  await expect(page.getByLabel('Size', { exact: true })).toHaveValue('50');
  await page.getByRole('tab', { name: 'Nutrition', exact: true }).click();
  await expect(page.locator('.nutrition-calories')).toContainText('123');
  await page.getByRole('tab', { name: 'Item', exact: true }).click();
  release();
  await expect(page.getByText('Refining details')).toHaveCount(0);
  await expect(page.getByLabel('Food name')).toHaveValue('My crisps');
  await expect(page.getByRole('combobox', { name: 'Unit', exact: true })).toHaveValue('boxes');
  await expect(page.getByLabel('Size', { exact: true })).toHaveValue('50');
});

test('saving before lookup finishes cancels it and never applies its late result', async ({
  page,
}) => {
  const { releaseLookup } = await setup(page, true);
  await expect(page.getByText('Fetching details…')).toBeVisible();
  await page.getByLabel('Food name').fill('My manual food');
  await page.getByLabel('Unspecified size', { exact: true }).check();
  await page.getByRole('button', { name: 'Add to pantry', exact: true }).click();
  await expect(page.getByLabel('Barcode', { exact: true })).toBeVisible();
  releaseLookup();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await expect(page.locator('.underground .food-tile')).toHaveCount(1);
  await expect(page.locator('.underground .food-tile')).toContainText('My manual food');
});

test('failed lookup leaves manual entry usable and preserves explicit unknown size', async ({
  page,
}) => {
  const { releaseLookup } = await setup(page, true, true);
  await page.getByLabel('Food name').fill('Unknown snack');
  await page.getByLabel('Unspecified size', { exact: true }).check();
  releaseLookup();
  await expect(
    page.getByText('Lookup unavailable. You can enter the details below.'),
  ).toBeVisible();
  await expect(page.getByText('Fetching details…')).toHaveCount(0);
  await expect(page.getByLabel('Food name')).toHaveValue('Unknown snack');
  await page.getByRole('button', { name: 'Add to pantry', exact: true }).click();
  await expect(page.getByLabel('Barcode', { exact: true })).toBeVisible();
});
