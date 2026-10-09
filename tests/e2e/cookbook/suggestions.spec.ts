import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cookbookFixture } from './fixtures';
const owner = 'recipe-suggestions-browser-test';
async function signedKitchen(page: Page, data = cookbookFixture()) {
  await page.addInitScript(
    (subject) =>
      localStorage.setItem(
        'oidc.user:https://auth.pantridge.test:pantridge-test',
        JSON.stringify({
          access_token: 'recipe-test-token',
          token_type: 'Bearer',
          scope: 'openid',
          profile: { sub: subject },
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        }),
      ),
    owner,
  );
  await page.route('https://api.pantridge.test/v1/kitchen**', (route) =>
    route.fulfill({ json: { revision: 0, data } }),
  );
  await page.route('https://api.pantridge.test/v1/mutations**', (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Open cookbook', exact: true }).click();
  await page.getByRole('button', { name: 'Suggest with AI', exact: true }).click();
  return data;
}
async function recipes(page: Page) {
  return page.evaluate(
    (subject) =>
      new Promise<{ recipes?: { title: string }[]; stock: unknown[] }>((resolve, reject) => {
        const request = indexedDB.open('pantridge-v1', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const read = db.transaction('kitchens').objectStore('kitchens').get(subject);
          read.onsuccess = () => {
            db.close();
            resolve(read.result.data);
          };
          read.onerror = () => {
            db.close();
            reject(read.error);
          };
        };
      }),
    owner,
  );
}
test('AI ideas require sign-in and never run merely by opening the cookbook', async ({ page }) => {
  let calls = 0;
  await page.route('https://api.pantridge.test/v1/products/resolve**', (route) => {
    calls++;
    return route.fulfill({ json: { recipes: [] } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open cookbook', exact: true }).click();
  await page.getByRole('button', { name: 'Suggest with AI', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Suggest recipes', exact: true })).toBeDisabled();
  await expect(
    page.getByText('Sign in with Google from Settings to suggest recipes.'),
  ).toBeVisible();
  expect(calls).toBe(0);
});
test('AI previews disclose transmission, require review/save and leave stock unchanged', async ({
  page,
}) => {
  const result = { ...cookbookFixture().recipes![0]!, title: 'AI egg supper', source: 'ai' };
  let calls = 0;
  await page.route('https://api.pantridge.test/v1/products/resolve**', (route) => {
    calls++;
    const request = route.request().postDataJSON();
    expect(request.kind).toBe('recipe');
    expect(request.useUp).toBe(true);
    expect(JSON.stringify(request)).not.toContain(owner);
    expect(request.inventory.map((item: { name: string }) => item.name)).toContain('Eggs');
    return route.fulfill({ json: { recipes: [result] } });
  });
  const initial = await signedKitchen(page);
  await page.getByText('What gets sent?', { exact: true }).click();
  await expect(page.getByText(/exact food names in/)).toBeVisible();
  await page.getByRole('button', { name: 'Suggest recipes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AI egg supper', exact: true })).toBeVisible();
  expect((await recipes(page)).recipes?.some((recipe) => recipe.title === 'AI egg supper')).toBe(
    false,
  );
  await page.getByRole('button', { name: 'View recipe', exact: true }).click();
  const preview = page.getByRole('dialog', { name: 'AI egg supper', exact: true });
  await expect(preview).toBeVisible();
  await expect(preview.getByRole('textbox')).toHaveCount(0);
  await expect(preview.getByRole('spinbutton')).toHaveCount(0);
  await expect(preview.getByRole('combobox')).toHaveCount(0);
  await expect(preview.getByRole('region', { name: 'Cooking steps' })).toContainText(
    result.steps[0]!,
  );
  await expect(preview.getByRole('region', { name: 'Ingredients and kitchen match' })).toBeHidden();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  expect((await recipes(page)).recipes?.some((recipe) => recipe.title === 'AI egg supper')).toBe(
    false,
  );
  await page.getByRole('button', { name: 'View recipe', exact: true }).click();
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click();
  await expect(preview.getByRole('status')).toHaveText('Saved to your cookbook.');
  await expect(preview.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Edit recipe', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Edit recipe', exact: true })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Description optional', exact: true })
    .fill('My saved supper.');
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click();
  await expect(preview).toContainText('My saved supper.');
  await expect(preview.getByRole('textbox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(
    page
      .getByRole('dialog', { name: 'Suggest with AI', exact: true })
      .getByRole('button', { name: 'Saved', exact: true }),
  ).toBeDisabled();
  const saved = await recipes(page);
  expect(saved.recipes?.some((recipe) => recipe.title === 'AI egg supper')).toBe(true);
  expect(saved.stock).toEqual(initial.stock);
  expect(calls).toBe(1);
});
test('closing in-flight ideas discards late results and provider limits remain retryable', async ({
  page,
}) => {
  let release = () => {};
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route('https://api.pantridge.test/v1/products/resolve**', async (route) => {
    requested = true;
    await ready;
    await route.fulfill({ json: { recipes: [] } });
  });
  await signedKitchen(page);
  await page.getByRole('button', { name: 'Suggest recipes', exact: true }).click();
  await expect.poll(() => requested).toBe(true);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  release();
  await page.getByRole('button', { name: 'Suggest with AI', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Suggest recipes', exact: true })).toBeEnabled();
  await expect(page.getByText('No useful recipes found. Add more food or try again.')).toHaveCount(
    0,
  );
  await page.unroute('https://api.pantridge.test/v1/products/resolve**');
  await page.route('https://api.pantridge.test/v1/products/resolve**', (route) =>
    route.fulfill({ status: 429, json: { message: 'Daily AI limit reached.' } }),
  );
  await page.getByRole('button', { name: 'Suggest recipes', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Daily AI limit reached.');
  await expect(page.getByRole('button', { name: 'Suggest recipes', exact: true })).toBeEnabled();
});

test('AI ingredient matches show a past-date warning when current stock is overdue', async ({
  page,
}) => {
  const data = cookbookFixture();
  data.stock[1]!.expires = '2000-01-01';
  const result = { ...data.recipes![0]!, title: 'AI eggs with butter', source: 'ai' };
  await page.route('https://api.pantridge.test/v1/products/resolve**', (route) => {
    const input = route.request().postDataJSON();
    expect(input.inventory.map((item: { name: string }) => item.name)).not.toContain('Butter');
    return route.fulfill({ json: { recipes: [result] } });
  });
  await signedKitchen(page, data);
  await page.getByRole('button', { name: 'Suggest recipes', exact: true }).click();
  await expect(
    page.getByText('Check past-date ingredients before using matching stock.'),
  ).toBeVisible();
  await expect(page.getByText('Ingredient amounts match your stock.')).toHaveCount(0);
});

async function holdKitchenWrites(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const scope = window as typeof window & { releaseCookbookWrites?: boolean };
        scope.releaseCookbookWrites = false;
        const request = indexedDB.open('pantridge-v1', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('kitchens', 'readwrite');
          tx.oncomplete = () => db.close();
          const keepOpen = () => {
            if (scope.releaseCookbookWrites) return;
            tx.objectStore('kitchens').get('hold').onsuccess = keepOpen;
          };
          keepOpen();
          resolve();
        };
      }),
  );
}

test('finishing a dismissed AI recipe save cannot close a newer review draft', async ({ page }) => {
  const recipe = { ...cookbookFixture().recipes![0]!, source: 'ai' };
  await page.route('https://api.pantridge.test/v1/products/resolve**', (route) =>
    route.fulfill({
      json: {
        recipes: [
          { ...recipe, title: 'Idea A' },
          { ...recipe, title: 'Idea B' },
        ],
      },
    }),
  );
  await signedKitchen(page);
  await page.getByRole('button', { name: 'Suggest recipes', exact: true }).click();
  await page
    .locator('.suggestion-result')
    .filter({ hasText: 'Idea A' })
    .getByRole('button', { name: 'View recipe' })
    .click();
  await holdKitchenWrites(page);
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saving…', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page
    .locator('.suggestion-result')
    .filter({ hasText: 'Idea B' })
    .getByRole('button', { name: 'View recipe' })
    .click();
  await page.getByRole('button', { name: 'Edit recipe', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Recipe name', exact: true })
    .fill('Idea B unsaved draft');
  await page.evaluate(() => {
    (window as typeof window & { releaseCookbookWrites?: boolean }).releaseCookbookWrites = true;
  });
  await expect
    .poll(async () => (await recipes(page)).recipes?.some((item) => item.title === 'Idea A'))
    .toBe(true);
  await expect(page.getByRole('textbox', { name: 'Recipe name', exact: true })).toHaveValue(
    'Idea B unsaved draft',
  );
  expect((await recipes(page)).recipes?.some((item) => item.title === 'Idea B unsaved draft')).toBe(
    false,
  );
});

test('a delayed editor save does not dismiss a newer edit of the same preview', async ({
  page,
}) => {
  const idea = { ...cookbookFixture().recipes![0]!, title: 'Slow saved idea', source: 'ai' };
  await page.route('https://api.pantridge.test/v1/products/resolve**', (route) =>
    route.fulfill({ json: { recipes: [idea] } }),
  );
  const initial = await signedKitchen(page);
  await page.getByRole('button', { name: 'Suggest recipes', exact: true }).click();
  await page.getByRole('button', { name: 'View recipe', exact: true }).click();
  await page.getByRole('button', { name: 'Edit recipe', exact: true }).click();
  await holdKitchenWrites(page);
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saving…', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Edit recipe', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Recipe name', exact: true })
    .fill('Keep this newer draft');
  await page.evaluate(() => {
    (window as typeof window & { releaseCookbookWrites?: boolean }).releaseCookbookWrites = true;
  });
  await expect
    .poll(async () => (await recipes(page)).recipes?.some((item) => item.title === idea.title))
    .toBe(true);
  await expect(page.getByRole('textbox', { name: 'Recipe name', exact: true })).toHaveValue(
    'Keep this newer draft',
  );
  expect(
    (await recipes(page)).recipes?.some((item) => item.title === 'Keep this newer draft'),
  ).toBe(false);
  expect((await recipes(page)).stock).toEqual(initial.stock);
});
