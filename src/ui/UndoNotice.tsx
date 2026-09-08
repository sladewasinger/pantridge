import { X } from 'lucide-react';
import { dismissNotice, useNotice } from './notice';
import { useAction } from './useAction';
export function UndoNotice() {
  const notice = useNotice();
  const { run, error, busy } = useAction();
  if (!notice) return null;
  return (
    <div className="undo-notice">
      <span role="status">{notice.message}</span>
      <button
        disabled={busy}
        onClick={() =>
          void run(async () => {
            await notice.undo();
            dismissNotice();
          })
        }
      >
        Undo
      </button>
      <button className="icon-button" aria-label="Dismiss notification" onClick={dismissNotice}>
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
