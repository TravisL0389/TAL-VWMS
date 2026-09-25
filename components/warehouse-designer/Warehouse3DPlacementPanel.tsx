import React, { useMemo, useState } from 'react';
import {
  Boxes,
  Copy,
  Lock,
  MapPinned,
  PackagePlus,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Search,
  Trash2,
  Unlock,
} from 'lucide-react';
import { getObjectLabel } from './warehouseGeometry';
import type {
  RackTemplateDefinition,
  WarehouseAreaDefinition,
  WarehouseAssetDefinition,
  WarehouseFloorDimensions,
  WarehouseFloorObject,
} from './warehouseTypes';

interface Warehouse3DPlacementPanelProps {
  dimensions: WarehouseFloorDimensions;
  rackTemplates: RackTemplateDefinition[];
  assets: WarehouseAssetDefinition[];
  areas: WarehouseAreaDefinition[];
  selectedObject: WarehouseFloorObject | null;
  dirty: boolean;
  onAddRack: (templateId: string) => void;
  onAddAsset: (assetId: string) => void;
  onAddArea: (type: WarehouseAreaDefinition['type']) => void;
  onUpdateSelected: (patch: Partial<WarehouseFloorObject>) => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onSave: () => void;
}

type PanelTab = 'library' | 'selection';

const Warehouse3DPlacementPanel: React.FC<Warehouse3DPlacementPanelProps> = ({
  dimensions,
  rackTemplates,
  assets,
  areas,
  selectedObject,
  dirty,
  onAddRack,
  onAddAsset,
  onAddArea,
  onUpdateSelected,
  onDuplicateSelected,
  onDeleteSelected,
  onSave,
}) => {
  const [tab, setTab] = useState<PanelTab>('library');
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRacks = useMemo(
    () => rackTemplates.filter((item) => `${item.name} ${item.assetModel} ${item.recommendedUse}`.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery, rackTemplates],
  );
  const filteredAssets = useMemo(
    () => assets.filter((item) => `${item.name} ${item.category} ${item.type} ${item.description}`.toLowerCase().includes(normalizedQuery)),
    [assets, normalizedQuery],
  );
  const filteredAreas = useMemo(
    () => areas.filter((item) => `${item.name} ${item.type}`.toLowerCase().includes(normalizedQuery)),
    [areas, normalizedQuery],
  );

  return (
    <aside className="flex min-h-0 w-full flex-1 flex-col overflow-hidden border-r border-[#b6aa9b] bg-[#ede6dc] text-[#2b2925]" aria-label="3D placement tools">
      <div className="grid grid-cols-2 border-b border-[#b6aa9b] bg-[#ddd5c8] p-1">
        <TabButton active={tab === 'library'} label="Object Library" onClick={() => setTab('library')} icon={<PackagePlus size={15} />} />
        <TabButton
          active={tab === 'selection'}
          label={selectedObject ? 'Selected Object' : 'Selection'}
          onClick={() => setTab('selection')}
          icon={<MapPinned size={15} />}
        />
      </div>

      {tab === 'library' ? (
        <>
          <div className="border-b border-[#c7bcae] p-3">
            <label className="relative block">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8174]" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search fixtures"
                aria-label="Search 3D fixtures"
                className="input-field pl-9"
              />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-scroll-region="3d-object-library">
            <CatalogSection title={`Rack Systems (${filteredRacks.length})`}>
              {filteredRacks.map((template) => (
                <CatalogButton
                  key={template.id}
                  name={template.name}
                  meta={`${template.width} x ${template.depth} x ${template.height} ${dimensions.unit}`}
                  icon={<Boxes size={16} />}
                  onClick={() => onAddRack(template.id)}
                />
              ))}
            </CatalogSection>

            <CatalogSection title={`Smart Fixtures (${filteredAssets.length})`}>
              {filteredAssets.map((asset) => (
                <CatalogButton
                  key={asset.id}
                  name={asset.name}
                  meta={`${asset.category} · ${asset.width} x ${asset.depth} ${dimensions.unit}`}
                  color={asset.color}
                  icon={<PackagePlus size={16} />}
                  onClick={() => onAddAsset(asset.id)}
                />
              ))}
            </CatalogSection>

            <CatalogSection title={`Floor & Access (${filteredAreas.length})`}>
              {filteredAreas.map((area) => (
                <CatalogButton
                  key={area.type}
                  name={area.name}
                  meta={`${area.width} x ${area.depth} ${dimensions.unit}`}
                  color={area.color}
                  icon={<MapPinned size={16} />}
                  onClick={() => onAddArea(area.type)}
                />
              ))}
            </CatalogSection>

            {!filteredRacks.length && !filteredAssets.length && !filteredAreas.length && (
              <div className="px-4 py-10 text-center text-sm text-[#7d7569]">No matching fixtures.</div>
            )}
          </div>
        </>
      ) : (
        <SelectionEditor
          object={selectedObject}
          dimensions={dimensions}
          onChange={onUpdateSelected}
          onDuplicate={onDuplicateSelected}
          onDelete={onDeleteSelected}
        />
      )}

      <div className="border-t border-[#b6aa9b] p-3 safe-bottom">
        <button
          type="button"
          onClick={onSave}
          className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
            dirty ? 'bg-[#45a3b8] text-white hover:bg-[#3894a7]' : 'border border-[#c7bcae] bg-[#f7f3ec] text-[#6f675d]'
          }`}
        >
          <Save size={16} />
          {dirty ? 'Save 3D Layout' : 'Layout Saved'}
        </button>
      </div>
    </aside>
  );
};

const SelectionEditor: React.FC<{
  object: WarehouseFloorObject | null;
  dimensions: WarehouseFloorDimensions;
  onChange: (patch: Partial<WarehouseFloorObject>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}> = ({ object, dimensions, onChange, onDuplicate, onDelete }) => {
  if (!object) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-sm leading-6 text-[#7d7569]">
        No object selected.
      </div>
    );
  }

  const rotate = (delta: number) => onChange({ rotation: normalizeRotation((object.rotation || 0) + delta) });
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="border-b border-[#c7bcae] px-4 py-4">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7d7569]">{getObjectLabel(object.type)}</div>
        <input
          value={object.name}
          onChange={(event) => onChange({ name: event.target.value })}
          aria-label="Selected 3D object name"
          className="mt-2 w-full border-0 bg-transparent p-0 text-lg font-black text-[#2b2925] outline-none"
        />
      </div>

      <InspectorSection title={`Position (${dimensions.unit})`}>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="X" value={object.x} onChange={(value) => onChange({ x: value })} />
          <NumberField label="Z" value={object.y} onChange={(value) => onChange({ y: value })} />
        </div>
      </InspectorSection>

      <InspectorSection title="Dimensions">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="W" value={object.width} min={1} onChange={(value) => onChange({ width: value })} />
          <NumberField label="D" value={object.depth} min={1} onChange={(value) => onChange({ depth: value })} />
          <NumberField label="H" value={object.height || 1} min={1} onChange={(value) => onChange({ height: value })} />
        </div>
      </InspectorSection>

      <InspectorSection title="Orientation">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <IconButton label="Rotate left 90 degrees" onClick={() => rotate(-90)} icon={<RotateCcw size={16} />} />
          <input
            type="number"
            value={object.rotation || 0}
            onChange={(event) => onChange({ rotation: normalizeRotation(Number(event.target.value)) })}
            aria-label="Selected 3D object rotation"
            className="input-field text-center"
          />
          <IconButton label="Rotate right 90 degrees" onClick={() => rotate(90)} icon={<RotateCw size={16} />} />
        </div>
      </InspectorSection>

      <InspectorSection title="Placement">
        <button
          type="button"
          aria-pressed={Boolean(object.locked)}
          onClick={() => onChange({ locked: !object.locked })}
          className="flex min-h-11 w-full items-center justify-between rounded-lg border border-[#c7bcae] bg-[#f7f3ec] px-3 py-2 text-sm font-semibold text-[#5f5950]"
        >
          <span className="flex items-center gap-2">{object.locked ? <Lock size={15} /> : <Unlock size={15} />} Position</span>
          <span>{object.locked ? 'Locked' : 'Editable'}</span>
        </button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <CommandButton label="Duplicate" onClick={onDuplicate} icon={<Copy size={15} />} />
          <CommandButton label="Delete" onClick={onDelete} icon={<Trash2 size={15} />} danger />
        </div>
      </InspectorSection>
    </div>
  );
};

const CatalogSection: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <section className="border-b border-[#c7bcae] py-2">
    <div className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#7d7569]">{title}</div>
    <div>{children}</div>
  </section>
);

const CatalogButton: React.FC<{
  name: string;
  meta: string;
  icon: React.ReactNode;
  color?: string;
  onClick: () => void;
}> = ({ name, meta, icon, color, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={`Place ${name}`}
    className="group flex min-h-14 w-full items-center gap-3 border-t border-[#d5ccbf] px-4 py-2.5 text-left transition first:border-t-0 hover:bg-white"
  >
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#c7bcae] bg-[#f7f3ec] text-[#4d7275]" style={color ? { color } : undefined}>
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-bold text-[#2b2925]">{name}</span>
      <span className="mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8174]">{meta}</span>
    </span>
    <Plus size={15} className="shrink-0 text-[#948b7d] group-hover:text-[#4d7275]" />
  </button>
);

const InspectorSection: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <section className="border-b border-[#c7bcae] px-4 py-4">
    <div className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#7d7569]">{title}</div>
    {children}
  </section>
);

const NumberField: React.FC<{ label: string; value: number; min?: number; onChange: (value: number) => void }> = ({ label, value, min, onChange }) => (
  <label>
    <span className="mb-1 block text-[10px] font-bold uppercase text-[#7d7569]">{label}</span>
    <input
      type="number"
      min={min}
      value={Number.isFinite(value) ? value : 0}
      onChange={(event) => onChange(Number(event.target.value))}
      aria-label={`Selected 3D object ${label}`}
      className="input-field"
    />
  </label>
);

const TabButton: React.FC<{ active: boolean; label: string; icon: React.ReactNode; onClick: () => void }> = ({ active, label, icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`flex min-h-10 items-center justify-center gap-2 rounded-md px-2 text-xs font-bold transition ${active ? 'bg-[#5d7f81] text-white' : 'text-[#6f675d] hover:bg-[#ede6dc]'}`}
  >
    {icon}
    {label}
  </button>
);

const IconButton: React.FC<{ label: string; icon: React.ReactNode; onClick: () => void }> = ({ label, icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#c7bcae] bg-[#f7f3ec] text-[#5f5950] hover:bg-white"
  >
    {icon}
  </button>
);

const CommandButton: React.FC<{ label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }> = ({ label, icon, onClick, danger = false }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
      danger ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100' : 'border-[#c7bcae] bg-[#f7f3ec] text-[#5f5950] hover:bg-white'
    }`}
  >
    {icon}
    {label}
  </button>
);

function normalizeRotation(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return ((value % 360) + 360) % 360;
}

export default Warehouse3DPlacementPanel;
