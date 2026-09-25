import type { ShoppingItem } from '../../domain/model';

export function keyboardTarget(items: ShoppingItem[], item: ShoppingItem, key: string) {
  const group = items.filter((entry) => entry.purchased === item.purchased);
  const index = group.findIndex((entry) => entry.id === item.id);
  if (key === 'ArrowUp' && index > 0) return group[index - 1]!.id;
  if (key === 'ArrowDown' && index < group.length - 1) return group[index + 2]?.id ?? null;
  if (key === 'Home') return group[0]?.id;
  if (key === 'End') return null;
  return undefined;
}
