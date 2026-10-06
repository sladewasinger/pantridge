import type { RecipeIngredient, RecipeUnit } from './model';

const measures: Record<string, RecipeUnit> = {
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  l: 'l',
  liter: 'l',
  liters: 'l',
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  cup: 'cup',
  cups: 'cup',
  count: 'count',
  item: 'count',
  items: 'count',
  gal: 'gal',
  gallon: 'gal',
  gallons: 'gal',
};
const fractions: Record<string, string> = {
  '¼': ' 1/4',
  '½': ' 1/2',
  '¾': ' 3/4',
  '⅓': ' 1/3',
  '⅔': ' 2/3',
  '⅛': ' 1/8',
  '⅜': ' 3/8',
  '⅝': ' 5/8',
  '⅞': ' 7/8',
};
function amount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .reduce((sum, part) => {
      const [numerator = '', denominator] = part.split('/');
      return sum + Number(numerator) / (denominator ? Number(denominator) : 1);
    }, 0);
}
function measureAndName(remainder: string): { name: string; unit: RecipeUnit; note?: string } {
  const volume = /^(?:fl\.?\s*oz\.?|fluid ounces?)\s+(.+)$/i.exec(remainder);
  const [first = '', ...words] = remainder.split(/\s+/);
  const container =
    /^(?:cans?|cartons?|packs?|packages?|bags?|boxes?|bottles?|jars?|tubs?)\b/i.test(remainder);
  const unit = container
    ? 'package'
    : volume
      ? 'fl oz'
      : (measures[first.toLowerCase().replace(/\.$/, '')] ?? 'count');
  const name =
    volume?.[1] ??
    (container || measures[first.toLowerCase().replace(/\.$/, '')] ? words.join(' ') : remainder);
  return {
    name,
    unit,
    ...(container ? { note: `Review the size of each ${first}; imported as packages.` } : {}),
  };
}
export function parseIngredient(line: string, ingredientId: string): RecipeIngredient {
  const clean = line
    .trim()
    .replace(/^[-*•]\s*/, '')
    .replace(/[¼½¾⅓⅔⅛⅜⅝⅞]/g, (value) => fractions[value] ?? value);
  const match = /^(\d+(?:\.\d+)?(?:\s+\d+\/\d+|\/\d+)?)\s+(.+)$/.exec(clean.trim());
  if (!match?.[1] || !match[2]) throw new Error(`Add a numeric amount for “${line.slice(0, 60)}”.`);
  const quantity = amount(match[1]);
  const remainder = match[2].trim();
  const { name, unit, note } = measureAndName(remainder);
  if (/^(?:pinch|handful|bunch)\b/i.test(remainder))
    throw new Error(
      `Use a weight, volume, or individual count for “${line.slice(0, 60)}” so package amounts are clear.`,
    );
  if (!name.trim() || !Number.isFinite(quantity) || quantity <= 0)
    throw new Error(`Review the amount and name for “${line.slice(0, 60)}”.`);
  return {
    id: ingredientId,
    name: name.trim(),
    quantity,
    unit,
    ...(note ? { note } : {}),
  };
}
