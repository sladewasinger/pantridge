import { expect, it } from 'vitest';
import {
  ingredientRegistry,
  identifyIngredient,
  acceptsIdentity,
} from '../../../src/domain/ingredient-matching/identity';
import { normalizeIngredientName } from '../../../src/domain/recipes/names';
import { matchingLots } from '../../../src/domain/recipes/availability';
import { kitchen, ingredient } from './fixtures';

it('has unambiguous normalized labels and aliases that resolve to their own food identity', () => {
  const owners = new Map<string, string>();
  const ids = new Set<string>();
  for (const item of ingredientRegistry) {
    expect(ids.has(item.id), `Duplicate registry ID ${item.id}`).toBe(false);
    ids.add(item.id);
    for (const name of [item.label, ...item.aliases]) {
      const normalized = normalizeIngredientName(name);
      const prior = owners.get(normalized);
      expect
        .soft(
          prior === undefined || prior === item.id,
          `${name} is owned by ${prior} and ${item.id}`,
        )
        .toBe(true);
      owners.set(normalized, item.id);
      expect.soft(identifyIngredient(name)?.id, `${item.id}: ${name}`).toBe(item.id);
    }
  }
});
it('keeps family links within the registry, acyclic, and directional', () => {
  const entries = new Map<string, { id: string; parent?: string }>(
    ingredientRegistry.map((item) => [item.id, item]),
  );
  for (const entry of entries.values()) {
    const visited = new Set<string>([entry.id]);
    let parent = entry.parent;
    while (parent) {
      expect(entries.has(parent), `${entry.id} has missing parent ${parent}`).toBe(true);
      expect(visited.has(parent), `${entry.id} has a family cycle through ${parent}`).toBe(false);
      visited.add(parent);
      parent = entries.get(parent)?.parent;
    }
    if (entry.parent) {
      expect(acceptsIdentity(entry.parent, entry.id)).toBe(true);
      expect(acceptsIdentity(entry.id, entry.parent)).toBe(false);
    }
  }
});
it('keeps newly generic tuna separate from canned tuna and its preparation', () => {
  expect(identifyIngredient('Tuna')).toMatchObject({ id: 'tuna', preparation: 'raw' });
  expect(identifyIngredient('Canned tuna')).toMatchObject({
    id: 'canned-tuna',
    preparation: 'canned',
  });
  expect(matchingLots(kitchen('Tuna'), ingredient('Canned tuna'))).toEqual([]);
  expect(matchingLots(kitchen('Canned tuna'), ingredient('Tuna'))).toEqual([]);
});
