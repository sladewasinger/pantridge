import { expect, test } from '@playwright/test';
import { openRecipe, readKitchen, seedKitchen } from './fixtures';

test('cookbook history and cancelled cooking leave inventory unchanged', async ({ page }) => {
  const before = await seedKitchen(page);
  await openRecipe(page);
  await page.getByRole('button', { name: 'Review cooked meal', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirm cooked & update stock' })).toBeDisabled();
  await expect(page.getByText('After cooking: 0.8 packs')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel without changes' }).click();
  expect((await readKitchen(page)).stock).toEqual(before.stock);
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Cookbook', exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('dialog', { name: 'Weeknight eggs', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'My kitchen' })).toBeVisible();
});

test('reviewed cooking deducts exact packages once and survives offline reload', async ({
  page,
  context,
}) => {
  await seedKitchen(page);
  await openRecipe(page);
  await page.getByRole('button', { name: 'Review cooked meal', exact: true }).click();
  await page.getByRole('checkbox', { name: /I checked these amounts/ }).check();
  await page.getByRole('button', { name: 'Confirm cooked & update stock' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect(
    page.getByText('Meal recorded. Your reviewed stock changes are saved.'),
  ).toBeVisible();
  const data = await readKitchen(page);
  expect(data.stock.map((lot) => lot.quantity)).toEqual([6, 0.8]);
  expect(data.cookingHistory).toHaveLength(1);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Weeknight eggs', exact: true })).toBeVisible();
  expect((await readKitchen(page)).stock.map((lot) => lot.quantity)).toEqual([6, 0.8]);
  await context.setOffline(false);
});

test('a second tab changing stock requires a fresh review', async ({ page, context }) => {
  await seedKitchen(page);
  await openRecipe(page);
  await page.getByRole('button', { name: 'Review cooked meal', exact: true }).click();
  const other = await context.newPage();
  await other.goto('/');
  await other.getByRole('button', { name: 'Open fridge', exact: true }).click();
  await other.getByRole('button', { name: /^Eggs,/ }).click();
  await other.getByRole('button', { name: 'Use one', exact: true }).click();
  await expect(page.getByText('Your stock changed while this review was open.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm cooked & update stock' })).toBeDisabled();
  await page.getByRole('button', { name: 'Refresh amounts' }).click();
  await expect(page.getByRole('checkbox', { name: /I checked these amounts/ })).not.toBeChecked();
  await page.getByRole('checkbox', { name: /I checked these amounts/ }).check();
  await page.getByRole('button', { name: 'Confirm cooked & update stock' }).click();
  await expect(
    page.getByText('Meal recorded. Your reviewed stock changes are saved.'),
  ).toBeVisible();
  expect((await readKitchen(page)).stock.map((lot) => lot.quantity)).toEqual([5, 0.8]);
  await other.close();
});

test('planned cooking restores its serving count and completes only the reviewed meal', async ({
  page,
}) => {
  const data = await seedKitchen(page);
  const recipe = data.recipes![0]!;
  data.mealPlan = [
    { id: crypto.randomUUID(), recipeId: recipe.id, date: '2026-10-10', servings: 4 },
  ];
  await seedKitchen(page, data);
  await page.getByRole('button', { name: 'Open cookbook', exact: true }).click();
  await page.locator('.meal-plan-open').click();
  await expect(page.getByRole('spinbutton', { name: 'Servings', exact: true })).toHaveValue('4');
  await page.reload();
  await expect(page.getByRole('spinbutton', { name: 'Servings', exact: true })).toHaveValue('4');
  await page.getByRole('button', { name: 'Review cooked meal', exact: true }).click();
  await expect(page.getByText('Completes the meal planned for Oct 10.')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel without changes' }).click();
  expect((await readKitchen(page)).mealPlan).toEqual(data.mealPlan);
  expect((await readKitchen(page)).stock).toEqual(data.stock);
  await page.getByRole('button', { name: 'Review cooked meal', exact: true }).click();
  await page.getByRole('checkbox', { name: /I checked these amounts/ }).check();
  await page.getByRole('button', { name: 'Confirm cooked & update stock' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const cooked = await readKitchen(page);
  expect(cooked.stock.map((lot) => lot.quantity)).toEqual([4, 0.6]);
  expect(cooked.cookingHistory?.[0]?.servings).toBe(4);
  expect(cooked.mealPlan).toEqual([]);
  await expect(page.getByText('Shop planned meals', { exact: true })).toHaveCount(0);
});
