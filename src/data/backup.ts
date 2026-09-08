import { snapshotSchema } from '../domain/model';
import { dispatchMany, getKitchen } from './store';
import type { Command } from '../domain/commands';

export function exportKitchen(): void {
  const blob = new Blob([JSON.stringify(getKitchen().data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pantridge-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function restoreKitchen(file: File): Promise<void> {
  const current = getKitchen().data;
  if (current.foods.length || current.shopping.length)
    throw new Error('Restore into an empty kitchen to avoid overwriting your food.');
  if (file.size > 300_000) throw new Error('This backup is too large.');
  const data = snapshotSchema.parse(JSON.parse(await file.text()));
  const commands: Command[] = [
    ...data.foods.map((food) => ({ type: 'food.save' as const, food })),
    ...data.stock.map((stock) => ({ type: 'stock.add' as const, stock })),
    ...data.shopping.map((item) => ({ type: 'shopping.save' as const, item })),
  ];
  await dispatchMany(commands, true);
}
