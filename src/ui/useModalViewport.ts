import { useEffect, type RefObject } from 'react';

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
        const focused = document.activeElement;
        if (!(focused instanceof HTMLElement) || !dialog!.contains(focused)) return;
        const box = focused.getBoundingClientRect();
        const top = Math.max(dialog!.getBoundingClientRect().top, viewport!.offsetTop) + 12;
        const bottom = viewport!.offsetTop + viewport!.height - 16;
        if (box.bottom > bottom) dialog!.scrollTop += box.bottom - bottom;
        else if (box.top < top) dialog!.scrollTop -= top - box.top;
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
