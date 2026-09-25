import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { emptySnapshot, type Food } from '../../src/domain/model';

test('storage grows beyond three rows and ignores legacy shelf assignments', async ({ page }) => {
  const data = { ...emptySnapshot(), starterVersion: 1 };
  for (const location of ['pantry', 'fridge', 'freezer'] as const) {
    for (let i = 0; i < 10; i++) {
      const food: Food = {
        id: randomUUID(),
        name: `Food ${String(i).padStart(2, '0')}`,
        art: 'milk',
        unit: 'items',
        brand: '',
        packageSize: '',
        location: location === 'freezer' ? 'fridge' : location,
        frozen: location === 'freezer',
        shelf: i % 3,
      };
      data.foods.push(food);
      data.stock.push({ id: randomUUID(), foodId: food.id, quantity: 1 });
    }
  }
  await page.addInitScript(() =>
    localStorage.setItem(
      'oidc.user:https://auth.pantridge.test:pantridge-test',
      JSON.stringify({
        access_token: 'storage-test-token',
        token_type: 'Bearer',
        scope: 'openid',
        profile: { sub: 'storage-layout-user' },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }),
    ),
  );
  await page.route('https://api.pantridge.test/v1/kitchen', (route) =>
    route.fulfill({ json: { revision: 0, data } }),
  );
  await page.route('https://api.pantridge.test/v1/mutations', (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.goto('/');
  for (const place of ['pantry', 'fridge', 'freezer']) {
    await page.getByRole('button', { name: `Open ${place}`, exact: true }).click();
    await expect(page.locator('.shelf')).toHaveCount(4);
    await expect(page.locator('.shelf').first().locator('.food-tile')).toHaveCount(3);
    await expect(page.locator('.shelf').last().locator('.food-tile')).toHaveCount(1);
    await expect(page.locator('.food-tile').first()).toContainText('Food 00');
    await expect(page.locator('.food-tile').last()).toContainText('Food 09');
    await page.getByRole('button', { name: 'Add food', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Shelf', exact: true })).toHaveCount(0);
    await page.getByLabel('Food name').fill('Zucchini');
    await page.getByRole('button', { name: `Add to ${place}`, exact: true }).click();
    await expect(page.locator('.shelf').last().locator('.food-tile')).toHaveCount(2);
    await page.getByRole('button', { name: 'Back to kitchen', exact: true }).click();
  }
});
