import type { Classification } from '../../src/domain/products/lookup';

const rules: [RegExp, Classification][] = [
  [/\bblack beans\b/, { name: 'Black Beans', unit: 'cans', art: 'can', location: 'pantry' }],
  [/\bwhole milk\b/, { name: 'Whole Milk', unit: 'cartons', art: 'milk', location: 'fridge' }],
  [/\bskim milk\b/, { name: 'Skim Milk', unit: 'cartons', art: 'milk', location: 'fridge' }],
  [
    /\bunsalted butter\b/,
    { name: 'Unsalted Butter', unit: 'packs', art: 'butter', location: 'fridge' },
  ],
  [
    /\bsalted butter\b/,
    { name: 'Salted Butter', unit: 'packs', art: 'butter', location: 'fridge' },
  ],
  [/\beggs\b/, { name: 'Eggs', unit: 'cartons', art: 'eggs', location: 'fridge' }],
  [/\bwhite rice\b/, { name: 'White Rice', unit: 'bags', art: 'rice', location: 'pantry' }],
  [/\bbrown rice\b/, { name: 'Brown Rice', unit: 'bags', art: 'rice', location: 'pantry' }],
  [/\bspaghetti\b/, { name: 'Spaghetti', unit: 'boxes', art: 'pasta', location: 'pantry' }],
];
export function classifyRules(name: string, brand: string, categories: string) {
  let generic = name;
  for (const part of brand
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean))
    generic = generic.replaceAll(new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
  generic =
    generic.replace(/\s+/g, ' ').trim().slice(0, 80) || name.trim().slice(0, 80) || 'Unknown food';
  const text = `${generic} ${categories}`.toLowerCase().replaceAll('-', ' ');
  // Preserve important variants rather than aggressively stripping descriptors.
  const match = rules.find(([pattern]) => pattern.test(generic.toLowerCase()));
  const simple =
    !!match &&
    !/\b(sauce|soup|mix|flavored|organic|dried|dry|refried|seasoned|low sodium|shelf stable|uht)\b/.test(
      text,
    );
  const suggestion: Classification = simple
    ? { ...match[1] }
    : {
        name: generic,
        location: 'pantry',
        unit: 'items',
        art: 'generic',
      };
  if (/\bfrozen\b/.test(text)) suggestion.location = 'freezer';
  if (/\b(dried|dry)\b/.test(text) && /\bblack beans\b/.test(text))
    Object.assign(suggestion, { name: 'Dried Black Beans', unit: 'bags', art: 'can' });
  return { suggestion, confident: simple };
}
