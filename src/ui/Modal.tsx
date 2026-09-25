import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useModalViewport } from './useModalViewport';

export function Modal({
  title,
  onClose,
  children,
  placement = 'bottom',
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  placement?: 'top' | 'bottom';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useModalViewport(ref, placement === 'top');
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`sheet${placement === 'top' ? ' sheet-top' : ''}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="sheet-heading">
        <h2>{title}</h2>
        <button className="round" onClick={onClose} aria-label="Close">
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
