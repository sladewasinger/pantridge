import type { Recipe } from '../../domain/recipes/model';

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
export function dateLabel(date: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
    new Date(`${date}T12:00:00`),
  );
}
