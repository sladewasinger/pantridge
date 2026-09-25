import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useModalViewport } from './useModalViewport';

export function Modal({
  title,
  onClose,
  children,
  placement = 'bottom',
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  placement?: 'top' | 'bottom';
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useModalViewport(ref, placement === 'top');
  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.getAnimations().forEach((animation) => animation.cancel());
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`sheet${placement === 'top' ? ' sheet-top' : ''}${footer ? ' sheet-framed' : ''}`}
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
      {footer ? (
        <>
          <div className="sheet-body">{children}</div>
          <div className="sheet-footer">{footer}</div>
        </>
      ) : (
        children
      )}
    </dialog>
  );
}
