import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cookbookFixture, readKitchen, seedKitchen } from './fixtures';

test('dated ingredients lead browsing and sourced recipes retain estimates when saved', async ({
  page,
}) => {
  const data = cookbookFixture();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  data.stock[0]!.expires = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  await seedKitchen(page, data);
  await page.getByRole('button', { name: 'Open cookbook', exact: true }).click();
  await expect(page.locator('.recipe-card').first()).toContainText('Use soon');
  await page.getByText('View', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Show recipes without matches' }).check();
  await page.getByRole('checkbox', { name: '30 minutes or less' }).check();
  await expect(page.getByRole('heading', { name: 'What’s for dinner?' })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .getByRole('searchbox', { name: 'Find a recipe' })
    .fill('Hearty Black Bean Quesadillas');
  await page.getByRole('button', { name: /Built-in Hearty Black Bean Quesadillas/ }).click();
  const detail = page.getByRole('dialog', { name: 'Hearty Black Bean Quesadillas' });
  await expect(detail).toContainText('Beth Moncel, Budget Bytes');
  await expect(detail).toContainText('4.74/5');
  await expect(detail).toContainText('310 ratings');
  await expect(detail.getByRole('link', { name: 'Source' })).toHaveAttribute(
    'href',
    'https://www.budgetbytes.com/hearty-black-bean-quesadillas/',
  );
  await expect(detail.getByRole('region', { name: 'Estimated nutrition' })).toContainText(
    '833.4 mg',
  );
  await expect(detail.getByRole('region', { name: 'Estimated nutrition' })).toContainText(
    'Per 1 quesadilla',
  );
  await detail.getByLabel('Servings', { exact: true }).fill('5');
  await expect(detail.getByRole('region', { name: 'Estimated nutrition' })).toContainText(
    '833.4 mg',
  );
  await detail.getByRole('button', { name: 'Save recipe', exact: true }).click();
  await expect(detail.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled();
  await detail.getByRole('button', { name: 'Review cooked meal' }).click();
  await page.getByRole('button', { name: 'Cancel without changes', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Include built-in recipes' }).uncheck();
  await expect(page.locator('.recipe-list')).toContainText('Hearty Black Bean Quesadillas');
  const after = await readKitchen(page);
  expect(after.stock).toEqual(data.stock);
  expect(
    after.recipes?.find((recipe) => recipe.title === 'Hearty Black Bean Quesadillas')?.nutrition
      ?.sodium,
  ).toBe(833.43);
});
