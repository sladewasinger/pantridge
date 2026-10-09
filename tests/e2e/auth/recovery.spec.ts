import { expect, test, type Page } from '@playwright/test';
import { fixtureIssuer, userKey } from './issuer';
import { fixtureKitchen, persistedKitchen, seedExpiredKitchen } from './kitchen';

test.use({ serviceWorkers: 'block' });
async function openSettings(page: Page) {
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  if (!(await page.getByRole('dialog', { name: 'Your kitchen' }).count()))
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
}
async function expectReauthentication(page: Page) {
  await openSettings(page);
  await expect(page.getByRole('button', { name: 'Sign in again', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('3 changes waiting to sync');
  await expect(page.getByText('Resolve unsynced changes', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Use cloud copy', exact: true })).toHaveCount(0);
}
async function signInAgain(page: Page) {
  await Promise.all([
    page.waitForURL((url) => url.searchParams.has('code') || url.searchParams.has('error')),
    page.getByRole('button', { name: 'Sign in again', exact: true }).click(),
  ]);
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
}

test('expired refresh credentials preserve three pending edits across reload and same-account sign-in replays them once', async ({
  page,
  context,
}) => {
  const issuer = await fixtureIssuer(context);
  const server = await fixtureKitchen(context);
  const initial = await seedExpiredKitchen(page);
  await expectReauthentication(page);
  expect(issuer.refreshes).toBe(1);
  expect(await persistedKitchen(page)).toEqual(initial);
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).profile.sub, userKey),
  ).toBe('auth-alice');
  await page.reload();
  await expectReauthentication(page);
  expect(await persistedKitchen(page)).toEqual(initial);
  expect(server.uploads).toEqual([]);
  await signInAgain(page);
  await expect.poll(async () => (await persistedKitchen(page)).pending.length).toBe(0);
  expect(issuer.authorizations).toBe(1);
  expect(issuer.exchanges).toBe(1);
  expect(server.uploads).toEqual(
    initial.pending.map((mutation) => ({ owner: 'auth-alice', id: mutation.id })),
  );
  expect((await persistedKitchen(page)).data.shopping).toEqual(initial.data.shopping);
  await page.reload();
  await openSettings(page);
  await expect(page.getByRole('dialog')).toContainText('0 changes waiting to sync');
  expect(server.uploads).toHaveLength(3);
});

test('signing into another account never uploads the previous kitchen outbox', async ({
  page,
  context,
}) => {
  const issuer = await fixtureIssuer(context);
  const server = await fixtureKitchen(context);
  const initial = await seedExpiredKitchen(page);
  await expectReauthentication(page);
  issuer.subject = 'auth-bob';
  await signInAgain(page);
  await expect.poll(async () => (await persistedKitchen(page, 'auth-bob'))?.revision).toBe(0);
  await openSettings(page);
  await expect(page.getByRole('dialog')).toContainText('0 changes waiting to sync');
  expect(await persistedKitchen(page, 'auth-alice')).toEqual(initial);
  expect(server.uploads).toEqual([]);
  expect(server.remote.has('auth-bob')).toBe(true);
  expect(server.remote.has('auth-alice')).toBe(false);
});

test('a backend 401 offers reauthentication without exposing discard recovery', async ({
  page,
  context,
}) => {
  const issuer = await fixtureIssuer(context);
  const server = await fixtureKitchen(context, true);
  const initial = await seedExpiredKitchen(page, false);
  await expectReauthentication(page);
  expect(issuer.refreshes).toBe(0);
  expect(server.rejected).toHaveLength(1);
  expect(await persistedKitchen(page)).toEqual(initial);
  await signInAgain(page);
  await expect.poll(async () => (await persistedKitchen(page)).pending.length).toBe(0);
  expect(server.uploads.map((item) => item.id)).toEqual(initial.pending.map((item) => item.id));
});

test('canceling sign-in retains the previous kitchen and pending mutation identities', async ({
  page,
  context,
}) => {
  const issuer = await fixtureIssuer(context);
  const server = await fixtureKitchen(context);
  const initial = await seedExpiredKitchen(page);
  await expectReauthentication(page);
  issuer.cancel = true;
  await signInAgain(page);
  await expect.poll(() => issuer.authorizations).toBe(1);
  await expectReauthentication(page);
  expect(await persistedKitchen(page)).toEqual(initial);
  expect(issuer.exchanges).toBe(0);
  expect(server.uploads).toEqual([]);
});
