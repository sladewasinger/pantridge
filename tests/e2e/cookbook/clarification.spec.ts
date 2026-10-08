import { expect, test } from '@playwright/test';
import { cookbookFixture, seedKitchen, readKitchen } from './fixtures';
import { foodEvidence, evidenceFingerprint } from '../../../src/domain/standardization/evidence';

test('clarification asks for missing preparation and persists without changing name or quantity', async ({
  page,
}) => {
  const data = cookbookFixture();
  const food = data.foods[0]!;
  food.name = 'Store brown rice';
  food.standardization = {
    version: '1',
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
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText(/Food recognition/).click();
  await expect(page.getByText('Needs your review · 1', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Clarify Store brown rice · Kitchen item', exact: true })
    .click();
  await expect(page.getByLabel('What food is this?')).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Save clarification', exact: true }),
  ).toBeDisabled();
  await page.getByLabel('How is it prepared?').selectOption('cooked');
  await page.getByRole('button', { name: 'Save clarification', exact: true }).click();
  await expect(page.getByText(/Needs your review/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  const saved = await readKitchen(page);
  expect(saved.foods[0]!.name).toBe(food.name);
  expect(saved.foods[0]!.ingredient).toEqual({
    id: 'brown-rice',
    preparation: 'cooked',
    basis: 'as-sold',
  });
  expect(saved.stock).toEqual(data.stock);
  expect(calls).toEqual([]);
});

test('ambiguous composite offers exact-name preservation without a guessed ingredient', async ({
  page,
}) => {
  const data = cookbookFixture();
  const food = data.foods[0]!;
  food.name = 'Rice and beans dinner';
  food.standardization = {
    version: '1',
    source: 'ai-private',
    status: 'composite',
    identity: null,
    preparation: 'cooked',
    reason: '',
    fingerprint: evidenceFingerprint(foodEvidence(food)),
  };
  await seedKitchen(page, data);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText(/Food recognition/).click();
  await page
    .getByRole('button', { name: 'Clarify Rice and beans dinner · Kitchen item', exact: true })
    .click();
  await expect(page.getByLabel('What food is this?')).toHaveValue('');
  await expect(page.getByText(/Do not choose just one/)).toBeVisible();
  await page.getByLabel('What food is this?').selectOption('exact');
  await expect(page.getByLabel('How is it prepared?')).toHaveCount(0);
  await expect(page.getByText(/Recipe compatibility and amounts still need review/)).toBeVisible();
  await page.getByRole('button', { name: 'Save clarification', exact: true }).click();
  await expect(page.getByText(/Needs your review/)).toHaveCount(0);
  const saved = await readKitchen(page);
  expect(saved.foods[0]!.ingredient!.id).toMatch(/^custom-/);
  expect(saved.foods[0]!.ingredient!.preparation).toBe('unknown');
});
