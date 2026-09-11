import { expect, it } from 'vitest';
import { matchArtwork } from '../../../src/domain/artwork/match';
import { artwork } from '../../../src/domain/artwork/catalog';

it.each([
  ['Bananas', 'bananas'],
  ['organic banana', 'bananas'],
  ['banannas', 'bananas'],
  ['great value sardines', 'plain-tin'],
  ['Canned mackeral', 'plain-tin'],
  ['Fresh oragne', 'orange'],
  ['ORANGES', 'orange'],
  ['Great Value Black Beans', 'can'],
  ['orange juice', 'orange-juice'],
  ['peanut butter', 'peanut-butter'],
  ['frozen broccoli', 'frozen-broccoli'],
  ['coconut milk', 'coconut-milk'],
  ['baby spinach', 'greens'],
  ['Mystery food', undefined],
  ['ban', undefined],
  ['banana apple', undefined],
  ['', undefined],
])('matches %s conservatively', (name, expected) => {
  expect(matchArtwork(name)).toBe(expected);
});

it('groups counter fruit under Pantry and keeps cucumber and zucchini under Fridge', () => {
  for (const id of ['apple', 'bananas', 'orange', 'lemon', 'lime'])
    expect(artwork.find((art) => art.id === id)?.group).toBe('Pantry');
  for (const id of ['cucumber', 'zucchini'])
    expect(artwork.find((art) => art.id === id)?.group).toBe('Fridge');
});
