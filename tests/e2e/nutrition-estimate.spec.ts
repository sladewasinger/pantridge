import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { emptySnapshot } from '../../src/domain/model';
const food = {
  id: randomUUID(),
  name: 'Ground beef',
  unit: 'packs' as const,
  art: 'generic' as const,
  brand: '',
  packageSize: '500 g',
  size: { amount: 500, measure: 'g' as const, packs: 1 },
  location: 'fridge' as const,
  shelf: 0,
  frozen: false,
};
// Deliberately illustrative fixture values, not a food composition reference.
const estimate = {
  source: 'ai',
  name: food.name,
  details: '90% lean, raw',
  basis: 'g',
  estimatedAt: '2026-09-25T00:00:00Z',
  assumptions: 'Test fixture assumes raw, 90% lean beef.',
  per100: {
    calories: 200,
    fat: 10,
    saturatedFat: 4,
    carbohydrates: 0,
    sugars: 0,
    fiber: null,
    protein: 20,
    sodium: 50,
  },
};
async function setup(page: Page, label = false) {
  await page.addInitScript(() =>
    localStorage.setItem(
      'oidc.user:https://auth.pantridge.test:pantridge-test',
      JSON.stringify({
        access_token: 'nutrition-test-token',
        token_type: 'Bearer',
        scope: 'openid',
        profile: { sub: 'nutrition-estimate-user' },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }),
    ),
  );
  await page.route('https://api.pantridge.test/v1/kitchen', (route) =>
    route.fulfill({
      json: {
        revision: 0,
        data: {
          ...emptySnapshot(),
          starterVersion: 1,
          foods: [food],
          stock: [
            {
              id: randomUUID(),
              foodId: food.id,
              quantity: 1,
              ...(label
                ? {
                    product: {
                      barcode: '03017620422003',
                      name: 'Package beef',
                      brand: 'Test',
                      source: 'openfoodfacts',
                      nutrition: { per100: { calories: 180 }, basis: 'g' },
                    },
                  }
                : {}),
            },
          ],
        },
      },
    }),
  );
  await page.route('https://api.pantridge.test/v1/mutations', (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Open fridge', exact: true }).click();
  await openNutrition(page);
}
async function openNutrition(page: Page) {
  await page.getByRole('button', { name: /^Ground beef,/ }).click();
  await page.getByRole('tab', { name: 'Nutrition', exact: true }).click();
}
const estimateButton = (page: Page) =>
  page.getByRole('button', { name: 'Estimate nutrition info', exact: true });
test('manual-food nutrition estimates require review, persist offline, and support removal Undo', async ({
  page,
  context,
  browserName,
}) => {
  let calls = 0;
  await page.route('https://api.pantridge.test/v1/products/resolve', (route) => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({
      kind: 'nutrition',
      name: food.name,
      details: '90% lean, raw',
    });
    expect(route.request().headers().authorization).toBe('Bearer nutrition-test-token');
    return route.fulfill({ json: { estimate } });
  });
  await setup(page);
  await page.getByRole('textbox', { name: /Details/ }).fill('90% lean, raw');
  await estimateButton(page).click();
  await expect(page.getByRole('button', { name: 'Save estimate', exact: true })).toBeVisible();
  await expect(page.getByText(estimate.assumptions)).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await openNutrition(page);
  await expect(estimateButton(page)).toBeVisible();
  await page.getByRole('textbox', { name: /Details/ }).fill('90% lean, raw');
  await estimateButton(page).click();
  await page.getByRole('button', { name: 'Save estimate', exact: true }).click();
  await expect(page.locator('.estimate-note')).toContainText('Saved');
  await page.getByRole('button', { name: 'Whole package', exact: true }).click();
  await expect(page.locator('.nutrition-calories')).toContainText('1000');
  await page.screenshot({ path: 'artifacts/nutrition-estimate.png' });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  if (browserName === 'chromium') await context.setOffline(true);
  await page.reload();
  await page.getByRole('tab', { name: 'Nutrition', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Estimated nutrition', exact: true }),
  ).toBeVisible();
  expect(calls).toBe(2);
  await page.getByRole('button', { name: 'Remove estimate', exact: true }).click();
  await expect(estimateButton(page)).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.estimate-note')).toContainText('Saved');
});
test('nutrition estimation requires sign-in and never replaces package nutrition', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open fridge', exact: true }).click();
  await page.getByRole('button', { name: /^Eggs,/ }).click();
  await page.getByRole('tab', { name: 'Nutrition', exact: true }).click();
  await expect(estimateButton(page)).toBeDisabled();
  await expect(page.getByText('Sign in with Google to estimate nutrition.')).toBeVisible();
  await setup(page, true);
  await expect(page.getByRole('heading', { name: 'Nutrition Facts', exact: true })).toBeVisible();
  await expect(estimateButton(page)).toHaveCount(0);
});
test('closing an in-flight estimate discards late results and provider errors remain retryable', async ({
  page,
}) => {
  let release = () => {};
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route('https://api.pantridge.test/v1/products/resolve', async (route) => {
    requested = true;
    await ready;
    await route.fulfill({ json: { estimate: { ...estimate, details: '' } } });
  });
  await setup(page);
  await estimateButton(page).click();
  await expect.poll(() => requested).toBe(true);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  release();
  await openNutrition(page);
  await expect(estimateButton(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Estimated nutrition', exact: true })).toHaveCount(
    0,
  );
  await page.unroute('https://api.pantridge.test/v1/products/resolve');
  await page.route('https://api.pantridge.test/v1/products/resolve', (route) =>
    route.fulfill({ status: 429, json: { message: 'Daily AI limit reached.' } }),
  );
  await estimateButton(page).click();
  await expect(page.getByRole('alert')).toHaveText('Daily AI limit reached.');
  await expect(estimateButton(page)).toBeEnabled();
});
