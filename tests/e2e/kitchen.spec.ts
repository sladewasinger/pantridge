import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function addEggs(page: Page) {
  await page.getByRole('button', { name: 'Add food', exact: true }).click();
  await page.getByLabel('Food name').fill('Test eggs');
  await page.getByRole('combobox', { name: 'Unit', exact: true }).selectOption('cartons');
  await page.getByRole('combobox', { name: 'Illustration', exact: true }).selectOption('eggs');
  await page.getByRole('combobox', { name: 'Keep in', exact: true }).selectOption('fridge');
  await page.getByRole('spinbutton', { name: 'Quantity', exact: true }).fill('2');
  await page.getByRole('button', { name: 'Add to fridge', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
test('offline inventory, shopping, and put-away survive a cold reload', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await addEggs(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'My kitchen' })).toBeVisible();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Open fridge', exact: true }).click();
  await page.getByRole('button', { name: 'Test eggs, 2 cartons', exact: true }).click();
  await page.getByRole('button', { name: 'Add to shopping list', exact: true }).click();
  await page.getByRole('button', { name: 'Shopping', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Buy 1 carton of Test eggs', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.home-stock')).toContainText('2 cartons');
  await page.getByRole('checkbox', { name: 'Mark Test eggs purchased' }).click();
  await expect(page.getByRole('checkbox', { name: 'Mark Test eggs purchased' })).toBeChecked();
  await page.reload();
  await page.getByRole('button', { name: 'Shopping', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Mark Test eggs purchased' })).toBeChecked();
  await page.getByRole('button', { name: /Put groceries away/ }).click();
  await page.getByRole('button', { name: 'Put in fridge', exact: true }).click();
  await page.getByRole('button', { name: 'Back to my kitchen', exact: true }).click();
  await page.getByRole('button', { name: 'Kitchen', exact: true }).click();
  await page.getByRole('button', { name: 'Open fridge', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Test eggs, 3 cartons', exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
});
test('depleted food disappears, remains searchable, and can move shelves', async ({ page }) => {
  await page.goto('/');
  await addEggs(page);
  await page.getByRole('button', { name: 'Open fridge', exact: true }).click();
  await page.getByRole('button', { name: 'Test eggs, 2 cartons', exact: true }).click();
  await page.getByRole('button', { name: 'Move or edit item' }).click();
  await page.getByRole('combobox', { name: 'Shelf', exact: true }).selectOption('2');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('button', { name: 'Use one', exact: true }).click();
  await page.getByRole('button', { name: 'Use one', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Test eggs,/ })).toHaveCount(0);
  await page.getByRole('searchbox').fill('Test eggs');
  await expect(page.locator('.search-result')).toContainText('0 cartons');
});
test('doors match their hinges; mobile pages have no accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open pantry', exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Open pantry', exact: true }).click();
  await expect(page.locator('.pantry .swing-door')).toHaveCount(2);
  await expect(page.locator('.door-left')).toHaveCSS('animation-name', 'door-open');
  await expect(page.locator('.door-right')).toHaveCSS('animation-name', 'door-open-right');
  await page.getByRole('button', { name: 'Back to kitchen', exact: true }).click();
  await page.getByRole('button', { name: 'Open fridge', exact: true }).click();
  const fridgeDoor = page.locator('.fridge .swing-door');
  await expect(fridgeDoor).toHaveCSS('animation-name', 'door-open-right');
  const hinge = await fridgeDoor.evaluate((door) => ({
    x: Number.parseFloat(getComputedStyle(door).transformOrigin),
    width: (door as HTMLElement).offsetWidth,
    handleLeft: getComputedStyle(door.querySelector('.door-handle')!).left,
  }));
  expect(hinge.x).toBeCloseTo(hinge.width, 0);
  expect(hinge.handleLeft).toBe('17px');
  expect(await page.evaluate(() => window.innerWidth)).toBe(page.viewportSize()?.width);
  await page.getByRole('button', { name: 'Shopping', exact: true }).click();
  await page.getByRole('button', { name: 'Add shopping item' }).click();
  await page.getByLabel('Item name').fill('Birthday candles');
  await page.getByRole('button', { name: 'Add to list', exact: true }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  for (const width of [320, 390, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
