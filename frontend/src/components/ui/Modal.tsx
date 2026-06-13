import { useEffect } from 'react';

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** default: mobile full / sm:max-w-lg; wide: sm:max-w-3xl; xl: sm:max-w-5xl lg:max-w-6xl */
  size?: 'default' | 'wide' | 'xl';
};

const sizeClass: Record<NonNullable<ModalProps['size']>, string> = {
  default: 'sm:max-w-lg',
  wide: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl lg:max-w-6xl',
};

export function Modal({ open, title, onClose, children, footer, size = 'default' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Aizvērt"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 flex w-full min-w-0 ${sizeClass[size]} max-h-[92vh] sm:max-h-[90vh] flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-xl`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Aizvērt"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5">{children}</div>
        {footer && (
          <div className="border-t border-gray-100 px-4 py-3 sm:px-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
