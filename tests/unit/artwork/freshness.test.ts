import { expect, it } from 'vitest';
import { estimatedDate } from '../../../src/domain/freshness/estimate';
import { newFood } from '../../../src/domain/selectors';
import { reduceChecked } from '../../../src/domain/reducer';
import { kitchen, lotId } from '../fixtures';
const today = new Date(2026, 8, 10);
it('prefers curated storage profiles over AI and preserves an estimated source', () => {
  expect(estimatedDate({ ...newFood('Whole Milk'), location: 'fridge' }, today, 300)).toEqual({
    expires: '2026-09-17',
    expirySource: 'estimate',
  });
  expect(estimatedDate({ ...newFood('Chicken'), location: 'fridge' }, today, 30).expires).toBe(
    '2026-09-12',
  );
  expect(estimatedDate(newFood('Mystery food'), today)).toEqual({});
  expect(estimatedDate({ ...newFood('Napkins'), location: 'unspecified' }, today, 100)).toEqual({});
  expect(estimatedDate({ ...newFood('Infant formula') }, today, 100)).toEqual({});
  expect(estimatedDate({ ...newFood('Unusual cheese'), location: 'fridge' }, today, 30)).toEqual({
    expires: '2026-09-14',
    expirySource: 'ai',
  });
});
it('editing or clearing a printed date removes estimate provenance', () => {
  const data = kitchen();
  data.stock[0]!.expirySource = 'estimate';
  const edited = reduceChecked(data, { type: 'stock.date', stockId: lotId, expires: '2026-10-10' });
  expect(edited.stock[0]?.expirySource).toBeUndefined();
  expect(
    reduceChecked(edited, { type: 'stock.date', stockId: lotId, expires: null }).stock[0]?.expires,
  ).toBeUndefined();
});
