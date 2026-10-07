import type { Recipe } from '../../domain/recipes/model';
export { dateLabel } from '../../domain/selectors';

export function amountLabel(quantity: number, unit: string): string {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(quantity)} ${unit}`;
}
export function recipeMeta(recipe: Recipe): string {
  return [
    recipe.minutes ? `${recipe.minutes} min` : '',
    `${recipe.servings} ${recipe.servings === 1 ? 'serving' : 'servings'}`,
    recipe.cuisine,
  ]
    .filter(Boolean)
    .join(' · ');
}
export function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
