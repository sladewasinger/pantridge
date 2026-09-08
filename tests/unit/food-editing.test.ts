import { describe, expect, it } from 'vitest';
import { emptySnapshot } from '../../src/domain/model';
import { reduceChecked } from '../../src/domain/reducer';
import { egg, kitchen, purchase } from './fixtures';

describe('starter food and editable identities', () => {
  it('initializes six illustrated packages only once, even after every food is deleted', () => {
    const seeded = reduceChecked(emptySnapshot(), { type: 'kitchen.initialize' });
    expect(seeded.foods.map((food) => [food.name, food.art])).toEqual([
      ['Eggs', 'eggs'],
      ['Milk', 'milk'],
      ['Butter', 'butter'],
      ['Black beans', 'can'],
      ['Rice', 'rice'],
      ['Pasta', 'pasta'],
    ]);
    expect(seeded.stock.map((stock) => stock.quantity)).toEqual([1, 1, 1, 1, 1, 1]);
    const deleted = seeded.foods.reduce(
      (data, food) => reduceChecked(data, { type: 'food.remove', foodId: food.id }),
      seeded,
    );
    expect(deleted.stock).toEqual([]);
    expect(reduceChecked(deleted, { type: 'kitchen.initialize' })).toEqual(deleted);
  });
  it('leaves an existing kitchen intact during initialization', () => {
    expect(reduceChecked(kitchen(), { type: 'kitchen.initialize' })).toEqual({
      ...kitchen(),
      starterVersion: 1,
    });
  });
  it('edits the unit and illustration while keeping counts and shopping units consistent', () => {
    const data = reduceChecked(kitchen(), {
      type: 'food.save',
      food: { ...egg, unit: 'items', art: 'generic' },
    });
    expect(data.foods[0]).toMatchObject({ unit: 'items', art: 'generic' });
    expect(data.stock).toEqual(kitchen().stock);
    expect(data.shopping[0]).toMatchObject({ unit: 'items', quantity: 2 });
    const staleEdit = reduceChecked(data, {
      type: 'shopping.save',
      item: { ...purchase, quantity: 3 },
    });
    expect(staleEdit.shopping[0]).toMatchObject({ unit: 'items', quantity: 3 });
  });
  it('deletes inventory but keeps requested groceries as standalone shopping entries', () => {
    const data = reduceChecked(kitchen(), { type: 'food.remove', foodId: egg.id });
    expect(data.foods).toEqual([]);
    expect(data.stock).toEqual([]);
    expect(data.shopping[0]).toMatchObject({ name: 'Eggs', quantity: 2 });
    expect(data.shopping[0]).not.toHaveProperty('foodId');
  });
});
