import React from 'react';
import { AlertTriangle, RotateCcw, Save } from 'lucide-react';

interface SaveBarProps {
  dirty: boolean;
  objectCount: number;
  onSave: () => void;
  onDiscard: () => void;
}

const SaveBar: React.FC<SaveBarProps> = ({ dirty, objectCount, onSave, onDiscard }) => {
  if (!dirty) return null;

  return (
    <div className="sticky bottom-0 border-t border-[#b6aa9b] bg-[#ede6dc]/95 p-3 backdrop-blur">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800">
        <AlertTriangle size={12} />
        Unsaved layout changes
      </div>
      <div className="mb-3 text-sm text-[#6f675d]">
        {objectCount} draft object{objectCount === 1 ? '' : 's'} will stay local until you save the layout.
      </div>
      <div className="flex flex-col gap-2 min-[481px]:flex-row">
        <button type="button"
          onClick={onDiscard}
          className="flex items-center justify-center gap-2 rounded-lg border border-[#c7bcae] bg-[#f7f3ec] px-4 py-2.5 text-sm font-semibold text-[#5f5950] transition hover:border-[#5d7f81] hover:bg-white"
        >
          <RotateCcw size={14} />
          Discard Changes
        </button>
        <button type="button"
          onClick={onSave}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#45a3b8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3894a7]"
        >
          <Save size={14} />
          Save Layout
        </button>
      </div>
    </div>
  );
};

export default SaveBar;
