import type { Food } from '../model';
import { normalizeIngredientName } from '../recipes/names';

export const cookingDetails = [
  'brown',
  'white',
  'long-grain',
  'short-grain',
  'long',
  'short',
  'frozen',
] as const;
export type CookingDetail = (typeof cookingDetails)[number];
const families: Record<string, [string, CookingDetail?]> = {
  'black beans': ['Beans'],
  'pinto beans': ['Beans'],
  'kidney beans': ['Beans'],
  'white beans': ['Beans'],
  'cannellini beans': ['Beans'],
  beans: ['Beans'],
  rice: ['Rice'],
  'brown rice': ['Rice', 'brown'],
  'white rice': ['Rice', 'white'],
  'jasmine rice': ['Rice'],
  'basmati rice': ['Rice'],
  'long-grain rice': ['Rice', 'long-grain'],
  'short-grain rice': ['Rice', 'short-grain'],
  pasta: ['Pasta'],
  spaghetti: ['Pasta', 'long'],
  linguine: ['Pasta', 'long'],
  fettuccine: ['Pasta', 'long'],
  penne: ['Pasta', 'short'],
  macaroni: ['Pasta', 'short'],
  fusilli: ['Pasta', 'short'],
  rigatoni: ['Pasta', 'short'],
};
const preparation = /\b(canned|dried|dry|cooked|raw|uncooked|frozen|fresh)\b/g;
const neutral = /\b(chopped|diced|sliced|grated|shredded|peeled|organic|drained|rinsed)\b/g;
const formLabels: Record<string, string> = { dry: 'Dried', uncooked: 'Raw' };

// Suggestion families only. Never changes food identity, units, stock, or exact recipe matching.
export function suggestionGroup(food: Pick<Food, 'name' | 'frozen'>) {
  const original = normalizeIngredientName(food.name);
  const forms = [...new Set(original.match(preparation) ?? [])];
  if (forms.length > 1) return { name: food.name, details: [] as CookingDetail[] };
  const base = normalizeIngredientName(
    original.replace(preparation, '').replace(neutral, '').trim(),
  );
  const [family, detail] = families[base] ?? [base.charAt(0).toUpperCase() + base.slice(1)];
  const form = forms[0] ?? (food.frozen ? 'frozen' : '');
  const prefix = formLabels[form] ?? form.charAt(0).toUpperCase() + form.slice(1);
  const details: CookingDetail[] = detail ? [detail] : [];
  if (food.frozen && form !== 'frozen') details.push('frozen');
  return { name: prefix ? `${prefix} ${family.toLowerCase()}` : family, details };
}
