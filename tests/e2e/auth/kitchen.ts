import { expect, type BrowserContext, type Page } from '@playwright/test';
import { emptySnapshot, type Envelope, type Snapshot } from '../../../src/domain/model';
import { mutationSchema, type Mutation } from '../../../src/domain/commands';
import { reduceChecked } from '../../../src/domain/reducer';
import type { StoredKitchen } from '../../../src/data/database';
import { identityToken, userKey } from './issuer';

export async function fixtureKitchen(context: BrowserContext, rejectInitial = false) {
  const remote = new Map<string, Envelope>();
  const receipts = new Set<string>();
  const uploads: { owner: string; id: string }[] = [];
  const rejected: string[] = [];
  await context.route('https://api.pantridge.test/v1/**', async (route) => {
    const token = route.request().headers().authorization;
    if (rejectInitial && token === 'Bearer synthetic-initial-access') {
      rejected.push(route.request().url());
      await route.fulfill({ status: 401, json: { message: 'Synthetic access token rejected' } });
      return;
    }
    const owner = token?.replace('Bearer synthetic-new-', '');
    expect(['auth-alice', 'auth-bob']).toContain(owner);
    const key = owner!;
    let envelope = remote.get(key) ?? {
      revision: 0,
      data: { ...emptySnapshot(), starterVersion: 1 as const },
    };
    if (route.request().method() === 'POST') {
      const mutation = mutationSchema.parse(route.request().postDataJSON());
      uploads.push({ owner: key, id: mutation.id });
      const receipt = `${key}:${mutation.id}`;
      if (!receipts.has(receipt)) {
        receipts.add(receipt);
        envelope = {
          revision: envelope.revision + 1,
          data: reduceChecked(envelope.data, mutation.command),
        };
      }
    }
    remote.set(key, envelope);
    await route.fulfill({ json: envelope });
  });
  return { uploads, rejected, remote };
}
export async function seedExpiredKitchen(page: Page, expired = true) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  const pending: Mutation[] = [
    'First saved grocery',
    'Second saved grocery',
    'Third saved grocery',
  ].map((name) => ({
    id: crypto.randomUUID(),
    command: {
      type: 'shopping.save',
      item: {
        id: crypto.randomUUID(),
        name,
        quantity: 1,
        purchased: false,
        unit: 'items',
      },
    },
  }));
  const data = pending.reduce<Snapshot>(
    (snapshot, mutation) => reduceChecked(snapshot, mutation.command),
    {
      ...emptySnapshot(),
      starterVersion: 1 as const,
    },
  );
  const stored: StoredKitchen = { data, pending, revision: 0, syncedAt: null };
  const user = {
    access_token: 'synthetic-initial-access',
    refresh_token: 'synthetic-expired-refresh',
    id_token: identityToken('auth-alice'),
    profile: { sub: 'auth-alice' },
    token_type: 'Bearer',
    scope: 'openid email profile',
    expires_at: Math.floor(Date.now() / 1000) + (expired ? -60 : 3600),
  };
  await page.evaluate(
    async ({ stored, user, key }) => {
      localStorage.setItem(key, JSON.stringify(user));
      await new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('pantridge-v1', 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('kitchens', 'readwrite');
          tx.objectStore('kitchens').put(stored, 'auth-alice');
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
      });
    },
    { stored, user, key: userKey },
  );
  await page.reload();
  return stored;
}
export async function persistedKitchen(page: Page, owner = 'auth-alice'): Promise<StoredKitchen> {
  return page.evaluate(
    (key) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('pantridge-v1', 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const request = db.transaction('kitchens').objectStore('kitchens').get(key);
          request.onsuccess = () => {
            db.close();
            resolve(request.result);
          };
          request.onerror = () => {
            db.close();
            reject(request.error);
          };
        };
      }),
    owner,
  );
}
