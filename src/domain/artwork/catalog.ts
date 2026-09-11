import { fridgeArt } from './fridge';
import { pantryArt } from './pantry';
import { freezerArt } from './freezer';
import { packagingArt } from './packaging';

export const artworkGroups = ['All', 'Fridge', 'Pantry', 'Freezer', 'Packaging'] as const;
export type ArtworkGroup = (typeof artworkGroups)[number];
const entries = [...fridgeArt, ...pantryArt, ...freezerArt, ...packagingArt] as const;
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
function groupFor(id: ArtId, index: number): ArtworkGroup {
  if (pantryFruit.includes(id)) return 'Pantry';
  if (index < fridgeArt.length) return 'Fridge';
  if (index < fridgeArt.length + pantryArt.length) return 'Pantry';
  return index < entries.length - packagingArt.length ? 'Freezer' : 'Packaging';
}
export const artwork = entries.map(([id, label, src, shape], index) => ({
  id,
  label,
  src,
  shape: legacyShapes[id] ?? shape,
  keywords: aliases[id] ?? '',
  group: groupFor(id, index),
}));
const byId = new Map(artwork.map((entry) => [entry.id, entry]));
export const artPath = (id: ArtId) => byId.get(id)!.src;
export const artworkVersion = 'food-art-v1';
// Public, stable metadata only. Personal kitchen choices never enter the classifier prompt.
export const artworkMetadata = artwork.map(({ id, label, shape, group, keywords }) => ({
  id,
  label,
  shape,
  plain: group === 'Packaging',
  ...(keywords ? { keywords } : {}),
}));
