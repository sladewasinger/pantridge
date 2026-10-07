import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cookbookFixture, readKitchen, seedKitchen } from './fixtures';

test('all recipes is a compact searchable index including starters and saved recipes', async ({
  page,
}) => {
  const initial = await seedKitchen(page);
  await page.getByRole('button', { name: 'Open cookbook', exact: true }).click();
  await page.getByRole('button', { name: 'All recipes', exact: true }).click();
  const index = page.locator('.recipe-index');
  await expect(index.locator('.recipe-index-row')).toHaveCount(5);
  await expect(index).toContainText('Tomato pasta');
  await expect(index).toContainText('Built-in');
  await expect(index).toContainText('Weeknight eggs');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('searchbox', { name: 'Find a recipe' }).fill('tomato');
  await expect(index.locator('.recipe-index-row')).toHaveCount(1);
  await index.getByRole('button', { name: /Tomato pasta/ }).click();
  await expect(page.getByRole('dialog', { name: 'Tomato pasta', exact: true })).toBeVisible();
  expect((await readKitchen(page)).stock).toEqual(initial.stock);
});

test('generic recipe ingredients require a compatible stock choice before saving', async ({
  page,
}) => {
  const data = cookbookFixture();
  data.foods = ['Canned black beans', 'Canned pinto beans', 'Dried beans'].map((name) => ({
    ...data.foods[0]!,
    id: randomUUID(),
    name,
    packageSize: '400 g',
    unit: 'cans' as const,
  }));
  data.stock = data.foods.map((food) => ({ id: randomUUID(), foodId: food.id, quantity: 1 }));
  const idea = {
    ...data.recipes![0]!,
    title: 'Flexible bean bowl',
    source: 'ai',
    ingredients: [
      {
        id: randomUUID(),
        name: 'Canned beans',
        quantity: 200,
        unit: 'g',
        note: 'Drain and rinse.',
      },
    ],
    steps: ['Warm the canned beans.'],
  };
  const owner = 'grouped-recipes-test';
  await page.addInitScript(
    (subject) =>
      localStorage.setItem(
        'oidc.user:https://auth.pantridge.test:pantridge-test',
        JSON.stringify({
          access_token: 'test-token',
          token_type: 'Bearer',
          scope: 'openid',
          profile: { sub: subject },
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        }),
      ),
    owner,
  );
  await page.route('https://api.pantridge.test/v1/kitchen', (route) =>
    route.fulfill({ json: { revision: 0, data } }),
  );
  await page.route('https://api.pantridge.test/v1/mutations', (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.route('https://api.pantridge.test/v1/products/resolve', (route) => {
    const input = route.request().postDataJSON();
    expect(input.inventory).toEqual([{ name: 'Canned beans' }, { name: 'Dried beans' }]);
    return route.fulfill({ json: { recipes: [idea] } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open cookbook', exact: true }).click();
  await page.getByRole('button', { name: 'Suggest with AI', exact: true }).click();
  await page.getByRole('button', { name: 'Suggest recipes', exact: true }).click();
  await page.getByRole('button', { name: 'Review recipe', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Choose ingredients' })).toBeVisible();
  await page.getByRole('button', { name: 'Review recipe', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Choose a stocked food');
  const choice = page.getByRole('combobox', { name: 'Food for Canned beans' });
  await expect(choice.locator('option')).toHaveCount(3);
  await choice.selectOption('Canned pinto beans');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Review recipe', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(
    'Canned pinto beans',
  );
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Suggest with AI' })).toBeVisible();
  expect((await readKitchen(page, owner)).recipes).toEqual(data.recipes);
  await page.getByRole('button', { name: 'Review recipe', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Food for Canned beans' })
    .selectOption('Canned black beans');
  await page.getByRole('button', { name: 'Review recipe', exact: true }).click();
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click();
  const saved = await readKitchen(page, owner);
  expect(saved.recipes?.find((recipe) => recipe.title === idea.title)?.ingredients[0]!.name).toBe(
    'Canned black beans',
  );
  expect(saved.stock).toEqual(data.stock);
});
