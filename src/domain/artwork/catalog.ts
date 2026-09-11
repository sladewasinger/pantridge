import { fridgeArt } from './fridge';
import { pantryArt } from './pantry';
import { freezerArt } from './freezer';
import { packagingArt } from './packaging';
import { householdArt } from './household';
import { drinksArt } from './drinks';
import { drinkAliases } from './drink-aliases';

export const artworkGroups = [
  'All',
  'Fridge',
  'Pantry',
  'Freezer',
  'Drinks',
  'Packaging',
  'Household',
] as const;
export type ArtworkGroup = (typeof artworkGroups)[number];
const entries = [
  ...fridgeArt,
  ...pantryArt,
  ...freezerArt,
  ...packagingArt,
  ...householdArt,
  ...drinksArt,
] as const;
export type ArtId = (typeof entries)[number][0];
export const artIds = entries.map(([id]) => id);
const legacyShapes: Partial<Record<ArtId, string>> = {
  eggs: 'egg carton',
  milk: 'carton',
  butter: 'unwrapped butter',
  yogurt: 'cup',
  greens: 'loose leaves',
  carrots: 'loose carrots',
  apple: 'whole fruit',
  fish: 'bag with fish illustration',
  can: 'can with bean illustration',
  pasta: 'box',
  rice: 'bag',
  oats: 'tub',
  bread: 'loaf',
};
const aliases: Partial<Record<ArtId, string>> = {
  'plain-tin': 'sardines oysters mackerel anchovies seafood unmarked',
  'plain-can': 'canned food unmarked',
  'plain-bag': 'snacks chips crisps unmarked',
  'plain-box': 'crackers biscuits carton unmarked',
  generic: 'paper grocery shopping bag unmarked',
  greens: 'lettuce spinach kale salad',
  'bell-pepper': 'capsicum peppers',
  'green-onions': 'scallions spring onions',
  'ground-beef': 'minced beef hamburger',
};
const pantryFruit: readonly ArtId[] = ['apple', 'bananas', 'orange', 'lemon', 'lime'];
const groupedEntries = [
  ['Fridge', fridgeArt],
  ['Pantry', pantryArt],
  ['Freezer', freezerArt],
  ['Packaging', packagingArt],
  ['Household', householdArt],
  ['Drinks', drinksArt],
] as const;
const groupsById = new Map<ArtId, ArtworkGroup>(
  groupedEntries.flatMap(([group, items]) => items.map(([id]) => [id, group] as const)),
);
function groupFor(id: ArtId): ArtworkGroup {
  if (pantryFruit.includes(id)) return 'Pantry';
  return groupsById.get(id)!;
}
function packageShape(shape: string): string {
  if (!shape.startsWith('drink-')) return shape;
  return shape === 'drink-can' ? 'can' : `${shape.slice(6)} bottle`;
}
export const artwork = entries.map(([id, label, src, shape]) => ({
  id,
  label,
  src,
  shape: legacyShapes[id] ?? packageShape(shape),
  keywords: aliases[id] ?? drinkAliases[id]?.join(' ') ?? '',
  group: groupFor(id),
}));
const byId = new Map(artwork.map((entry) => [entry.id, entry]));
export const artPath = (id: ArtId) => byId.get(id)!.src;
export const artworkVersion = 'food-art-v3';
// Public, stable metadata only. Personal kitchen choices never enter the classifier prompt.
export const artworkMetadata = artwork.map(({ id, label, shape, group, keywords }) => ({
  id,
  label,
  shape,
  plain: group === 'Packaging',
  ...(keywords ? { keywords } : {}),
}));
