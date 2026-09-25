import { expect, test } from '@playwright/test';

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

for (const tab of ['Item', 'Nutrition']) {
  test(`closing ${tab} during entry removes the dialog before history traversal finishes`, async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open fridge', exact: true }).click();
    await page.getByRole('button', { name: /^Eggs,/ }).dispatchEvent('click');
    await page.getByRole('dialog').evaluate((dialog) => {
      for (const animation of dialog.getAnimations()) {
        animation.pause();
        animation.currentTime = 60;
      }
    });
    if (tab === 'Nutrition') {
      await page.getByRole('tab', { name: 'Nutrition', exact: true }).dispatchEvent('click');
      await page.getByRole('tab', { name: 'Item', exact: true }).dispatchEvent('click');
      await page.getByRole('tab', { name: 'Nutrition', exact: true }).dispatchEvent('click');
    }
    const dismissed = await page.evaluate(async () => {
      // Hold the asynchronous history traversal to exercise rapid close independently of browser timing.
      const go = history.go.bind(history);
      history.go = (delta) => {
        window.addEventListener(
          'resume-history',
          () => {
            history.go = go;
            go(delta);
          },
          { once: true },
        );
      };
      const dialog = document.querySelector<HTMLDialogElement>('dialog')!;
      const animations = dialog.getAnimations();
      dialog.querySelector<HTMLButtonElement>('[aria-label="Close"]')!.click();
      await new Promise(requestAnimationFrame);
      return {
        connected: dialog.isConnected,
        open: dialog.open,
        modalCount: document.querySelectorAll(':modal').length,
        animations: animations.map((animation) => animation.playState),
      };
    });
    expect(dismissed.connected).toBe(false);
    expect(dismissed.open).toBe(false);
    expect(dismissed.modalCount).toBe(0);
    expect(dismissed.animations.every((state) => state === 'idle')).toBe(true);
    await page.evaluate(() => window.dispatchEvent(new Event('resume-history')));
    await expect.poll(() => page.evaluate(() => history.state.pantridge.overlay)).toBeNull();
    await page.goForward();
    await expect(page.getByRole('dialog', { name: 'Eggs', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Fridge', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /^Eggs,/ }).click();
    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}
