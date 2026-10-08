import { expect, test } from '@playwright/test';
import { client } from './client';
test('two devices sync real writes, clarify recognition, reload, and isolate a switched account', async ({
  page,
  browser,
  request,
}) => {
  const alice = await client(request);
  const unique = `Browser grocery ${crypto.randomUUID()}`;
  const second = await browser.newPage();
  let foodId: string | undefined;
  try {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Kitchen synced', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Add food', exact: true }).click();
    await page.getByRole('textbox', { name: 'Food name', exact: true }).fill(unique);
    await page.getByRole('button', { name: 'Add to pantry', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect
      .poll(async () => (await alice.read()).data.foods.find((food) => food.name === unique)?.id)
      .toBeTruthy();
    foodId = (await alice.read()).data.foods.find((food) => food.name === unique)!.id;
    await second.goto('http://127.0.0.1:5179/');
    await second.getByRole('searchbox', { name: 'Find your food' }).fill(unique);
    await expect(second.getByRole('region', { name: unique, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByText(/Food recognition ·/).click();
    await page.getByRole('button', { name: 'Process now', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Queued for processing.');
    await expect(page.getByRole('dialog')).toContainText('0 changes waiting to sync');
    await page.getByText('Test controls', { exact: true }).click();
    await page.getByRole('button', { name: 'Run due worker jobs', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Worker checked due jobs.');
    await page.getByRole('button', { name: 'Sync now', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText(
      'No recognition queued. Some items need your clarification below.',
    );
    const reviewName = `Clarify ${unique} · Kitchen item`;
    await expect(page.getByRole('button', { name: reviewName, exact: true })).toBeVisible();
    await page.reload();
    await page.locator('summary').filter({ hasText: 'Food recognition' }).click();
    await expect(page.getByRole('button', { name: reviewName, exact: true })).toBeVisible();
    const before = await alice.read();
    await page.getByRole('button', { name: reviewName, exact: true }).click();
    await expect(page.getByRole('form', { name: `Clarify ${unique}`, exact: true })).toContainText(
      'We could not identify this food.',
    );
    await page
      .getByRole('combobox', { name: 'What food is this?', exact: true })
      .selectOption('rice');
    await page
      .getByRole('combobox', { name: 'How is it prepared?', exact: true })
      .selectOption('dry');
    const clarification = page.waitForResponse((response) => {
      if (!response.url().endsWith('/v1/mutations') || response.request().method() !== 'POST')
        return false;
      const body = response.request().postDataJSON() as { command?: { type?: string } };
      return body.command?.type === 'classification.review' && response.ok();
    });
    await page.getByRole('button', { name: 'Save clarification', exact: true }).click();
    await clarification;
    await expect(page.getByRole('button', { name: reviewName, exact: true })).toHaveCount(0);
    const clarified = (await alice.read()).data;
    expect(clarified.foods.find((food) => food.id === foodId)?.ingredient).toEqual({
      id: 'rice',
      preparation: 'dry',
      basis: 'as-sold',
    });
    expect(clarified.stock).toEqual(before.data.stock);
    expect(clarified.shopping).toEqual(before.data.shopping);
    await second.getByRole('button', { name: 'Settings', exact: true }).click();
    await second.getByRole('button', { name: 'Sync now', exact: true }).click();
    await second.locator('summary').filter({ hasText: 'Food recognition' }).click();
    await expect(second.getByRole('button', { name: reviewName, exact: true })).toHaveCount(0);
    await second.getByRole('button', { name: 'Close', exact: true }).click();
    await second.reload();
    await second.getByRole('region', { name: unique, exact: true }).getByRole('button').click();
    await second.getByRole('button', { name: 'Move or edit item', exact: true }).click();
    const editor = second.getByRole('dialog').locator('form');
    await editor.getByText('Recipe matching', { exact: true }).click();
    await expect(
      editor.getByRole('combobox', { name: 'Ingredient identity', exact: true }),
    ).toHaveValue('rice');
    await expect(editor.getByRole('combobox', { name: 'Preparation', exact: true })).toHaveValue(
      'dry',
    );
    await page.reload();
    await page.locator('summary').filter({ hasText: 'Food recognition' }).click();
    await expect(page.getByRole('button', { name: reviewName, exact: true })).toHaveCount(0);
    expect((await alice.read()).data.foods.find((food) => food.id === foodId)?.ingredient?.id).toBe(
      'rice',
    );
    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('combobox', { name: 'Test account' }).selectOption('dev-bob'),
    ]);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Test account' })).toHaveValue('dev-bob');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Kitchen synced', exact: true })).toBeVisible();
    await page.getByRole('searchbox', { name: 'Find your food' }).fill(unique);
    await expect(page.getByRole('region', { name: unique, exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('combobox', { name: 'Test account' }).selectOption('dev-alice'),
    ]);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Test account' })).toHaveValue('dev-alice');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Find your food' }).fill(unique);
    await expect(page.getByRole('region', { name: unique, exact: true })).toBeVisible();
  } finally {
    await second.close();
    if (foodId) await alice.mutate({ type: 'food.remove', foodId });
  }
});
