import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { emptySnapshot, foodSchema } from '../../src/domain/model';

test('cellar continues below the kitchen, puts Storage stock first and loads deeper shelves', async ({
  page,
}) => {
  const data = { ...emptySnapshot(), starterVersion: 1 };
  for (let i = 0; i < 30; i++) {
    const food = foodSchema.parse({
      id: randomUUID(),
      name: i === 29 ? 'Napkins' : `Food ${i}`,
      unit: 'packs',
      art: i === 29 ? 'napkins' : 'generic',
      location: i === 29 ? 'unspecified' : i % 2 ? 'pantry' : 'fridge',
      shelf: 0,
      frozen: i === 0,
    });
    data.foods.push(food);
    data.stock.push({ id: randomUUID(), foodId: food.id, quantity: 1 });
  }
  await page.addInitScript(() => {
    localStorage.setItem(
      'oidc.user:https://auth.pantridge.test:pantridge-test',
      JSON.stringify({
        access_token: 'browser-test-token',
        token_type: 'Bearer',
        scope: 'openid',
        profile: { sub: 'cellar-user' },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
  });
  await page.route('https://api.pantridge.test/v1/kitchen', (route) =>
    route.fulfill({ json: { revision: 0, data } }),
  );
  await page.goto('/');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const cellar = page.getByRole('region', { name: 'Cellar inventory' });
  await expect(cellar.locator('.food-tile')).toHaveCount(24);
  await expect(cellar.locator('.underground-shelf').first().locator('.food-tile')).toHaveCount(3);
  await page.getByRole('button', { name: 'Explore cellar' }).click();
  await expect(cellar).toBeFocused();
  await expect(cellar.locator('.food-tile').first()).toHaveAttribute(
    'aria-label',
    'Napkins, 1 pack',
  );
  await expect(cellar).toHaveCSS('border-top-width', '80px');
  await expect(cellar).toHaveCSS('border-top-color', 'rgb(81, 60, 46)');
  for (const place of ['storage', 'pantry', 'fridge'])
    await expect(cellar.getByLabel(`Stored in ${place}`).first()).toBeVisible();
  await page.screenshot({ path: 'artifacts/cellar-mobile.png' });
  await page.getByRole('button', { name: 'Deeper' }).scrollIntoViewIfNeeded();
  await expect(cellar.locator('.food-tile')).toHaveCount(30);
  await expect(cellar.locator('.underground-location').last()).toHaveAttribute(
    'aria-label',
    'Stored in freezer',
  );
  const places = await cellar
    .locator('.underground-location')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('title')));
  expect(places).toEqual([
    'storage',
    ...Array(14).fill('fridge'),
    ...Array(14).fill('pantry'),
    'freezer',
  ]);
  await expect(page.getByRole('button', { name: 'Deeper' })).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Kitchen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('Storage supplies persist offline and the Undo notice expires on its own', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.clock.install();
  await page.getByRole('button', { name: 'Add storage item' }).click();
  await expect(page.getByLabel('Keep in')).toHaveValue('unspecified');
  await page.reload();
  await expect(page.getByLabel('Keep in')).toHaveValue('unspecified');
  await page.getByLabel('Supply name').fill('Napkins');
  await expect(page.getByLabel('Expiration')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add to storage', exact: true }).click();
  const tile = page.locator('.underground .food-tile').first();
  await expect(tile).toContainText('Napkins');
  await expect(tile.locator('img')).toHaveAttribute('src', '/art/household/1/napkins.svg');
  await page
    .locator('.underground')
    .getByRole('button', { name: 'Butter, 1 pack', exact: true })
    .click();
  await page.getByRole('button', { name: 'Move or edit item' }).click();
  await page.getByRole('button', { name: 'Delete food', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
  await page.clock.fastForward(9000);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
  await page.clock.fastForward(1001);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toHaveCount(0);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(tile).toContainText('Napkins');
});

test('fridge responds to desktop hover and keyboard focus', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 1100, height: 800 },
    isMobile: false,
    hasTouch: false,
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4174/');
  const fridge = page.locator('.fridge-appliance');
  await expect(fridge).toHaveCSS('transform', 'none');
  await fridge.hover();
  await expect(fridge).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -3)');
  await page.mouse.move(0, 0);
  await page.getByRole('button', { name: 'Open freezer', exact: true }).focus();
  await expect(fridge).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -3)');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await fridge.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration)),
  ).toBeLessThan(0.01);
  await context.close();
});

test('supply selection removes food suggestions and keeps existing stock metadata through edits', async ({
  page,
}) => {
  await page.goto('/');
  const cellar = page.getByRole('region', { name: 'Cellar inventory' });
  await cellar.getByRole('button', { name: 'Eggs, 1 carton', exact: true }).click();
  await page.getByLabel('Expiration for lot').fill('2027-01-02');
  await page.getByRole('button', { name: 'Move or edit item' }).click();
  await page.getByLabel('Item type').selectOption('supply');
  await expect(page.getByLabel('Supply name')).toHaveValue('Eggs');
  await expect(page.getByLabel('Keep in')).toHaveValue('unspecified');
  await expect(page.getByLabel('Keep in')).toBeDisabled();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Nutrition', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Expiration for lot')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(cellar.locator('.food-tile').first()).toHaveAttribute(
    'aria-label',
    'Eggs, 1 carton',
  );
  await expect(cellar.locator('.underground-location').first()).toHaveAttribute(
    'aria-label',
    'Stored in storage',
  );
  await page.reload();
  await cellar.getByRole('button', { name: 'Eggs, 1 carton', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Nutrition', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Move or edit item' }).click();
  await page.getByLabel('Item type').selectOption('food');
  await page.getByLabel('Keep in').selectOption('fridge');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Nutrition', exact: true })).toBeVisible();
  await expect(page.getByLabel('Expiration for lot')).toHaveValue('2027-01-02');
  await expect(page.getByRole('group', { name: 'Package 1', exact: true })).toContainText(
    '1 carton',
  );
});

test('new household artwork suggests Storage and an explicit Food choice takes priority', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add food', exact: true }).click();
  await page.getByLabel('Food name').fill('Paper towels');
  await expect(page.getByLabel('Item type')).toHaveValue('supply');
  await expect(page.getByLabel('Keep in')).toHaveValue('unspecified');
  await expect(page.getByLabel('Expiration')).toHaveCount(0);
  await page.getByLabel('Item type').selectOption('food');
  await expect(page.getByLabel('Keep in')).toBeEnabled();
  await expect(page.getByLabel('Food name')).toHaveValue('Paper towels');
  await page.getByLabel('Keep in').selectOption('pantry');
  await page.getByRole('button', { name: 'Add to pantry', exact: true }).click();
  await page.getByRole('button', { name: 'Open pantry', exact: true }).click();
  await page.getByRole('button', { name: 'Paper towels, 1 item', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Nutrition', exact: true })).toBeVisible();
});
