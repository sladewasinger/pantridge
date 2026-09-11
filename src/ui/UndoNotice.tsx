import { X } from 'lucide-react';
import { dismissNotice, useNotice, pauseNotice, resumeNotice } from './notice';
import { useAction } from './useAction';
export function UndoNotice() {
  const notice = useNotice();
  const { run, error, busy } = useAction();
  if (!notice) return null;
  return (
    <div
      className="undo-notice"
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
