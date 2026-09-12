import { useEffect, useRef, useState, type PointerEvent, type MouseEvent } from 'react';
import { dispatch, getKitchen } from '../../data/store';
import type { Food } from '../../domain/model';

interface Gesture {
  foodId: string;
  pointerId: number;
  element: HTMLButtonElement;
  x: number;
  y: number;
  dragging: boolean;
  shelf: number | null;
  touch: boolean;
  timer?: ReturnType<typeof setTimeout>;
}
export function useShelfDrag() {
  const root = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const [target, setTarget] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function reset() {
    const active = gesture.current;
    gesture.current = null;
    clearTimeout(active?.timer);
    active?.element.classList.remove('dragging');
    active?.element.style.removeProperty('transform');
    if (active?.element.hasPointerCapture(active.pointerId))
      active.element.releasePointerCapture(active.pointerId);
    setTarget(null);
    return active;
  }
  useEffect(() => {
    const element = root.current;
    const preventDragScroll = (event: TouchEvent) => {
      if (gesture.current?.dragging && event.cancelable) event.preventDefault();
    };
    element?.addEventListener('touchmove', preventDragScroll, { passive: false });
    return () => {
      const active = gesture.current;
      clearTimeout(active?.timer);
      element?.removeEventListener('touchmove', preventDragScroll);
      if (active?.element.hasPointerCapture(active.pointerId))
        active.element.releasePointerCapture(active.pointerId);
    };
  }, []);

  function start(event: PointerEvent<HTMLButtonElement>, food: Food) {
    if (!event.isPrimary || event.button !== 0 || gesture.current) return;
    suppressClick.current = false;
    setError('');
    gesture.current = {
      foodId: food.id,
      pointerId: event.pointerId,
      element: event.currentTarget,
      x: event.clientX,
      y: event.clientY,
      dragging: false,
      shelf: null,
      touch: event.pointerType === 'touch',
    };
    const active = gesture.current;
    if (active.touch)
      active.timer = setTimeout(() => {
        if (gesture.current !== active) return;
        active.dragging = true;
        suppressClick.current = true;
        active.element.classList.add('dragging');
        active.element.style.transform = 'scale(1.06)';
      }, 500);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const active = gesture.current;
    if (!active || event.pointerId !== active.pointerId) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    if (active.touch && !active.dragging) {
      if (Math.hypot(dx, dy) >= 8) {
        suppressClick.current = true;
        reset();
      }
      return;
    }
    if (!active.dragging && Math.hypot(dx, dy) < 8) return;
    active.dragging = true;
    suppressClick.current = true;
    active.element.classList.add('dragging');
    active.element.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;
    const shelf = document
      .elementsFromPoint(event.clientX, event.clientY)
      .map((element) => element.closest<HTMLElement>('[data-shelf]'))
      .find((element) => element && root.current?.contains(element));
    active.shelf = shelf ? Number(shelf.dataset.shelf) : null;
    setTarget(active.shelf);
  }
  async function finish(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.pointerId !== event.pointerId) return;
    const active = reset();
    if (!active?.dragging || active.shelf === null) return;
    const food = getKitchen().data.foods.find((item) => item.id === active.foodId);
    if (!food || food.shelf === active.shelf) return;
    try {
      await dispatch({ type: 'food.save', food: { ...food, shelf: active.shelf } });
      setMessage(`${food.name} moved to the ${['top', 'middle', 'bottom'][active.shelf]} shelf.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not move this item.');
    }
  }
  function click(event: MouseEvent<HTMLDivElement>) {
    if (!suppressClick.current || event.detail === 0) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }
  return { root, target, message, error, start, move, finish, cancel: reset, click };
}
