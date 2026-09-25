import React from 'react';
import {
  Box, Download, Eye, Import, RefreshCw, RotateCcw, Save,
  RadioTower,
} from 'lucide-react';
import type { DesignerStats } from './warehouseTypes';

interface DesignerToolbarProps {
  warehouseName: string;
  dirty: boolean;
  stats: DesignerStats;
  rfidEnabled: boolean;
  rfidEndpointCount: number;
  onSave: () => void;
  onPreview3D: () => void;
  onExport: () => void;
  onExportClient: () => void;
  onImport: () => void;
  onResetView: () => void;
  onClearUnsaved: () => void;
  onOpenRfid: () => void;
}

const DesignerToolbar: React.FC<DesignerToolbarProps> = ({
  warehouseName,
  dirty,
  stats,
  rfidEnabled,
  rfidEndpointCount,
  onSave,
  onPreview3D,
  onExport,
  onExportClient,
  onImport,
  onResetView,
  onClearUnsaved,
  onOpenRfid,
}) => (
  <div className="border-b border-[#b6aa9b] bg-[#ede6dc] px-4 py-4">
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 min-[769px]:flex-row min-[769px]:items-end min-[769px]:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#7d7569]">Layout Studio</div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[#2b2925]">Virtual Warehouse Designer</h2>
          <p className="mt-1 text-sm text-[#6f675d]">Active warehouse: {warehouseName}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 min-[481px]:grid-cols-3 min-[1025px]:grid-cols-6">
          <StatusChip label={dirty ? 'Unsaved changes' : 'Saved'} value={dirty ? 'Draft' : 'Live'} highlight={dirty} />
          <StatusChip label="Rack count" value={String(stats.rackCount)} />
          <StatusChip label="Zone count" value={String(stats.zoneCount)} />
          <StatusChip label="Smart assets" value={String(stats.automationCount)} />
          <StatusChip label="Occupancy" value={`${stats.occupancyPercent}%`} />
          <StatusChip label="RFID Control" value={rfidEnabled ? `${rfidEndpointCount} Online` : 'Offline'} highlight={rfidEnabled} />
        </div>
      </div>

      <div className="app-scroll-x">
        <div className="flex min-w-max items-center gap-2">
          <ActionButton icon={<Save size={15} />} label="Save Layout" onClick={onSave} primary />
          <ActionButton icon={<Box size={15} />} label="Edit 3D Floor" onClick={onPreview3D} />
          <ActionButton icon={<RadioTower size={15} />} label="RFID Control" onClick={onOpenRfid} />
          <ActionButton icon={<Download size={15} />} label="Export Layout JSON" onClick={onExport} />
          <ActionButton icon={<Eye size={15} />} label="Export Client Preview" onClick={onExportClient} />
          <ActionButton icon={<Import size={15} />} label="Import Layout JSON" onClick={onImport} />
          <ActionButton icon={<RefreshCw size={15} />} label="Reset View" onClick={onResetView} />
          <ActionButton icon={<RotateCcw size={15} />} label="Clear Unsaved" onClick={onClearUnsaved} />
        </div>
      </div>
    </div>
  </div>
);

const StatusChip: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight = false }) => (
  <div className={`rounded-lg border px-3 py-3 ${highlight ? 'border-amber-500/35 bg-amber-100/70' : 'border-[#c7bcae] bg-[#f7f3ec]'}`}>
    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7d7569]">{label}</div>
    <div className={`mt-1 text-sm font-semibold ${highlight ? 'text-amber-900' : 'text-[#2b2925]'}`}>{value}</div>
  </div>
);

const ActionButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }> = ({
  icon,
  label,
  onClick,
  primary = false,
}) => (
  <button type="button"
    onClick={onClick}
    className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
      primary
        ? 'bg-[#45a3b8] text-white hover:bg-[#3894a7]'
        : 'border border-[#c7bcae] bg-[#f7f3ec] text-[#5f5950] hover:border-[#5d7f81] hover:bg-white hover:text-[#2b2925]'
    }`}
  >
    {icon}
    {label}
  </button>
);

export default DesignerToolbar;
