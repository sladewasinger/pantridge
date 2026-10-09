import { expect, it } from 'vitest';
import { compatibleMutationCommand } from '../../../src/domain/ingredient-matching/mutation-compatibility';
import { reduceChecked } from '../../../src/domain/reducer';
import { reconcile } from '../../../src/data/reconcile';
import type { Command, Mutation } from '../../../src/domain/commands';
import { expandedKitchen, newIdentity, newResult } from './fixtures';

const oldIdentity = { id: 'rice', preparation: 'dry' as const, basis: 'as-sold' as const };
const mutation = (command: Command, catalogRevision?: number): Mutation => ({
  id: crypto.randomUUID(),
  command,
  catalogRevision,
});

it.each([undefined, oldIdentity])(
  'preserves a hidden newer food classification during ordinary old saves carrying %j',
  (ingredient) => {
    const data = expandedKitchen();
    const food = {
      ...data.foods[0]!,
      ingredient,
      standardization: undefined,
      location: 'pantry' as const,
    };
    const queued = mutation({ type: 'food.save', food });
    const before = structuredClone(queued);
    const command = compatibleMutationCommand(data, queued);
    const saved = reduceChecked(data, command);
    expect(saved.foods[0]).toMatchObject({
      location: 'pantry',
      ingredient: newIdentity,
      standardization: newResult,
    });
    expect(queued).toEqual(before);
    const current = { data, pending: [queued], revision: 2, syncedAt: null };
    const replayed = reconcile(current, { data, revision: 3 }, new Set());
    expect(replayed.data).toEqual(saved);
    expect(replayed.pending[0]).toEqual(before);
  },
);
it('permits identity evidence edits, deletion and explicit current-client corrections', () => {
  const data = expandedKitchen();
  const previous = data.foods[0]!;
  const renamed = mutation({
    type: 'food.save',
    food: {
      ...previous,
      name: 'Different food',
      ingredient: undefined,
      standardization: undefined,
    },
  });
  expect(compatibleMutationCommand(data, renamed)).toEqual(renamed.command);
  const changed = reduceChecked(data, compatibleMutationCommand(data, renamed));
  expect(changed.foods[0]!.ingredient).toBeUndefined();
  expect(changed.foods[0]!.standardization).toBeUndefined();
  for (const ingredient of [undefined, oldIdentity]) {
    const queued = mutation({ type: 'food.save', food: { ...previous, ingredient } }, 2);
    expect(
      reduceChecked(data, compatibleMutationCommand(data, queued)).foods[0]!.ingredient,
    ).toEqual(ingredient);
  }
  const removed = mutation({ type: 'food.remove', foodId: previous.id });
  expect(reduceChecked(data, compatibleMutationCommand(data, removed)).foods).toEqual([]);
});
it('keeps measured inherited packages on an old ordinary save and invalidates them on a current correction', () => {
  const original = expandedKitchen();
  const data = {
    ...original,
    stock: original.stock.map((lot) => ({
      ...lot,
      ingredient: undefined,
      ingredientSize: { amount: 300, measure: 'g' as const, packs: 1 },
      ingredientSizeBasis: 'as-sold' as const,
    })),
  };
  const food = { ...data.foods[0]!, ingredient: oldIdentity, location: 'pantry' as const };
  const ordinary = mutation({ type: 'food.save', food });
  const saved = reduceChecked(data, compatibleMutationCommand(data, ordinary));
  expect(saved.stock).toEqual(data.stock);
  expect(saved.foods[0]!.ingredient).toEqual(newIdentity);
  expect(saved.shopping.map((item) => item.quantity)).toEqual(
    data.shopping.map((item) => item.quantity),
  );

  const correction = mutation({ type: 'food.save', food }, 2);
  const corrected = reduceChecked(data, compatibleMutationCommand(data, correction));
  expect(corrected.foods[0]!.ingredient).toEqual(oldIdentity);
  expect(corrected.stock[0]).toMatchObject({ quantity: 1.234567 });
  expect(corrected.stock[0]!.ingredientSize).toBeUndefined();
  expect(corrected.stock[0]!.ingredientSizeBasis).toBeUndefined();
});
it('preserves hidden recipe row descriptors for quantity edits but not changed preparation evidence', () => {
  const data = expandedKitchen();
  const recipe = data.recipes[0]!;
  const row = {
    ...recipe.ingredients[0]!,
    ingredient: oldIdentity,
    standardization: undefined,
    quantity: 4,
  };
  const queued = mutation({ type: 'recipe.save', recipe: { ...recipe, ingredients: [row] } });
  const saved = reduceChecked(data, compatibleMutationCommand(data, queued));
  expect(saved.recipes![0]!.ingredients[0]).toMatchObject({
    quantity: 4,
    ingredient: newIdentity,
    standardization: newResult,
  });
  const renamed = mutation({
    type: 'recipe.save',
    recipe: { ...recipe, ingredients: [{ ...row, note: 'Now dried', ingredient: undefined }] },
  });
  expect(
    reduceChecked(data, compatibleMutationCommand(data, renamed)).recipes![0]!.ingredients[0]!
      .ingredient,
  ).toBeUndefined();
});
it('preserves hidden shopping descriptors on ordinary row edits and put-away food replacement', () => {
  const data = expandedKitchen();
  const item = { ...data.shopping[0]!, ingredient: undefined, quantity: 3 };
  const edited = mutation({ type: 'shopping.save', item });
  expect(reduceChecked(data, compatibleMutationCommand(data, edited)).shopping[0]).toMatchObject({
    quantity: 3,
    ingredient: newIdentity,
  });
  const renamed = mutation({
    type: 'shopping.save',
    item: { ...item, foodId: undefined, name: 'Different food' },
  });
  expect(
    reduceChecked(data, compatibleMutationCommand(data, renamed)).shopping[0]!.ingredient,
  ).toBeUndefined();
  const putAway = mutation({
    type: 'shopping.putAway',
    itemId: data.shopping[0]!.id,
    food: { ...data.foods[0]!, ingredient: undefined, standardization: undefined },
    stock: {
      id: crypto.randomUUID(),
      foodId: data.foods[0]!.id,
      quantity: data.shopping[0]!.quantity,
    },
  });
  const saved = reduceChecked(data, compatibleMutationCommand(data, putAway));
  expect(saved.foods[0]!.ingredient).toEqual(newIdentity);
  expect(saved.stock.at(-1)!.quantity).toBe(data.shopping[0]!.quantity);
  expect(saved.shopping).toEqual([]);
});
