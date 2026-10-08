import { expect, test } from '@playwright/test';
import { client } from './client';

test('open Settings immediately shows a sync failure and clears it after recovery', async ({
  page,
  request,
}) => {
  const alice = await client(request);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Kitchen synced', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.clock.install();
  await alice.post('dev/controls', { syncFailures: 1 });
  await page.getByRole('button', { name: 'Sync now', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'Simulated local sync failure. Your changes remain on this device.',
  );
  // Honor the real client cooldown, advancing only this test browser's clock.
  await page.clock.fastForward(61000);
  await page.getByRole('button', { name: 'Sync now', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Kitchen synced', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).not.toContainText('Simulated local sync failure.');
});
