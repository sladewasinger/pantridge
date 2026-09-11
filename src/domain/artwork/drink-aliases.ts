import type { ArtId } from './catalog';

// Shared by local matching, picker search, and classifier metadata.
export const drinkAliases: Partial<Record<ArtId, string[]>> = {
  'beer-bottle': ['beer', 'lager', 'pilsner', 'IPA', 'stout', 'ale'],
  'beer-can': ['canned beer', 'lager can', 'IPA can', 'stout can'],
  'red-wine': ['merlot', 'cabernet sauvignon', 'pinot noir', 'malbec', 'shiraz'],
  'white-wine': ['chardonnay', 'sauvignon blanc', 'pinot grigio', 'riesling'],
  'rose-wine': ['rosé', 'rosado'],
  'sparkling-wine': ['champagne', 'prosecco', 'cava'],
  whiskey: ['whisky', 'bourbon', 'scotch', 'rye whiskey', 'rye whisky'],
  vodka: ['vodka'],
  gin: ['London dry gin'],
  rum: ['white rum', 'dark rum', 'spiced rum'],
  tequila: ['tequila blanco', 'tequila reposado', 'tequila añejo'],
  brandy: ['cognac', 'armagnac'],
  chartreuse: ['chartreuse', 'chartreuse verte'],
  'yellow-chartreuse': ['chartreuse jaune'],
  liqueur: ['liqueur', 'triple sec', 'amaretto', 'limoncello', 'coffee liqueur'],
  'hard-cider': ['alcoholic cider'],
  vermouth: ['sweet vermouth', 'dry vermouth'],
  mezcal: ['mezcal'],
  'plain-amber-bottle': ['amber glass bottle', 'brown glass bottle'],
  'plain-green-bottle': ['green glass bottle'],
  'plain-clear-bottle': ['clear glass bottle', 'unmarked spirits bottle'],
};
