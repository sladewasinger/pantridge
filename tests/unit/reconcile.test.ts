import { expect, it } from 'vitest';
import { blankKitchen } from '../../src/data/database';
import { reconcile } from '../../src/data/reconcile';
import { emptySnapshot } from '../../src/domain/model';
import { kitchen } from './fixtures';
it('does not overwrite a newer response already saved by another tab', () => {
  const current = { ...blankKitchen(), data: kitchen(), revision: 5 };
  const result = reconcile(current, { data: emptySnapshot(), revision: 4 }, new Set());
  expect(result).toBe(current);
});
