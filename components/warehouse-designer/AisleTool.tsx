import React from 'react';
import { MoveHorizontal } from 'lucide-react';

interface AisleToolProps {
  onAddAisle: () => void;
}

const AisleTool: React.FC<AisleToolProps> = ({ onAddAisle }) => (
  <div className="rounded-lg border border-[#c7bcae] bg-[#f7f3ec] p-4">
    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#2b2925]">
      <MoveHorizontal size={16} className="text-[#5d7f81]" />
      Aisles & Walkways
    </div>
    <p className="mb-4 text-sm leading-6 text-[#6f675d]">
      Add circulation lanes to shape pick flow, spacing, and safe movement through the floor.
    </p>
    <button type="button"
      onClick={onAddAisle}
      className="w-full rounded-lg bg-[#dbe5e2] px-4 py-2.5 text-sm font-semibold text-[#355f62] transition hover:bg-[#c9dbd6]"
    >
      Add Aisle
    </button>
  </div>
);

export default AisleTool;
