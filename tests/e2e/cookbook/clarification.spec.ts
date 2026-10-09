import { expect, test, type Page } from '@playwright/test';
import { cookbookFixture, seedKitchen, readKitchen } from './fixtures';
import { foodEvidence, evidenceFingerprint } from '../../../src/domain/standardization/evidence';
import { standardizationVersion } from '../../../src/domain/standardization/model';

async function noRecognitionChores(page: Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('summary').filter({ hasText: 'Food recognition' }).click();
  await expect(page.getByRole('region', { name: 'Foods needing clarification' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Clarify / })).toHaveCount(0);
  await expect(page.getByRole('dialog')).not.toContainText(/need review|need.*clarification/i);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect.poll(() => page.evaluate(() => history.state.pantridge.overlay)).toBeNull();
}
async function itemEditor(page: Page, name: string) {
  await page.getByRole('searchbox', { name: 'Find your food' }).fill(name);
  await page.getByRole('region', { name, exact: true }).getByRole('button').click();
  await page.getByRole('button', { name: 'Move or edit item', exact: true }).click();
  const editor = page.getByRole('dialog').locator('form');
  const matching = editor
    .locator('details')
    .filter({ has: page.locator('summary', { hasText: 'Recipe matching' }) });
  await expect(matching).not.toHaveAttribute('open', '');
  await editor.getByText('Recipe matching', { exact: true }).click();
  return editor;
}
test('optional item preparation correction persists without changing its name or quantity', async ({
  page,
}) => {
  const data = cookbookFixture();
  const food = data.foods[0]!;
  food.name = 'Store brown rice';
  food.standardization = {
    version: standardizationVersion,
    source: 'ai-private',
    status: 'recognized',
    identity: 'brown-rice',
    preparation: 'unknown',
    reason: '',
    fingerprint: evidenceFingerprint(foodEvidence(food)),
  };
  const calls: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/v1/products/resolve')) calls.push(request.url());
  });
  await seedKitchen(page, data);
  await noRecognitionChores(page);
  const editor = await itemEditor(page, food.name);
  await expect(editor).toContainText('AI ingredient match · preparation unspecified.');
  await editor.getByRole('combobox', { name: 'Preparation', exact: true }).selectOption('cooked');
  await editor.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Move or edit item', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect.poll(() => page.evaluate(() => history.state.pantridge.overlay)).toBeNull();
  await page.reload();
  const saved = await readKitchen(page);
  expect(saved.foods.find((entry) => entry.id === food.id)!.name).toBe(food.name);
  expect(saved.foods.find((entry) => entry.id === food.id)!.ingredient).toEqual({
    id: 'brown-rice',
    preparation: 'cooked',
    basis: 'as-sold',
  });
  expect(saved.stock).toEqual(data.stock);
  expect(calls).toEqual([]);
  const reopened = await itemEditor(page, food.name);
  await expect(reopened.getByRole('combobox', { name: 'Preparation', exact: true })).toHaveValue(
    'cooked',
  );
});
test('an unresolved mixed food offers optional exact-name matching within item editing', async ({
  page,
}) => {
  const data = cookbookFixture();
  const food = data.foods[0]!;
  food.name = 'Rice and beans dinner';
  food.standardization = {
    version: standardizationVersion,
    source: 'ai-private',
    status: 'composite',
    identity: null,
    preparation: 'cooked',
    reason: 'Review this food and choose an ingredient.',
    fingerprint: evidenceFingerprint(foodEvidence(food)),
  };
  await seedKitchen(page, data);
  await noRecognitionChores(page);
  const editor = await itemEditor(page, food.name);
  await expect(editor).toContainText('Mixed food.');
  await expect(editor).not.toContainText(food.standardization.reason);
  const identity = editor.getByRole('combobox', { name: 'Ingredient identity', exact: true });
  await expect(identity).toHaveValue('');
  const exact = await identity
    .locator('option')
    .filter({ hasText: 'Use exact name' })
    .getAttribute('value');
  await identity.selectOption(exact!);
  await editor.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Move or edit item', exact: true })).toBeVisible();
  const saved = await readKitchen(page);
  expect(saved.foods.find((entry) => entry.id === food.id)!.ingredient!.id).toMatch(/^custom-/);
  expect(saved.foods.find((entry) => entry.id === food.id)!.ingredient!.preparation).toBe(
    'unknown',
  );
  expect(saved.stock).toEqual(data.stock);
});
test('raspberries remain a normal kitchen item even with an unresolved saved result', async ({
  page,
}) => {
  const data = cookbookFixture();
  const food = data.foods[0]!;
  food.name = 'Raspberries';
  food.art = 'raspberries';
  food.standardization = {
    version: standardizationVersion,
    source: 'ai-private',
    status: 'taxonomy-gap',
    identity: null,
    preparation: 'unknown',
    reason: '',
    fingerprint: evidenceFingerprint(foodEvidence(food)),
  };
  await seedKitchen(page, data);
  await noRecognitionChores(page);
  await page.getByRole('searchbox', { name: 'Find your food' }).fill(food.name);
  await page.getByRole('region', { name: food.name, exact: true }).getByRole('button').click();
  await expect(page.getByRole('dialog', { name: food.name, exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).not.toContainText(/need review|clarif/i);
  const matching = page
    .getByRole('dialog')
    .locator('details')
    .filter({
      has: page.locator('summary', { hasText: 'Recipe matching' }),
    });
  await expect(matching).not.toHaveAttribute('open', '');
  await expect(
    page.getByRole('combobox', { name: 'Ingredient identity', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Add to shopping list', exact: true }).click();
  const saved = await readKitchen(page);
  expect(saved.stock).toEqual(data.stock);
  expect(saved.foods.find((entry) => entry.id === food.id)!.ingredient).toBeUndefined();
  expect(saved.shopping[0]).toMatchObject({ foodId: food.id, name: 'Raspberries', quantity: 1 });
});
