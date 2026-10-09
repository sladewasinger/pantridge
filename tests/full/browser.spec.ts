import { expect, test } from '@playwright/test';
import { client } from './client';
test('two devices sync real writes, optionally edit recipe matching, reload, and isolate a switched account', async ({
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
    await expect(page.getByRole('dialog')).toContainText('No food recognition pending.');
    await expect(page.getByRole('region', { name: 'Foods needing clarification' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Clarify / })).toHaveCount(0);
    await page.reload();
    await page.locator('summary').filter({ hasText: 'Food recognition' }).click();
    await expect(page.getByRole('button', { name: /^Clarify / })).toHaveCount(0);
    const before = await alice.read();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect.poll(() => page.evaluate(() => history.state.pantridge.overlay)).toBeNull();
    await page.getByRole('searchbox', { name: 'Find your food' }).fill(unique);
    await page.getByRole('region', { name: unique, exact: true }).getByRole('button').click();
    await page.getByRole('button', { name: 'Move or edit item', exact: true }).click();
    const firstEditor = page.getByRole('dialog').locator('form');
    await expect(
      firstEditor.getByRole('combobox', { name: 'Ingredient identity', exact: true }),
    ).toHaveCount(0);
    await firstEditor.getByText('Recipe matching', { exact: true }).click();
    await firstEditor
      .getByRole('combobox', { name: 'Ingredient identity', exact: true })
      .selectOption('rice');
    await firstEditor
      .getByRole('combobox', { name: 'Preparation', exact: true })
      .selectOption('dry');
    const correction = page.waitForResponse((response) => {
      if (
        !new URL(response.url()).pathname.endsWith('/v1/mutations') ||
        response.request().method() !== 'POST'
      )
        return false;
      const body = response.request().postDataJSON() as { command?: { type?: string } };
      return body.command?.type === 'food.save' && response.ok();
    });
    await firstEditor.getByRole('button', { name: 'Save changes', exact: true }).click();
    await correction;
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
    await expect(second.getByRole('button', { name: /^Clarify / })).toHaveCount(0);
    await second.getByRole('button', { name: 'Close', exact: true }).click();
    await expect.poll(() => second.evaluate(() => history.state.pantridge.overlay)).toBeNull();
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
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect.poll(() => page.evaluate(() => history.state.pantridge.overlay)).toBeNull();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.reload();
    await page.locator('summary').filter({ hasText: 'Food recognition' }).click();
    await expect(page.getByRole('button', { name: /^Clarify / })).toHaveCount(0);
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
