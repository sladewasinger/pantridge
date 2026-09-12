import { X } from 'lucide-react';
import { dismissNotice, useNotice, pauseNotice, resumeNotice } from './notice';
import { useAction } from './useAction';
import { useEffect, useRef } from 'react';
export function UndoNotice({ position = 'bottom' }: { position?: 'top' | 'bottom' }) {
  const notice = useNotice();
  const { run, error, busy } = useAction();
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const banner = element.current;
    const dialog = banner?.closest('dialog');
    if (position !== 'top' || !banner || !dialog) return;
    const measure = () =>
      dialog.style.setProperty('--notice-space', `${banner.getBoundingClientRect().bottom + 12}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(banner);
    measure();
    return () => {
      observer.disconnect();
      dialog.style.removeProperty('--notice-space');
    };
  }, [notice, position]);
  if (!notice) return null;
  return (
    <div
      ref={element}
      className={`undo-notice${position === 'top' ? ' notice-top' : ''}`}
      onPointerEnter={pauseNotice}
      onPointerLeave={resumeNotice}
      onFocusCapture={pauseNotice}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) resumeNotice();
      }}
    >
      <span role="status">{notice.message}</span>
      <button
        disabled={busy}
        onClick={() =>
          void run(async () => {
            pauseNotice();
            try {
              await notice.undo();
              dismissNotice(notice);
            } finally {
              resumeNotice();
            }
          })
        }
      >
        Undo
      </button>
      <button
        className="icon-button"
        aria-label="Dismiss notification"
        onClick={() => dismissNotice(notice)}
      >
        <X size={16} />
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
