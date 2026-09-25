import React from 'react';
import {
  BatteryCharging, Bot, Box, Boxes, Camera, Cctv, CircleDot, DoorOpen, Forklift,
  PackageCheck, PackageOpen, ShieldAlert, ShieldCheck, SquareDashedMousePointer,
  RadioTower, Router, ScanLine, Truck, Warehouse,
} from 'lucide-react';
import type { WarehouseFloorObject } from './warehouseTypes';

interface RackCardProps {
  object: WarehouseFloorObject;
  color: string;
  selected: boolean;
  showLabels: boolean;
  conflictCount: number;
  occupancyPercent: number;
  rfidSystemEnabled: boolean;
  onSelect: () => void;
  onPointerDown: (event: React.MouseEvent | React.TouchEvent) => void;
}

const TYPE_ICONS = {
  RACK: Box,
  PALLET: Boxes,
  CONVEYOR: PackageOpen,
  PACK_STATION: Warehouse,
  FORKLIFT: Forklift,
  AMR: Bot,
  CHARGING_STATION: BatteryCharging,
  SAFETY_BARRIER: ShieldCheck,
  IOT_SENSOR: Cctv,
  CAMERA: Camera,
  RFID_ANTENNA: RadioTower,
  RFID_PORTAL: ScanLine,
  RFID_READER: Router,
  ZONE: SquareDashedMousePointer,
  AISLE: CircleDot,
  DOCK_DOOR: DoorOpen,
  STAGING: PackageCheck,
  RECEIVING: Truck,
  SHIPPING: Truck,
  OFFICE: Warehouse,
  RESTRICTED: ShieldAlert,
} as const;

const RackCard: React.FC<RackCardProps> = ({
  object,
  color,
  selected,
  showLabels,
  conflictCount,
  occupancyPercent,
  rfidSystemEnabled,
  onSelect,
  onPointerDown,
}) => {
  const Icon = TYPE_ICONS[object.type];
  const statusTone =
    object.status === 'MAINTENANCE'
      ? 'border-amber-500/40 bg-amber-100/80 text-amber-900'
      : object.status === 'OFFLINE'
        ? 'border-rose-500/40 bg-rose-100/80 text-rose-900'
        : 'border-emerald-500/40 bg-emerald-100/80 text-emerald-900';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Select ${object.name}`}
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`absolute select-none overflow-hidden rounded-lg border transition-shadow focus:outline-none focus:ring-2 focus:ring-[#5d7f81] ${
        selected ? 'shadow-[0_0_0_2px_rgba(69,163,184,0.7),0_18px_40px_rgba(0,0,0,0.22)]' : 'shadow-[0_12px_24px_rgba(0,0,0,0.18)]'
      } ${conflictCount > 0 ? 'ring-2 ring-red-400/70' : ''} ${object.isNew ? 'animate-pulse-soft' : ''}`}
      style={{
        borderColor: selected ? '#8bd2df' : color,
        background:
          object.type === 'RACK'
            ? `linear-gradient(180deg, rgba(255,255,255,0.94) 0%, ${color}42 100%)`
            : `linear-gradient(180deg, rgba(255,255,255,0.9), ${color}38)`,
      }}
    >
      {object.type === 'RACK' && (
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: `${Math.max(8, occupancyPercent)}%`,
            background: `linear-gradient(180deg, ${color}25, ${color}75)`,
          }}
        />
      )}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.72),transparent_48%)]" />

      {showLabels && (
        <div className="relative flex h-full flex-col justify-between p-2 text-[#2b2925]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-[#6f675d]">{object.type.replace('_', ' ')}</div>
              <div className="mt-1 truncate text-sm font-semibold leading-tight">{object.name}</div>
            </div>
            <Icon size={16} className="shrink-0 text-[#4d7275]" />
          </div>

          <div className="space-y-1">
            {object.type === 'RACK' && (
              <div className="text-xs font-medium text-[#4f4a43]">
                {object.occupied || 0}/{object.capacity || 0} occupied
              </div>
            )}
            {object.type === 'RACK' && (
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f675d]">
                {object.shelfLevels || 1} levels · {object.bayCount || 1} bays
              </div>
            )}
            {object.automationState && (
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4d7275]">
                {object.automationState}
              </div>
            )}
            {['RFID_ANTENNA', 'RFID_PORTAL', 'RFID_READER'].includes(object.type) && (
              <div className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${rfidSystemEnabled && object.rfidEnabled !== false ? 'text-emerald-800' : 'text-[#7d7569]'}`}>
                {rfidSystemEnabled && object.rfidEnabled !== false ? `${object.rfidReadRate || 0} reads/min` : 'Endpoint offline'}
              </div>
            )}
            {object.status && (
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${statusTone}`}>
                {object.status}
              </span>
            )}
            {conflictCount > 0 && (
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-700">
                {conflictCount} conflict{conflictCount === 1 ? '' : 's'}
              </div>
            )}
          </div>
        </div>
      )}

      {selected && (
        <>
          <span className="absolute left-2 top-2 h-3 w-3 rounded-full border-2 border-white bg-[#45a3b8]" />
          <span className="absolute bottom-2 right-2 h-3 w-3 rounded-full border-2 border-white bg-[#45a3b8]" />
        </>
      )}

      {object.isNew && (
        <span className="absolute right-2 top-2 rounded-full bg-[#45a3b8] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-white">
          New
        </span>
      )}
    </div>
  );
};

export default RackCard;
