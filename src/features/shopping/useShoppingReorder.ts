import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { dispatch, getKitchen } from '../../data/store';
import type { ShoppingItem } from '../../domain/model';
import { useAction } from '../../ui/useAction';
import { keyboardTarget } from './reorder-target';
import { captureRows, clearPreview, previewMove, type DragRows } from './drag-layout';
import { moveShoppingItems } from '../../domain/shopping-commands';
interface Drag {
  item: ShoppingItem;
  handle: HTMLButtonElement;
  pointer: number;
  start: number;
  y: number;
  active: boolean;
  before: string | null;
  frame: number;
  scroll: number;
  row: HTMLElement;
  rows: DragRows;
}
export function useShoppingReorder(items: ShoppingItem[]) {
  const root = useRef<HTMLDivElement>(null);
  const gesture = useRef<Drag | null>(null);
  const [dragId, setDragId] = useState('');
  const [pendingMove, setPendingMove] = useState<{
    itemId: string;
    beforeId: string | null;
  } | null>(null);
  const [message, setMessage] = useState('');
  const instructions = useId();
  const { run, busy, error } = useAction();
  function release() {
    const active = gesture.current;
    if (!active) return;
    gesture.current = null;
    cancelAnimationFrame(active.frame);
    if (active.handle.hasPointerCapture(active.pointer))
      active.handle.releasePointerCapture(active.pointer);
    return active;
  }
  function reset(active: Drag) {
    clearPreview(root.current, active.rows);
    setDragId('');
  }
  function cancel() {
    const active = release();
    if (active) reset(active);
  }
  useEffect(() => {
    const list = root.current;
    return () => {
      const active = release();
      if (active) clearPreview(list, active.rows);
    };
  }, []);
  async function save(item: ShoppingItem, before: string | null) {
    setMessage('');
    setPendingMove({ itemId: item.id, beforeId: before });
    await run(async () => {
      await dispatch({ type: 'shopping.move', itemId: item.id, beforeId: before });
      const group = getKitchen().data.shopping.filter(
        (entry) => entry.purchased === item.purchased,
      );
      const position = group.findIndex((entry) => entry.id === item.id) + 1;
      setMessage(
        position ? item.name + ' moved to position ' + position + '.' : 'This item was removed.',
      );
    });
    setPendingMove(null);
  }
  function preview(active: Drag) {
    if (!root.current) return;
    const offset = active.y - active.start + window.scrollY - active.scroll;
    active.row.style.transform = 'translateY(' + offset + 'px) scale(1.025)';
    const original = active.rows.find((row) => row.id === active.item.id)!;
    active.before = previewMove(
      root.current,
      active.rows,
      active.item.id,
      original.top + offset + original.height / 2,
    );
  }
  function track(active: Drag) {
    if (gesture.current !== active) return;
    if (active.active) {
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop ?? 0;
      const bottom = top + (viewport?.height ?? window.innerHeight) - 80;
      const speed = active.y < top + 90 ? -8 : active.y > bottom - 40 ? 8 : 0;
      if (speed) window.scrollBy(0, speed);
      preview(active);
    }
    active.frame = requestAnimationFrame(() => track(active));
  }
  function start(event: PointerEvent<HTMLButtonElement>, item: ShoppingItem) {
    if (busy || !root.current || !event.isPrimary || event.button !== 0 || gesture.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      item,
      handle: event.currentTarget,
      pointer: event.pointerId,
      start: event.clientY,
      y: event.clientY,
      active: false,
      before: null,
      frame: 0,
      scroll: window.scrollY,
      row: event.currentTarget.closest<HTMLElement>('[data-shopping-id]')!,
      rows: captureRows(root.current, items, item),
    };
    track(gesture.current);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const active = gesture.current;
    if (!active || active.pointer !== event.pointerId) return;
    active.y = event.clientY;
    if (Math.abs(active.y - active.start) < 5 && !active.active) return;
    active.active = true;
    setDragId(active.item.id);
    preview(active);
  }
  function finish(event: PointerEvent<HTMLButtonElement>) {
    if (gesture.current?.pointer !== event.pointerId) return;
    const active = release();
    if (!active) return;
    reset(active);
    if (active.active) void save(active.item, active.before);
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, item: ShoppingItem) {
    if (event.key === 'Escape') {
      cancel();
      return;
    }
    const target = keyboardTarget(items, item, event.key);
    if (target === undefined) return;
    event.preventDefault();
    if (!busy) void save(item, target);
  }
  return {
    root,
    items: pendingMove
      ? moveShoppingItems(items, pendingMove.itemId, pendingMove.beforeId).toSorted(
          (a, b) => Number(a.purchased) - Number(b.purchased),
        )
      : items,
    dragId,
    instructions,
    message,
    busy,
    error,
    start,
    move,
    finish,
    cancel,
    keyboard,
  };
}
