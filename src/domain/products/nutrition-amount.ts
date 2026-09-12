import type { Nutrients, Nutrition } from './nutrition';
import type { PackageSize } from './size';

export const nutritionUnits = {
  g: { basis: 'g', factor: 1 },
  oz: { basis: 'g', factor: 28.349523125 },
  kg: { basis: 'g', factor: 1000 },
  lb: { basis: 'g', factor: 453.59237 },
  ml: { basis: 'ml', factor: 1 },
  l: { basis: 'ml', factor: 1000 },
  'fl oz': { basis: 'ml', factor: 29.5735295625 },
  gal: { basis: 'ml', factor: 3785.411784 },
} as const;
export type NutritionUnit = keyof typeof nutritionUnits;
export function servingAmount(text = ''): { amount: number; unit: 'g' | 'ml' } | undefined {
  const matches = [...text.matchAll(/(?:^|[\s(])(\d+(?:\.\d+)?)\s*(fl\s*oz|kg|ml|lb|oz|g|l)\b/gi)];
  const match = matches.at(-1);
  if (!match) return undefined;
  const unit = match[2]!.toLowerCase().replace(/\s+/g, ' ') as NutritionUnit;
  const value = Number(match[1]) * nutritionUnits[unit].factor;
  return value > 0 && value <= 100000
    ? { amount: value, unit: nutritionUnits[unit].basis }
    : undefined;
}
export function packageAmount(size?: PackageSize) {
  if (!size || size.measure === 'count') return undefined;
  const unit = nutritionUnits[size.measure];
  return { amount: size.amount * size.packs * unit.factor, unit: unit.basis };
}
export function nutritionBasis(nutrition: Nutrition, size?: PackageSize) {
  return nutrition.basis ?? servingAmount(nutrition.serving)?.unit ?? packageAmount(size)?.unit;
}
export function scaleNutrition(values: Nutrients, factor: number): Nutrients {
  if (!Number.isFinite(factor) || factor < 0) return {};
  return Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, Math.round(value! * factor * 10) / 10]),
  );
}

export function nutritionContext(nutrition: Nutrition, size?: PackageSize, labelBasis = '') {
  const inferred = nutritionBasis(nutrition, size);
  const basis = inferred ?? labelBasis;
  const serving = servingAmount(nutrition.serving);
  const whole = packageAmount(size);
  const per100 = Object.values(nutrition.per100).some((value) => value !== undefined)
    ? nutrition.per100
    : scaleNutrition(nutrition.perServing ?? {}, serving ? 100 / serving.amount : NaN);
  const scalable = Object.keys(per100).length > 0;
  const wholeFactor = whole && whole.unit === basis && scalable ? whole.amount / 100 : undefined;
  const servings =
    whole && serving && whole.unit === serving.unit
      ? Math.round((whole.amount / serving.amount) * 10) / 10
      : undefined;
  const units = (Object.keys(nutritionUnits) as NutritionUnit[]).filter(
    (key) => nutritionUnits[key].basis === basis,
  );
  return { basis, needsBasis: !inferred, per100, scalable, wholeFactor, servings, units };
}

export function customNutrients(
  values: Nutrients,
  amount: string,
  unit: NutritionUnit,
  basis: string,
) {
  const number = amount.trim() === '' ? NaN : Number(amount);
  if (!basis || !Number.isFinite(number) || number < 0 || number > 100000) return {};
  if (nutritionUnits[unit].basis !== basis) return {};
  return scaleNutrition(values, (number * nutritionUnits[unit].factor) / 100);
}
