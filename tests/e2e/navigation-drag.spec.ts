import { expect, test, type Page } from '@playwright/test';

async function addBeans(page: Page) {
  await page.getByRole('button', { name: 'Add food', exact: true }).click();
  await page.getByLabel('Food name').fill('Black beans');
  await page.getByRole('combobox', { name: 'Illustration', exact: true }).selectOption('can');
  await page.getByRole('button', { name: 'Add to pantry', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open pantry', exact: true }).click();
}

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

test('dragging moves food to another shelf and persists without opening details', async ({
  page,
}) => {
  await page.goto('/');
  await addBeans(page);
  const tile = page.getByRole('button', { name: 'Black beans, 1 item', exact: true });
  const source = await tile.boundingBox();
  const destination = await page.locator('[data-shelf="2"]').boundingBox();
  if (!source || !destination) throw new Error('Missing drag target');
  await page.mouse.move(source.x + source.width / 2, source.y + 25);
  await page.mouse.down();
  await page.mouse.move(destination.x + destination.width / 2, destination.y + 40, { steps: 15 });
  await expect(page.locator('[data-shelf="2"]')).toHaveClass(/drop-target/);
  await page.mouse.up();
  await expect(page.locator('[data-shelf="2"] .food-tile')).toHaveCount(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(tile.locator('.food-label')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.reload();
  await expect(page.locator('[data-shelf="2"] .food-tile')).toHaveCount(1);
  await tile.click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('touch dragging works and a cancelled gesture does not move food', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await addBeans(page);
  const tile = page.getByRole('button', { name: 'Black beans, 1 item', exact: true });
  const source = await tile.boundingBox();
  const destination = await page.locator('[data-shelf="1"]').boundingBox();
  if (!source || !destination) throw new Error('Missing touch target');
  const cdp = await context.newCDPSession(page);
  const point = { x: source.x + source.width / 2, y: source.y + 25 };
  const end = { x: destination.x + destination.width / 2, y: destination.y + 40 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.locator('[data-shelf="0"] .food-tile')).toHaveCount(1);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('[data-shelf="1"] .food-tile')).toHaveCount(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
