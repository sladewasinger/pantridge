import { artwork, type ArtId } from './catalog';
import { tokens, wordSimilarity } from './words';
import { drinkAliases } from './drink-aliases';

const aliases: Partial<Record<ArtId, string[]>> = {
  ...drinkAliases,
  greens: ['lettuce', 'spinach', 'kale', 'salad greens'],
  'plain-tin': ['sardines', 'oysters', 'mackerel', 'anchovies'],
  'bell-pepper': ['capsicum', 'bell peppers'],
  'green-onions': ['scallions', 'spring onions'],
  'ground-beef': ['minced beef', 'hamburger meat'],
  chips: ['chips', 'crisps'],
  pasta: ['spaghetti', 'penne', 'macaroni'],
};
const candidates = artwork.map((art) => ({
  id: art.id,
  terms: [
    art.group === 'Packaging' || art.group === 'Drinks'
      ? art.label
      : art.label.replace(/\b(carton|cup|can|box|bag|tub)\b/gi, ''),
    ...(aliases[art.id] ?? []),
  ].map(tokens),
}));

function termScore(query: string[], term: string[]): number {
  const remaining = new Set(query);
  let quality = 0;
  for (const word of term) {
    const matches = [...remaining]
      .map((candidate) => ({ candidate, score: wordSimilarity(word, candidate) }))
      .sort((a, b) => b.score - a.score);
    const best = matches[0];
    if (!best?.score) return 0;
    remaining.delete(best.candidate);
    quality += best.score;
  }
  return term.length * 2 + quality / term.length;
}

// Extra brand words are harmless, but incomplete or ambiguous food names do not guess.
export function matchArtwork(name: string): ArtId | undefined {
  const query = tokens(name.slice(0, 80));
  if (!query.length) return undefined;
  const ranked = candidates
    .map(({ id, terms }) => ({
      id,
      score: Math.max(...terms.map((term) => termScore(query, term))),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
  const [best, next] = ranked;
  if (!best || (next && best.score - next.score < 0.15)) return undefined;
  return best.id;
}
