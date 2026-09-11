import { expect, it } from 'vitest';
import { matchArtwork } from '../../../src/domain/artwork/match';
import { artwork, artworkMetadata } from '../../../src/domain/artwork/catalog';

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
  ['Sierra Nevada beer', 'beer-bottle'],
  ['Guinness stout can', 'beer-can'],
  ['Beer bottle', 'beer-bottle'],
  ['Beer can', 'beer-can'],
  ['Maker’s Mark bourbon whisky', 'whiskey'],
  ['Chartreuse', 'chartreuse'],
  ['Green Chartreuse', 'chartreuse'],
  ['Yellow Chartreuse', 'yellow-chartreuse'],
  ['Chartreuse jaune', 'yellow-chartreuse'],
  ['Chartreusse', 'chartreuse'],
  ['Kirkland London dry gin', 'gin'],
  ['Tito’s vodka', 'vodka'],
  ['Espolòn tequila reposado', 'tequila'],
  ['Hennessy cognac', 'brandy'],
  ['Pinot noir', 'red-wine'],
  ['Sauvignon blanc', 'white-wine'],
  ['Rosé wine', 'rose-wine'],
  ['Prosecco', 'sparkling-wine'],
  ['Hard cider', 'hard-cider'],
  ['Plain amber bottle', 'plain-amber-bottle'],
  ['Unmarked spirits bottle', 'plain-clear-bottle'],
  ['Mystery drink', undefined],
  ['Mystery food', undefined],
  ['ban', undefined],
  ['banana apple', undefined],
  ['', undefined],
])('matches %s conservatively', (name, expected) => {
  expect(matchArtwork(name)).toBe(expected);
});

it('exposes drink aliases and plain bottle metadata to the classifier', () => {
  expect(artworkMetadata.find(({ id }) => id === 'whiskey')).toMatchObject({
    label: 'Whiskey',
    shape: 'square bottle',
    plain: false,
    keywords: expect.stringContaining('bourbon'),
  });
  expect(artworkMetadata.find(({ id }) => id === 'plain-clear-bottle')).toMatchObject({
    label: 'Plain clear bottle',
    plain: true,
  });
  expect(artwork.filter(({ group }) => group === 'Drinks')).toHaveLength(18);
  expect(new Set(artwork.map(({ id }) => id)).size).toBe(artwork.length);
});

it('groups counter fruit under Pantry and keeps cucumber and zucchini under Fridge', () => {
  for (const id of ['apple', 'bananas', 'orange', 'lemon', 'lime'])
    expect(artwork.find((art) => art.id === id)?.group).toBe('Pantry');
  for (const id of ['cucumber', 'zucchini'])
    expect(artwork.find((art) => art.id === id)?.group).toBe('Fridge');
});
