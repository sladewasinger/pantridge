import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { emptySnapshot, type ShoppingItem } from '../../src/domain/model';

async function setup(page: Page) {
  const shopping: ShoppingItem[] = [
    ['Beef chuck brisket', '3 lb'],
    ['Red onion', ''],
    ['Raspberries', '6 oz'],
    ['Tabasco', '12 fl oz'],
    ...Array.from({ length: 8 }, (_, index) => [`Grocery ${index + 1}`, '']),
  ].map(([name, packageSize]) => ({
    id: randomUUID(),
    name: name!,
    packageSize,
    unit: 'items',
    quantity: 1,
    purchased: false,
  }));
  await page.addInitScript(() => {
    localStorage.setItem(
      'oidc.user:https://auth.pantridge.test:pantridge-test',
      JSON.stringify({
        access_token: 'shopping-test-token',
        token_type: 'Bearer',
        scope: 'openid',
        profile: { sub: 'shopping-layout-user' },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
  });
  await page.route('https://api.pantridge.test/v1/kitchen', (route) =>
    route.fulfill({
      json: { revision: 0, data: { ...emptySnapshot(), starterVersion: 1, shopping } },
    }),
  );
  await page.route('https://api.pantridge.test/v1/mutations', (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Shopping', exact: true }).click();
  await expect(page.locator('.shop-row')).toHaveCount(12);
}

test('compact shopping rows show sizes and new artwork, and mouse/keyboard ordering persists', async ({
  page,
  context,
  browserName,
}) => {
  await setup(page);
  await expect(
    page.getByRole('button', { name: 'Buy 1 × 3 lb of Beef chuck brisket' }),
  ).toBeVisible();
  const rows = page.locator('.shop-row');
  expect((await rows.first().boundingBox())!.height).toBeLessThanOrEqual(70);
  for (const name of ['Red onion', 'Raspberries', 'Tabasco']) {
    const image = page.getByRole('button', { name: `Edit ${name}`, exact: true }).locator('img');
    await expect
      .poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  }
  expect(
    (await page.locator('.purchase-target').first().boundingBox())!.height,
  ).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: 'artifacts/shopping-compact.png' });
  const start = (await page
    .getByRole('button', { name: 'Reorder Beef chuck brisket' })
    .boundingBox())!;
  const end = (await rows.nth(2).boundingBox())!;
  await page.mouse.move(start.x + 22, start.y + 22);
  await page.mouse.down();
  await page.mouse.move(start.x + 22, end.y + end.height - 4, { steps: 8 });
  await expect(page.locator('.shopping-drop-gap')).toBeVisible();
  await expect
    .poll(() => rows.nth(1).evaluate((row) => getComputedStyle(row).transform))
    .not.toBe('none');
  await page.screenshot({ path: 'artifacts/shopping-drag-gap.png' });
  await page.mouse.up();
  await expect(rows.nth(2)).toContainText('Beef chuck brisket');
  await page.getByRole('button', { name: 'Edit Beef chuck brisket' }).click();
  await page.getByRole('spinbutton', { name: 'Quantity', exact: true }).fill('2');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(rows.nth(2)).toContainText('Beef chuck brisket');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  if (browserName === 'chromium') await context.setOffline(true);
  await page.reload();
  await expect(rows.nth(2)).toContainText('Beef chuck brisket');
  await expect(
    page.getByRole('button', { name: 'Buy 2 × 3 lb of Beef chuck brisket' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Reorder Beef chuck brisket' }).press('Home');
  await expect(rows.first()).toContainText('Beef chuck brisket');
  await page.getByRole('checkbox', { name: 'Mark Red onion purchased' }).click();
  await expect(page.getByRole('checkbox', { name: 'Mark Red onion purchased' })).toBeChecked();
  await expect(rows.last()).toContainText('Red onion');
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('shopping name stays anchored when suggestions disappear and the keyboard viewport shrinks', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Shopping', exact: true }).click();
  await page.getByRole('button', { name: 'Add your first item' }).click();
  const input = page.getByLabel('Item name');
  await input.click();
  const top = (await input.boundingBox())!.y;
  await expect(page.locator('.shopping-suggestions button')).toHaveCount(6);
  await input.pressSequentially('Beef chuck brisket');
  await expect(page.locator('.shopping-suggestions button')).toHaveCount(0);
  expect(Math.abs((await input.boundingBox())!.y - top)).toBeLessThan(2);
  await page.setViewportSize({ width: 390, height: 360 });
  await input.pressSequentially(' roast');
  const bounds = (await input.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(8);
  expect(bounds.y + bounds.height).toBeLessThan(360);
  await page.getByLabel('Package size').fill('3 lb');
  await expect(page.locator('.shopping-artwork')).not.toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'Add to list', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Buy 1 × 3 lb of Beef chuck brisket roast' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit Beef chuck brisket roast' }).click();
  await expect(page.getByLabel('Package size')).toHaveValue('3 lb');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'artifacts/shopping-keyboard.png' });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('checkbox', { name: 'Mark Beef chuck brisket roast purchased' }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Mark Beef chuck brisket roast purchased' }),
  ).toBeChecked();
  await page.getByRole('button', { name: /Put groceries away/ }).click();
  await expect(page.getByLabel('Size', { exact: true })).toHaveValue('3');
  await expect(page.getByRole('combobox', { name: 'Measure', exact: true })).toHaveValue('lb');
  await page.getByRole('button', { name: 'Put in pantry', exact: true }).click();
  await expect(page.getByText('Everything in its place.')).toBeVisible();
});

test('shopping artwork matches names automatically and remembers a collapsed-picker override', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Shopping', exact: true }).click();
  await page.getByRole('button', { name: 'Add your first item' }).click();
  await page.getByLabel('Item name').fill('Raspberries');
  await expect(page.locator('.shopping-artwork summary img')).toHaveAttribute('alt', 'Raspberries');
  await expect(page.locator('.shopping-artwork')).not.toHaveAttribute('open', '');
  await page.locator('.shopping-artwork summary').click();
  await page.getByRole('button', { name: 'Use Plain box artwork', exact: true }).click();
  await page.getByLabel('Item name').fill('Fresh raspberries');
  await expect(page.locator('.shopping-artwork summary img')).toHaveAttribute('alt', 'Plain box');
  await page.getByRole('button', { name: 'Add to list', exact: true }).click();
  const image = page
    .getByRole('button', { name: 'Edit Fresh raspberries', exact: true })
    .locator('img');
  await expect(image).toHaveAttribute('src', '/art/packaging/1/plain-box.svg');
  await page.reload();
  await expect(image).toHaveAttribute('src', '/art/packaging/1/plain-box.svg');
  await page.getByRole('button', { name: 'Edit Fresh raspberries', exact: true }).click();
  await expect(page.locator('.shopping-artwork')).not.toHaveAttribute('open', '');
  await page.locator('.shopping-artwork summary').click();
  await page.getByRole('button', { name: 'Use automatic artwork' }).click();
  await expect(page.locator('.shopping-artwork summary img')).toHaveAttribute('alt', 'Raspberries');
});

test('touch dragging on the shopping handle reorders without checking or editing the item', async ({
  page,
  context,
}) => {
  await setup(page);
  const cdp = await context.newCDPSession(page);
  const grip = (await page
    .getByRole('button', { name: 'Reorder Beef chuck brisket' })
    .boundingBox())!;
  const target = (await page.locator('.shop-row').nth(2).boundingBox())!;
  const x = grip.x + 22;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: grip.y + 22 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x, y: target.y + target.height - 4 }],
  });
  await expect(page.locator('.is-dragging')).toHaveCount(1);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('.shop-row').nth(2)).toContainText('Beef chuck brisket');
  await expect(
    page.getByRole('checkbox', { name: 'Mark Beef chuck brisket purchased' }),
  ).not.toBeChecked();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const content = (await page.getByRole('button', { name: 'Edit Tabasco' }).boundingBox())!;
  const contentX = content.x + content.width / 2;
  const contentY = content.y + content.height / 2;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: contentX, y: contentY }],
  });
  for (let offset = 20; offset <= 140; offset += 20) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: contentX, y: contentY - offset }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(20);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('shopping modal pins full-width header and submit above the keyboard while fields scroll', async ({
  page,
}) => {
  await page.setViewportSize({ width: 412, height: 480 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Shopping', exact: true }).click();
  await page.getByRole('button', { name: 'Add your first item' }).click();
  const dialog = page.getByRole('dialog');
  const heading = dialog.locator('.sheet-heading');
  const footer = dialog.locator('.sheet-footer');
  const submit = page.getByRole('button', { name: 'Add to list', exact: true });
  const body = dialog.locator('.sheet-body');
  const initial = (await submit.boundingBox())!;
  expect(initial.y + initial.height).toBeLessThan(480);
  await submit.click();
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel('Item name')).toBeFocused();
  await page.getByLabel('Item name').fill('Raspberries');
  await page.locator('.shopping-artwork summary').click();
  await page.setViewportSize({ width: 320, height: 360 });
  await expect
    .poll(async () => (await footer.boundingBox())!.y + (await footer.boundingBox())!.height)
    .toBeLessThan(360);
  const headerBox = (await heading.boundingBox())!;
  const footerBox = (await footer.boundingBox())!;
  const dialogBox = (await dialog.boundingBox())!;
  expect(headerBox.width).toBeCloseTo(dialogBox.width - 2, 0);
  expect(footerBox.width).toBeCloseTo(headerBox.width, 0);
  expect(headerBox.y).toBeCloseTo(dialogBox.y + 1, 0);
  await body.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  expect((await heading.boundingBox())!.y).toBeCloseTo(headerBox.y, 0);
  expect((await footer.boundingBox())!.y).toBeCloseTo(footerBox.y, 0);
  expect(await body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(
    await heading.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(box.left + 2, box.bottom - 2));
    }),
  ).toBe(true);
  await page.screenshot({ path: 'artifacts/shopping-pinned-actions.png' });
  await page.getByLabel('Item name').focus();
  await expect
    .poll(async () => {
      const input = (await page.getByLabel('Item name').boundingBox())!;
      return input.y >= headerBox.y + headerBox.height && input.y + input.height <= footerBox.y;
    })
    .toBe(true);
  await page.getByLabel('Item name').press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit Raspberries', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Raspberries', exact: true }).click();
  await expect(
    page.locator('.sheet-footer').getByRole('button', { name: 'Save changes' }),
  ).toBeVisible();
});
