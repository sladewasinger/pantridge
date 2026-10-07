import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cookbookFixture, readKitchen, openRecipe, seedKitchen } from './fixtures';

const owner = 'recipe-preferences-test';
async function ideas(page: Page) {
  const data = cookbookFixture();
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
  const idea = { ...data.recipes![0]!, title: 'Suggested eggs', source: 'ai', minutes: 10 };
  const requests: unknown[] = [];
  await page.route('https://api.pantridge.test/v1/products/resolve', (route) => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ json: { recipes: [idea] } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open cookbook', exact: true }).click();
  await page.getByRole('button', { name: 'Suggest with AI', exact: true }).click();
  return { data, requests };
}
test('optional directions and dietary choices persist only in the current device kitchen', async ({
  page,
}) => {
  const { data, requests } = await ideas(page);
  await page.getByRole('button', { name: 'Quick', exact: true }).click();
  await page.getByRole('button', { name: 'High protein', exact: true }).click();
  await expect(page.getByText(/≤ 20 min/)).toBeVisible();
  await page.getByText('More preferences', { exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Time limit (min)', exact: true }).fill('15');
  await page.getByRole('textbox', { name: 'Equipment', exact: true }).fill('One skillet');
  await page.getByText('Diet & allergens', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Celiac: exclude gluten', exact: true }).check();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Suggest recipes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Suggested eggs', exact: true })).toBeVisible();
  expect(requests[0]).toMatchObject({
    useUp: true,
    preferences: {
      directions: ['quick', 'high-protein'],
      restrictions: ['celiac'],
      maxMinutes: 15,
      equipment: 'One skillet',
    },
  });
  expect(JSON.stringify(requests[0])).not.toContain(owner);
  const snapshot = await readKitchen(page, owner);
  expect(snapshot.stock).toEqual(data.stock);
  expect(snapshot).not.toHaveProperty('preferences');
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Suggest with AI', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Quick', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByText('More preferences · 1 dietary choices', { exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Time limit (min)', exact: true })).toHaveValue(
    '15',
  );
  await page.getByRole('button', { name: 'Reset preferences', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Quick', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});
test('AI viewing, substitutions, label review, undo and saving stay explicit and stock-safe', async ({
  page,
}) => {
  const { data } = await ideas(page);
  await page.getByText('More preferences', { exact: true }).click();
  await page.getByText('Diet & allergens', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Milk allergy', exact: true }).check();
  await page.getByRole('button', { name: 'Suggest recipes', exact: true }).click();
  await page.getByRole('button', { name: 'View recipe', exact: true }).click();
  const preview = page.getByRole('dialog', { name: 'Suggested eggs', exact: true });
  await expect(preview.getByRole('textbox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Diet check');
  await page.getByText('Diet check · ingredient conflicts', { exact: true }).click();
  await expect(preview).toContainText('Conflicts with your choices: Butter');
  await page.getByText('Make it yours', { exact: true }).click();
  const swaps = page.getByRole('region', { name: 'Substitutions', exact: true });
  await swaps.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Recipe ingredients', exact: true })).toContainText(
    'Olive oil',
  );
  await expect(preview).toContainText('calculated estimate');
  await page.getByRole('button', { name: 'Undo variations', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Recipe ingredients', exact: true })).toContainText(
    'Butter',
  );
  await swaps.getByRole('button', { name: 'Apply', exact: true }).click();
  await page
    .getByRole('checkbox', {
      name: 'I reviewed labels and preparation for my dietary choices.',
      exact: true,
    })
    .check();
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click();
  await expect(preview.getByRole('status')).toHaveText('Saved to your cookbook.');
  const saved = await readKitchen(page, owner);
  expect(saved.stock).toEqual(data.stock);
  expect(saved.shopping).toEqual(data.shopping);
  expect(
    saved.recipes?.find((recipe) => recipe.title === 'Suggested eggs')?.ingredients[1]?.name,
  ).toBe('Olive oil');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('saved recipe additions recalculate nutrition and require saving before cooking or planning', async ({
  page,
}) => {
  const data = await seedKitchen(page);
  await openRecipe(page);
  await page.getByText('Make it yours', { exact: true }).click();
  await page
    .getByRole('region', { name: 'Spice it up', exact: true })
    .locator('.recipe-variation')
    .filter({ hasText: 'Brighter' })
    .getByRole('button', { name: 'Apply', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'Ingredients and kitchen match', exact: true }),
  ).toContainText('Lemon juice');
  await expect(
    page.getByRole('button', { name: 'Review cooked meal', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Description optional', exact: true })
    .fill('My brighter supper');
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Weeknight eggs', exact: true })).toContainText(
    'My brighter supper',
  );
  await expect(page.getByRole('button', { name: 'Review cooked meal', exact: true })).toBeEnabled();
  const saved = await readKitchen(page);
  expect(saved.stock).toEqual(data.stock);
  expect(saved.shopping).toEqual(data.shopping);
  expect(saved.recipes![0]!.ingredients).toHaveLength(3);
  expect(saved.recipes![0]!.nutrition?.source).toBe('calculated');
});
