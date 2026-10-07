import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { recipeRankingKitchen } from '../../fixtures/recipe-ranking-kitchen';
import { cookbookFixture, readKitchen, seedKitchen } from './fixtures';

test('kitchen matches lead, partials are separated and unrelated recipes require a toggle', async ({
  page,
}) => {
  const data = recipeRankingKitchen();
  const base = cookbookFixture().recipes![0]!;
  data.recipes = [
    { ...base, title: 'Ready eggs', ingredients: [base.ingredients[0]!] },
    {
      ...base,
      id: randomUUID(),
      title: 'My apple recipe',
      ingredients: [{ ...base.ingredients[0]!, name: 'Apples' }],
    },
  ];
  await seedKitchen(page, data);
  await page.getByRole('button', { name: 'Open cookbook', exact: true }).click();
  await expect(page.locator('.recipe-card').first()).toContainText('Ready eggs');
  await expect(page.getByRole('heading', { name: 'Partial matches', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Built-in Applesauce/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /My apple recipe/ })).toHaveCount(0);
  await page.getByText('View', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Order recipes' }).selectOption('on-hand');
  await page.getByRole('searchbox', { name: 'Find a recipe' }).fill('Black beans and rice');
  await expect(page.locator('.recipe-card')).toContainText('possible');
  await page.getByRole('button', { name: /Built-in Black beans and rice/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Possible match: Black Beans (Unsalted)');
  await expect(page.getByRole('dialog')).toContainText('Possible match: Brown Rice');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Find a recipe' }).fill('Applesauce');
  await expect(page.getByRole('heading', { name: 'No kitchen matches' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Show recipes without matches' }).check();
  await expect(page.getByRole('heading', { name: 'More recipes', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Built-in Applesauce/ })).toBeVisible();
  await page.getByRole('checkbox', { name: '30 minutes or less' }).check();
  await expect(page.getByRole('button', { name: /Built-in Applesauce/ })).toHaveCount(0);
  await page.getByRole('checkbox', { name: '30 minutes or less' }).uncheck();
  await page.getByRole('searchbox', { name: 'Find a recipe' }).fill('');
  await page.getByRole('checkbox', { name: 'Include built-in recipes' }).uncheck();
  await expect(page.locator('.recipe-card')).toHaveCount(2);
  await expect(page.locator('.recipe-card').last()).toContainText('My apple recipe');
  await page.getByRole('checkbox', { name: 'Show recipes without matches' }).uncheck();
  await expect(page.locator('.recipe-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.recipe-card')).toHaveCount(1);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect((await readKitchen(page)).stock).toEqual(data.stock);
  expect((await readKitchen(page)).recipes).toEqual(data.recipes);
});
