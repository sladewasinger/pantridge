import type { ShoppingItem } from '../../domain/model';
export function captureRows(root: HTMLElement, items: ShoppingItem[], selected: ShoppingItem) {
  const nodes = [...root.querySelectorAll<HTMLElement>('[data-shopping-id]')];
  return items
    .filter((item) => item.purchased === selected.purchased)
    .flatMap((item) => {
      const element = nodes.find((node) => node.dataset.shoppingId === item.id);
      if (!element) return [];
      const box = element.getBoundingClientRect();
      return [{ id: item.id, element, top: box.top + window.scrollY, height: box.height }];
    });
}
export type DragRows = ReturnType<typeof captureRows>;
export function previewMove(root: HTMLElement, rows: DragRows, itemId: string, center: number) {
  const source = rows.findIndex((row) => row.id === itemId);
  const selected = rows[source]!;
  const others = rows.filter((row) => row.id !== itemId);
  const before = others.find((row) => center < row.top + row.height / 2);
  const destination = before ? others.indexOf(before) : others.length;
  rows.forEach((row, index) => {
    if (index === source) return;
    let offset = 0;
    if (index > source && index <= destination) offset = -selected.height;
    if (index < source && index >= destination) offset = selected.height;
    row.element.style.transform = `translateY(${offset}px)`;
  });
  const target = rows[destination]!;
  const top = destination > source ? target.top + target.height - selected.height : target.top;
  root.style.setProperty(
    '--drop-top',
    `${top - root.getBoundingClientRect().top - window.scrollY}px`,
  );
  root.style.setProperty('--drop-height', `${selected.height}px`);
  return before?.id ?? null;
}
export function clearPreview(root: HTMLElement | null, rows: DragRows) {
  rows.forEach(({ element }) => {
    element.style.removeProperty('transform');
    element.getAnimations().forEach((animation) => animation.cancel());
  });
  root?.style.removeProperty('--drop-top');
  root?.style.removeProperty('--drop-height');
}
