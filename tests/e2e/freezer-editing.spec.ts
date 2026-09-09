import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('hinged doors project in 3D without expanding the viewport and honor reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open fridge', exact: true }).click();
  await expect(page.locator('.swing-door')).toHaveCSS('animation-duration', '0.45s');
  await expect(page.locator('.swing-door')).toHaveCSS('animation-delay', '0s');
  await page
    .locator('.interior')
    .evaluate((element) => element.getAnimations().forEach((animation) => animation.finish()));
  const geometry = await page.locator('.swing-door').evaluate((door) => {
    for (const animation of door.getAnimations()) {
      animation.pause();
      const timing = animation.effect!.getTiming();
      animation.currentTime = Number(timing.delay) + Number(timing.duration) * 0.44;
    }
    const rect = door.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      originalWidth: (door as HTMLElement).offsetWidth,
      originalHeight: (door as HTMLElement).offsetHeight,
    };
  });
  expect(geometry.width).toBeLessThan(geometry.originalWidth * 0.6);
  expect(geometry.width).toBeGreaterThan(20);
  expect(geometry.height).toBeGreaterThan(geometry.originalHeight);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    page.viewportSize()?.width,
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goBack();
  await page.getByRole('button', { name: 'Open freezer', exact: true }).click();
  await expect(page.locator('.swing-door')).toHaveCSS('animation-duration', '0.001s');
  await expect(page.locator('.swing-door')).toHaveCSS('opacity', '0');
});

test('starter artwork, unit edits, and deletion persist offline', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open fridge', exact: true }).click();
  await expect(page.locator('.food-tile')).toHaveCount(3);
  await expect(page.locator('img[src="/art/butter.svg"]')).toBeVisible();
  await page.getByRole('button', { name: 'Eggs, 1 carton', exact: true }).click();
  await page.getByRole('button', { name: 'Add to shopping list', exact: true }).click();
  await page.getByRole('button', { name: 'Eggs, 1 carton', exact: true }).click();
  await page.getByRole('button', { name: 'Move or edit item' }).click();
  await page.getByRole('combobox', { name: 'Unit', exact: true }).selectOption('items');
  await page.getByRole('button', { name: 'Use Grocery bag artwork', exact: true }).click();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Eggs, 1 item', exact: true }).locator('img'),
  ).toHaveAttribute('src', '/art/generic.svg');
  await page.getByRole('button', { name: 'Butter, 1 pack', exact: true }).click();
  await page.getByRole('button', { name: 'Move or edit item' }).click();
  await page.getByRole('button', { name: 'Delete food', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: /^Butter,/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Eggs, 1 item', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Shopping', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Buy 1 item of Eggs', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Kitchen', exact: true }).click();
  await page.getByRole('button', { name: 'Open pantry', exact: true }).click();
  await expect(page.locator('.food-tile')).toHaveCount(3);
  for (const art of ['can', 'rice', 'pasta']) {
    await expect(page.locator(`img[src="/art/${art}.svg"]`)).toBeVisible();
  }
});

test('top door opens a separate freezer; frozen food stays out of the fridge', async ({ page }) => {
  await page.goto('/');
  const top = await page.getByRole('button', { name: 'Open freezer', exact: true }).boundingBox();
  const bottom = await page.getByRole('button', { name: 'Open fridge', exact: true }).boundingBox();
  expect(top!.y + top!.height).toBeLessThan(bottom!.y);
  await page.getByRole('button', { name: 'Open freezer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Freezer', exact: true })).toBeVisible();
  await expect(page.locator('.icicles')).toBeVisible();
  await expect(page.getByRole('button', { name: /Frozen/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Add food', exact: true }).click();
  await page.getByLabel('Food name').fill('Frozen peas');
  await expect(page.getByRole('combobox', { name: 'Keep in', exact: true })).toHaveValue('freezer');
  await page.getByRole('button', { name: 'Add to freezer', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Frozen peas, 1 item', exact: true }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'My kitchen' })).toBeVisible();
  await page.getByRole('button', { name: 'Open fridge', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Frozen peas,/ })).toHaveCount(0);
  await page.goBack();
  await page.getByRole('button', { name: 'Open freezer', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Frozen peas, 1 item', exact: true }),
  ).toBeVisible();
});
