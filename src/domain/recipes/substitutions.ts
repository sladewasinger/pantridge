import { normalizeIngredientName } from './names';

interface Substitution {
  name: string;
  note: string;
}
const suggestions: Record<string, Substitution[]> = {
  'black beans': [
    {
      name: 'Kidney beans',
      note: 'Use cooked beans; flavor and texture will differ. Review the recipe and amount.',
    },
  ],
  'kidney beans': [
    {
      name: 'Black beans',
      note: 'Use cooked beans; flavor and texture will differ. Review the recipe and amount.',
    },
  ],
  pasta: [
    {
      name: 'Gluten-free pasta',
      note: 'Check allergens and package cooking time. This is a separate ingredient identity.',
    },
  ],
  butter: [
    {
      name: 'Olive oil',
      note: 'May work for sautéing; not a universal baking substitution. Review amount and flavor.',
    },
  ],
  milk: [
    {
      name: 'Unsweetened oat milk',
      note: 'Check dietary needs and allergens; cooking and baking results can differ.',
    },
  ],
};
// Advisory only: no matching, inventory updates, or asserted dietary safety.
export function getSubstitutions(name: string): Substitution[] {
  const normalized = normalizeIngredientName(name);
  return Object.hasOwn(suggestions, normalized) ? suggestions[normalized]! : [];
}
