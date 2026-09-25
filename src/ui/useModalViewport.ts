import { useEffect, type RefObject } from 'react';

function keepFocusVisible(dialog: HTMLDialogElement, viewport: VisualViewport) {
  const scroller = dialog.querySelector<HTMLElement>('.sheet-body') ?? dialog;
  const focused = document.activeElement;
  if (!(focused instanceof HTMLElement) || !scroller.contains(focused)) return;
  const box = focused.getBoundingClientRect();
  const region = scroller.getBoundingClientRect();
  const top = Math.max(region.top, viewport.offsetTop) + 8;
  const bottom = Math.min(region.bottom, viewport.offsetTop + viewport.height) - 8;
  if (box.bottom > bottom) scroller.scrollTop += box.bottom - bottom;
  else if (box.top < top) scroller.scrollTop -= top - box.top;
}

export function useModalViewport(ref: RefObject<HTMLDialogElement | null>, enabled: boolean) {
  useEffect(() => {
    const dialog = ref.current;
    const viewport = window.visualViewport;
    if (!enabled || !dialog || !viewport) return;
    let frame = 0;
    function measure() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        dialog!.style.setProperty('--viewport-top', `${viewport!.offsetTop}px`);
        dialog!.style.setProperty('--viewport-height', `${viewport!.height}px`);
        keepFocusVisible(dialog!, viewport!);
      });
    }
    measure();
    viewport.addEventListener('resize', measure);
    viewport.addEventListener('scroll', measure);
    dialog.addEventListener('focusin', measure);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', measure);
      viewport.removeEventListener('scroll', measure);
      dialog.removeEventListener('focusin', measure);
    };
  }, [enabled, ref]);
}
