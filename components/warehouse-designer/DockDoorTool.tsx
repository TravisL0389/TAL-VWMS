import React from 'react';
import { DoorOpen } from 'lucide-react';

interface DockDoorToolProps {
  onAddDockDoor: () => void;
}

const DockDoorTool: React.FC<DockDoorToolProps> = ({ onAddDockDoor }) => (
  <div className="rounded-lg border border-[#c7bcae] bg-[#f7f3ec] p-4">
    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#2b2925]">
      <DoorOpen size={16} className="text-[#a47625]" />
      Dock Doors / Entrances
    </div>
    <p className="mb-4 text-sm leading-6 text-[#6f675d]">
      Mark receiving or shipping access points so the 2D plan and 3D preview share the same flow anchors.
    </p>
    <button type="button"
      onClick={onAddDockDoor}
      className="w-full rounded-lg bg-[#eee0c2] px-4 py-2.5 text-sm font-semibold text-[#75571f] transition hover:bg-[#e7d3aa]"
    >
      Add Dock Door
    </button>
  </div>
);

export default DockDoorTool;
