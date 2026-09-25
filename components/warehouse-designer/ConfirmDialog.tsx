import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[280] flex items-end justify-center bg-[#5f5950]/45 p-3 backdrop-blur-sm min-[481px]:items-center"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="designer-confirm-title"
        aria-describedby="designer-confirm-body"
        className="w-full max-w-md rounded-lg border border-[#b6aa9b] bg-[#f7f3ec] p-5 text-[#2b2925] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg border ${tone === 'danger' ? 'border-red-500/25 bg-red-100 text-red-700' : 'border-[#5d7f81]/25 bg-[#dbe5e2] text-[#4d7275]'}`}>
          <AlertTriangle size={20} />
        </div>
        <h2 id="designer-confirm-title" className="text-lg font-black tracking-tight">
          {title}
        </h2>
        <p id="designer-confirm-body" className="mt-2 text-sm leading-6 text-[#6f675d]">
          {message}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 min-[481px]:flex-row min-[481px]:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[#c7bcae] bg-[#ede6dc] px-4 py-2.5 text-sm font-semibold text-[#5f5950] transition hover:bg-white"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${tone === 'danger' ? 'bg-red-600 hover:bg-red-500' : 'bg-[#45a3b8] hover:bg-[#3894a7]'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
