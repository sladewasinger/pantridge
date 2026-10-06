import { randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import { emptySnapshot, type Snapshot, type Food } from '../../../src/domain/model';
import type { Recipe } from '../../../src/domain/recipes/model';

export function cookbookFixture(): Snapshot {
  const egg: Food = {
    id: randomUUID(),
    name: 'Eggs',
    unit: 'items',
    art: 'eggs',
    brand: '',
    packageSize: '',
    location: 'fridge',
    shelf: 0,
    frozen: false,
  };
  const butter: Food = {
    ...egg,
    id: randomUUID(),
    name: 'Butter',
    unit: 'packs',
    art: 'butter',
    packageSize: '100 g',
    size: { amount: 100, measure: 'g', packs: 1 },
  };
  const recipe: Recipe = {
    id: randomUUID(),
    title: 'Weeknight eggs',
    source: 'manual',
    servings: 2,
    ingredients: [
      { id: randomUUID(), name: 'Eggs', quantity: 2, unit: 'count' },
      { id: randomUUID(), name: 'Butter', quantity: 20, unit: 'g' },
    ],
    steps: ['Melt butter.', 'Cook the eggs until set.'],
  };
  return {
    ...emptySnapshot(),
    starterVersion: 1,
    foods: [egg, butter],
    stock: [
      { id: randomUUID(), foodId: egg.id, quantity: 8 },
      { id: randomUUID(), foodId: butter.id, quantity: 1 },
    ],
    recipes: [recipe],
  };
}
export async function seedKitchen(page: Page, data = cookbookFixture()): Promise<Snapshot> {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open cookbook', exact: true })).toBeVisible();
  await page.evaluate(
    (snapshot) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('pantridge-v1', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('kitchens', 'readwrite');
          tx.objectStore('kitchens').put(
            { data: snapshot, pending: [], revision: 0, syncedAt: null },
            'local',
          );
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
    data,
  );
  await page.reload();
  return data;
}
export async function readKitchen(page: Page): Promise<Snapshot> {
  return page.evaluate(
    () =>
      new Promise<Snapshot>((resolve, reject) => {
        const request = indexedDB.open('pantridge-v1', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const read = db.transaction('kitchens').objectStore('kitchens').get('local');
          read.onsuccess = () => {
            db.close();
            resolve((read.result as { data: Snapshot }).data);
          };
          read.onerror = () => {
            db.close();
            reject(read.error);
          };
        };
      }),
  );
}
export async function openRecipe(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Open cookbook', exact: true }).click();
  await page.getByRole('button', { name: /Weeknight eggs/ }).click();
  await expect(page.getByRole('dialog', { name: 'Weeknight eggs', exact: true })).toBeVisible();
}
