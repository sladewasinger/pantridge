import { expect, it } from 'vitest';
import { contract } from '../../../api/experiments/contracts';
import { fixtures, shuffled } from '../../../api/experiments/fixtures';
import registry from '../../../src/domain/ingredient-matching/registry.json' with { type: 'json' };
import { responseSchema } from '../../../api/experiments/provider';
it('compact decoding restores shuffled indices and preserves uncertainty without inventing identity', () => {
  const result = contract('compact', 2).decode({
    items: [
      { i: 1, result: { f: null, p: 'unknown', s: 'uncertain' } },
      { i: 0, result: { f: 0, p: 'plain', s: 'recognized' } },
    ],
  });
  expect(result[0]?.identity).toBe(registry[0]!.id);
  expect(result[1]).toMatchObject({ status: 'uncertain', identity: null });
});
it.each(
  [
    [
      { i: 0, f: 0, p: 'plain', s: 'recognized' },
      { i: 0, f: 1, p: 'plain', s: 'recognized' },
    ],
    [
      { i: 0, f: null, p: 'plain', s: 'recognized' },
      { i: 1, f: 1, p: 'plain', s: 'recognized' },
    ],
    [
      { i: 0, f: 9999, p: 'plain', s: 'recognized' },
      { i: 1, f: 1, p: 'plain', s: 'recognized' },
    ],
  ].map((rows) => ({ rows })),
)('rejects duplicate, inconsistent or invalid compact results', ({ rows }) => {
  expect(() =>
    contract('compact', 2).decode({ items: rows.map(({ i, ...result }) => ({ i, result })) }),
  ).toThrow();
});
it('accepts completed API envelopes with explicitly null error and incomplete details', () => {
  expect(
    responseSchema.parse({ status: 'completed', error: null, incomplete_details: null, output: [] })
      .status,
  ).toBe('completed');
});
it('fixtures keep 40 hard cases separate from 160 throughput controls and shuffle deterministically', () => {
  expect(fixtures).toHaveLength(200);
  expect(fixtures.filter((item) => item.hard)).toHaveLength(40);
  expect(shuffled(fixtures, 42)).toEqual(shuffled(fixtures, 42));
  expect(() => contract('compact', 201)).toThrow();
});
