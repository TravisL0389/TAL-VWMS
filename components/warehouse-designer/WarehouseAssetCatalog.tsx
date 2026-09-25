import React from 'react';
import {
  BatteryCharging,
  Bot,
  Boxes,
  Camera,
  Cctv,
  Forklift,
  PackageOpen,
  Plus,
  RadioTower,
  Router,
  ShieldCheck,
  Warehouse,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WarehouseAssetDefinition, WarehouseObjectType } from './warehouseTypes';

interface WarehouseAssetCatalogProps {
  assets: WarehouseAssetDefinition[];
  onAddAsset: (assetId: string) => void;
}

const TYPE_ICONS: Partial<Record<WarehouseObjectType, LucideIcon>> = {
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
  RFID_PORTAL: RadioTower,
  RFID_READER: Router,
};

const CATEGORIES: WarehouseAssetDefinition['category'][] = [
  'Material Handling',
  'Automation',
  'Safety & IoT',
  'RFID & Tracking',
];

const WarehouseAssetCatalog: React.FC<WarehouseAssetCatalogProps> = ({ assets, onAddAsset }) => (
  <div className="space-y-3">
    {CATEGORIES.map((category) => (
      <div key={category}>
        <div className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#8a8174]">{category}</div>
        <div className="grid grid-cols-1 gap-2 min-[481px]:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {assets.filter((asset) => asset.category === category).map((asset) => {
            const Icon = TYPE_ICONS[asset.type] || Boxes;
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => onAddAsset(asset.id)}
                className="group flex min-h-[6.5rem] flex-col justify-between rounded-lg border border-[#c7bcae] bg-[#f4f0e8] p-3 text-left transition hover:border-[#5d7f81] hover:bg-white"
                title={asset.description}
              >
                <div className="flex items-start justify-between gap-2">
                  {asset.referenceImage ? (
                    <img
                      src={asset.referenceImage}
                      alt=""
                      className="h-9 w-12 rounded-md border border-[#c7bcae] bg-white object-cover"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#dbe5e2] text-[#4d7275]">
                      <Icon size={16} />
                    </span>
                  )}
                  <Plus size={15} className="text-[#948b7d] transition group-hover:text-[#4d7275]" />
                </div>
                <div className="mt-3 min-w-0">
                  <div className="truncate text-sm font-bold text-[#2b2925]">{asset.name}</div>
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a8174]">
                    {asset.width} x {asset.depth} x {asset.height}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </div>
);

export default WarehouseAssetCatalog;
