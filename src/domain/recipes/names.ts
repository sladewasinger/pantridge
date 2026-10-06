const aliases: Record<string, string> = {
  egg: 'eggs',
  tomato: 'tomatoes',
  potato: 'potatoes',
  onion: 'onions',
  carrot: 'carrots',
  'black bean': 'black beans',
  'kidney bean': 'kidney beans',
  chickpea: 'chickpeas',
  'garbanzo beans': 'chickpeas',
  'garbanzo bean': 'chickpeas',
  'bell pepper': 'bell peppers',
  scallions: 'green onions',
  scallion: 'green onions',
  'green onion': 'green onions',
  'chilli powder': 'chili powder',
};
// Identity aliases only: no fuzzy matching, brand stripping, or substitutions.
export function normalizeIngredientName(name: string): string {
  const normalized = name.toLowerCase().trim().replace(/\s+/g, ' ');
  return Object.hasOwn(aliases, normalized) ? aliases[normalized]! : normalized;
}
