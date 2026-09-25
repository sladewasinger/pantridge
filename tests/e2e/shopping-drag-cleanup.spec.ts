import { expect, test, type Page } from '@playwright/test';

async function setup(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Shopping', exact: true }).click();
  for (const name of ['Beef', 'Onions', 'Raspberries']) {
    await page.getByRole('button', { name: 'Add shopping item', exact: true }).click();
    await page.getByLabel('Item name').fill(name);
    await page.getByRole('button', { name: 'Add to list', exact: true }).click();
    await expect(page.getByRole('button', { name: `Edit ${name}`, exact: true })).toBeVisible();
  }
}

async function drag(page: Page) {
  const start = (await page.getByRole('button', { name: 'Reorder Beef' }).boundingBox())!;
  const end = (await page.locator('.shop-row').last().boundingBox())!;
  await page.mouse.move(start.x + 22, start.y + 22);
  await page.mouse.down();
  await page.mouse.move(start.x + 22, end.y + end.height - 4, { steps: 6 });
  await expect(page.locator('.shopping-drop-gap')).toBeVisible();
}

async function expectSettled(page: Page) {
  await expect(page.locator('.shopping-drop-gap, .is-dragging')).toHaveCount(0);
  expect(
    await page
      .locator('.shop-row')
      .evaluateAll((rows) =>
        rows.every(
          (row) =>
            getComputedStyle(row).transform === 'none' && getComputedStyle(row).opacity === '1',
        ),
      ),
  ).toBe(true);
}

test('a dropped row settles immediately while a slow local write is pending', async ({ page }) => {
  await setup(page);
  await page.evaluate(async () => {
    const request = indexedDB.open('pantridge-v1');
    const db = await new Promise<IDBDatabase>((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
    const tx = db.transaction('kitchens', 'readwrite');
    let hold = true;
    window.addEventListener(
      'release-storage',
      () => {
        hold = false;
      },
      { once: true },
    );
    function keepAlive() {
      tx.objectStore('kitchens').get('local').onsuccess = () => {
        if (hold) keepAlive();
      };
    }
    tx.oncomplete = () => db.close();
    keepAlive();
  });
  await drag(page);
  await page.mouse.up();
  await expectSettled(page);
  await expect(page.locator('.shop-row').last()).toContainText('Beef');
  await expect(page.getByRole('button', { name: 'Reorder Beef' })).toBeDisabled();
  await expect(page.locator('.shopping-list [role="status"]')).toHaveText('');
  await page.evaluate(() => window.dispatchEvent(new Event('release-storage')));
  await expect(page.getByRole('button', { name: 'Reorder Beef' })).toBeEnabled();
  await expect(page.locator('.shopping-list [role="status"]')).toContainText('moved to position 3');
  await page.reload();
  await expect(page.locator('.shop-row').last()).toContainText('Beef');
});

test('failed writes and canceled drags restore the saved order without floating rows', async ({
  page,
}) => {
  await setup(page);
  await drag(page);
  await page.getByRole('button', { name: 'Reorder Beef' }).dispatchEvent('pointercancel');
  await page.mouse.up();
  await expectSettled(page);
  await expect(page.locator('.shop-row').first()).toContainText('Beef');
  await page.evaluate(() => {
    const transaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args) {
      if (args[1] === 'readwrite')
        throw new DOMException('Storage unavailable for test', 'QuotaExceededError');
      return transaction.apply(this, args);
    };
  });
  await drag(page);
  await page.mouse.up();
  await expect(page.getByRole('alert')).toContainText('Storage unavailable for test');
  await expectSettled(page);
  await expect(page.locator('.shop-row').first()).toContainText('Beef');
  await page.reload();
  await expect(page.locator('.shop-row').first()).toContainText('Beef');
});
