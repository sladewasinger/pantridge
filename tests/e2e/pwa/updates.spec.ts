import { expect, test, type Page } from '@playwright/test';
import { updateServer } from './server';

const marker = (page: Page) => page.locator('meta[name="pantridge-build"]');
async function install(page: Page, url: string) {
  await page.goto(url);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
}
async function checkForUpdate(page: Page) {
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.update());
}
async function acceptUpdate(page: Page) {
  const button = page.getByRole('button', { name: 'Update', exact: true });
  await expect(button).toBeVisible();
  await Promise.all([
    page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame()),
    button.click(),
  ]);
  await expect(button).toHaveCount(0);
}
async function cachedHtml(page: Page, revision: string) {
  return page.evaluate(async (key) => {
    for (const name of await caches.keys()) {
      const response = await (await caches.open(name)).match(`/index.html?__WB_REVISION__=${key}`);
      if (response) return response.text();
    }
    return '';
  }, revision);
}

test('update waits for installation, then preserves the kitchen through activation and origin outage', async ({
  page,
}) => {
  const server = await updateServer();
  try {
    await install(page, server.url);
    await page.getByRole('button', { name: 'Shopping', exact: true }).click();
    await page.getByRole('button', { name: 'Add your first item' }).click();
    await page.getByLabel('Item name').fill('Update test groceries');
    await page.getByRole('button', { name: 'Add to list', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => history.state.pantridge.overlay)).toBeNull();
    server.holdIndex();
    server.publish({ html: 'B', worker: 'B' });
    await checkForUpdate(page);
    await expect.poll(server.indexRequested).toBe(true);
    await expect(page.getByRole('button', { name: 'Update', exact: true })).toHaveCount(0);
    server.releaseIndex();
    await acceptUpdate(page);
    await expect(marker(page)).toHaveAttribute('content', 'B');
    await page.getByRole('button', { name: 'Shopping', exact: true }).click();
    await expect(
      page.getByRole('checkbox', { name: 'Mark Update test groceries purchased' }),
    ).toBeVisible();
    await server.stop();
    await page.reload();
    await expect(marker(page)).toHaveAttribute('content', 'B');
    await expect(
      page.getByRole('checkbox', { name: 'Mark Update test groceries purchased' }),
    ).toBeVisible();
  } finally {
    await server.stop();
  }
});

test('a fresh HTML revision recovers a worker installed during an unsafe publication', async ({
  page,
}) => {
  const server = await updateServer();
  try {
    await install(page, server.url);
    server.publish({ html: 'A', worker: 'B' });
    await checkForUpdate(page);
    await acceptUpdate(page);
    expect(await cachedHtml(page, server.revisions.B.revision)).toContain(
      'name="pantridge-build" content="A"',
    );
    server.publish({ html: 'B', worker: 'B' });
    await page.reload();
    await expect(marker(page)).toHaveAttribute('content', 'A');
    server.publish({ html: 'C', worker: 'C' });
    await checkForUpdate(page);
    await acceptUpdate(page);
    await expect(marker(page)).toHaveAttribute('content', 'C');
    expect(await cachedHtml(page, server.revisions.C.revision)).toContain(
      'name="pantridge-build" content="C"',
    );
    await page.reload();
    await expect(marker(page)).toHaveAttribute('content', 'C');
    await expect(page.getByRole('button', { name: 'Update', exact: true })).toHaveCount(0);
  } finally {
    await server.stop();
  }
});
