import { expect, test } from '@playwright/test';
import { client } from './client';

test('offline grocery edits survive a reload during API outage and sync once after recovery', async ({
  page,
  context,
  request,
}) => {
  const alice = await client(request);
  const name = `Offline grocery ${crypto.randomUUID()}`;
  let foodId: string | undefined;
  try {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Kitchen synced', exact: true })).toBeVisible();
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Add food', exact: true }).click();
    await page.getByRole('textbox', { name: 'Food name', exact: true }).fill(name);
    await page.getByRole('button', { name: 'Add to pantry', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('2 changes waiting to sync');
    expect((await alice.read()).data.foods.some((food) => food.name === name)).toBe(false);
    // Vite assets remain online while the actual API is unreachable across a reload.
    await page.route('**/api/**', (route) => route.abort('connectionrefused'));
    await context.setOffline(false);
    await page.reload();
    await expect(page.getByRole('dialog')).toContainText('2 changes waiting to sync');
    await page.unroute('**/api/**');
    await page.getByRole('button', { name: 'Sync now', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('0 changes waiting to sync');
    const rows = (await alice.read()).data.foods.filter((food) => food.name === name);
    foodId = rows[0]?.id;
    expect(rows).toHaveLength(1);
  } finally {
    await context.setOffline(false);
    await page.unroute('**/api/**');
    if (foodId) await alice.mutate({ type: 'food.remove', foodId });
  }
});
