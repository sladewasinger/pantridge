import type { Nutrients, Nutrition } from '../../src/domain/products/nutrition';
import { servingAmount, packageAmount } from '../../src/domain/products/nutrition-amount';
import { parseSize } from '../../src/domain/products/size';

const keys: [keyof Nutrients, string, number][] = [
  ['calories', 'energy-kcal', 1],
  ['fat', 'fat', 1],
  ['saturatedFat', 'saturated-fat', 1],
  ['carbohydrates', 'carbohydrates', 1],
  ['sugars', 'sugars', 1],
  ['fiber', 'fiber', 1],
  ['protein', 'proteins', 1],
  ['sodium', 'sodium', 1000],
];
function readAmount(value: unknown, scale = 1): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value * scale > 100000)
    return undefined;
  return Math.round(value * scale * 100) / 100;
}
function readBasis(data: Record<string, unknown>, suffix: string): Nutrients {
  const result: Nutrients = {};
  for (const [key, name, scale] of keys) {
    const value = readAmount(data[`${name}_${suffix}`], scale);
    if (value !== undefined) result[key] = value;
  }
  if (result.calories === undefined)
    result.calories = readAmount(data[`energy-kj_${suffix}`], 1 / 4.184);
  return result;
}
export function readNutrition(
  data: Record<string, unknown> | undefined,
  serving: string,
  absent: string,
  packageText = '',
): Nutrition | undefined {
  if (!data || absent === 'on') return undefined;
  const per100 = readBasis(data, '100g');
  const perServing = readBasis(data, 'serving');
  const hasValues = (values: Nutrients) =>
    Object.values(values).some((value) => value !== undefined);
  if (!hasValues(per100) && !hasValues(perServing)) return undefined;
  const basis = servingAmount(serving)?.unit ?? packageAmount(parseSize(packageText))?.unit;
  return {
    per100,
    ...(basis ? { basis } : {}),
    ...(hasValues(perServing) ? { perServing } : {}),
    ...(serving ? { serving: serving.slice(0, 80) } : {}),
  };
}
