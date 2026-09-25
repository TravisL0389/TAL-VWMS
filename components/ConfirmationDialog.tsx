import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'neutral';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Shared confirmation dialog used in place of browser confirm prompts.
 */
const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}) => (
  <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[#8f8679]/45 p-4 backdrop-blur-sm" onClick={onCancel}>
    <div
      className="w-full max-w-md rounded-2xl border border-[#b6aa9b] bg-[#f4f0e8] p-5 shadow-2xl"
      onClick={(event) => event.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          tone === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-[#dbe8e8] text-[#5d7f81]'
        }`}>
          <AlertTriangle size={18} />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-black tracking-tight text-[#232321]">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#5d564d]">{message}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button"
          onClick={onCancel}
          className="min-h-[2.5rem] rounded-lg border border-[#c7bcae] px-4 py-2 text-sm font-semibold text-[#5d564d] transition hover:bg-[#ece6dd] hover:text-[#232321]"
        >
          {cancelLabel}
        </button>
        <button type="button"
          onClick={onConfirm}
          className={`min-h-[2.5rem] rounded-lg px-4 py-2 text-sm font-black text-white transition ${
            tone === 'danger'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-[#5d7f81] hover:bg-[#4f7172]'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default ConfirmationDialog;
