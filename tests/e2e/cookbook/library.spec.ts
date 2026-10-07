import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cookbookFixture, openRecipe, readKitchen, seedKitchen } from './fixtures';

test('manual recipe validation, editing, search and import stay reviewable', async ({ page }) => {
  await seedKitchen(page);
  await page.getByRole('button', { name: 'Open cookbook', exact: true }).click();
  await page.getByRole('button', { name: 'Write a recipe', exact: true }).first().click();
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('textbox', { name: 'Recipe name', exact: true }).fill('My toast');
  await page
    .getByRole('group', { name: 'Ingredient 1', exact: true })
    .getByLabel('Name', { exact: true })
    .fill('Bread');
  await page.getByLabel('Amount', { exact: true }).fill('2');
  await page.getByLabel('Steps', { exact: true }).fill('Toast the bread.');
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByText('View', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Show recipes without matches' }).check();
  await page.getByText('View', { exact: true }).click();
  await page.getByRole('searchbox', { name: 'Find a recipe' }).fill('toast');
  await page.getByRole('button', { name: /My toast/ }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: 'Recipe name', exact: true }).fill('Morning toast');
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Morning toast', exact: true })).toBeVisible();
  expect(
    (await readKitchen(page)).recipes?.some((recipe) => recipe.title === 'Morning toast'),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await page.getByText('View', { exact: true }).click();
  await page.getByRole('button', { name: 'Import a recipe', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Recipe text', exact: true })
    .fill('Test soup\nServings: 2\nIngredients\n1 can tomatoes\nSteps\n1. Simmer the tomatoes.');
  await page.getByRole('button', { name: 'Review recipe', exact: true }).click();
  await expect(page.getByLabel('Note optional')).not.toHaveValue('');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect((await readKitchen(page)).recipes?.some((recipe) => recipe.title === 'Test soup')).toBe(
    false,
  );
});

test('dated plans aggregate repeated meals without sharing the same stock', async ({ page }) => {
  const data = cookbookFixture();
  data.stock[0]!.quantity = 1;
  const recipe = data.recipes![0]!;
  const date = new Date().toISOString().slice(0, 10);
  data.mealPlan = [1, 2].map(() => ({ id: randomUUID(), recipeId: recipe.id, date, servings: 2 }));
  await seedKitchen(page, data);
  await page.getByRole('button', { name: 'Open cookbook', exact: true }).click();
  await page.getByText('Shop planned meals', { exact: true }).click();
  const review = page.locator('.meal-plan-shopping');
  await expect(review).toContainText('3 items');
  await review.getByRole('button', { name: 'Add 1 shopping item', exact: true }).click();
  await expect(review.getByRole('status')).toHaveText('Added to your shopping list.');
  expect((await readKitchen(page)).shopping.map((item) => item.quantity)).toEqual([3]);
  expect((await readKitchen(page)).stock).toEqual(data.stock);
});

test('cookbook and recipe are accessible without horizontal scrolling', async ({ page }) => {
  await seedKitchen(page);
  await page.screenshot({ path: 'test-results/cookbook-kitchen.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Open cookbook', exact: true }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'test-results/cookbook-library.png', animations: 'disabled' });
  await page.getByRole('button', { name: /Weeknight eggs/ }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: 'test-results/cookbook-recipe-mobile.png',
    animations: 'disabled',
  });
  for (const width of [320, 390, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({
    path: 'test-results/cookbook-recipe-desktop.png',
    animations: 'disabled',
  });
});

test('oversized missing quantities show an error without crashing recipe view', async ({
  page,
}) => {
  const data = cookbookFixture();
  data.recipes![0]!.ingredients[0]!.quantity = 100000;
  await seedKitchen(page, data);
  await openRecipe(page);
  await page.getByText('Add missing to shopping', { exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Shopping quantity is too large');
  await expect(page.getByRole('button', { name: 'Review cooked meal' })).toBeVisible();
});

test('removing a saved recipe and its plans can be undone without stock changes', async ({
  page,
}) => {
  const data = cookbookFixture();
  data.mealPlan = [
    { id: randomUUID(), recipeId: data.recipes![0]!.id, date: '2026-10-10', servings: 2 },
  ];
  await seedKitchen(page, data);
  await openRecipe(page);
  await page.getByText('Remove saved recipe', { exact: true }).click();
  await expect(page.getByText(/This removes your saved recipe and 1 planned meal/)).toBeVisible();
  await page.getByRole('button', { name: 'Remove recipe and planned meals', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await readKitchen(page)).recipes).toEqual([]);
  expect((await readKitchen(page)).mealPlan).toEqual([]);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await readKitchen(page)).recipes?.length).toBe(1);
  expect((await readKitchen(page)).mealPlan).toEqual(data.mealPlan);
  expect((await readKitchen(page)).stock).toEqual(data.stock);
});
