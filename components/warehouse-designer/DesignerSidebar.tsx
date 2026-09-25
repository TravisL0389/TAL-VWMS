import React from 'react';
import { Grid2x2Plus, MapPinned, PackagePlus, ShieldCheck, Warehouse } from 'lucide-react';
import type { DepartmentDef } from '../../types';
import AisleTool from './AisleTool';
import DockDoorTool from './DockDoorTool';
import RackInspector from './RackInspector';
import SaveBar from './SaveBar';
import TemplatePicker from './TemplatePicker';
import WarehouseAssetCatalog from './WarehouseAssetCatalog';
import ZoneLegend from './ZoneLegend';
import type {
  CollisionIssue,
  FloorSizePreset,
  LayoutTemplatePreset,
  RackTemplateDefinition,
  WarehouseAssetDefinition,
  WarehouseAreaObjectType,
  WarehouseFloorDimensions,
  WarehouseFloorObject,
} from './warehouseTypes';

interface DesignerSidebarProps {
  departments: DepartmentDef[];
  dimensions: WarehouseFloorDimensions;
  rackTemplates: RackTemplateDefinition[];
  assetDefinitions: WarehouseAssetDefinition[];
  floorSizePresets: FloorSizePreset[];
  layoutTemplates: LayoutTemplatePreset[];
  activeRackTemplateId: string;
  selectedObject: WarehouseFloorObject | null;
  selectedConflicts: CollisionIssue[];
  dirty: boolean;
  unsavedObjectCount: number;
  onSelectRackTemplate: (templateId: string) => void;
  onAddRackTemplate: () => void;
  onAddAsset: (assetId: string) => void;
  onApplyFloorSize: (preset: FloorSizePreset) => void;
  onApplyLayoutTemplate: (templateId: string) => void;
  onAddObjectType: (type: WarehouseAreaObjectType) => void;
  onAddAisle: () => void;
  onAddDockDoor: () => void;
  onDimensionsChange: (patch: Partial<WarehouseFloorDimensions>) => void;
  onSelectionChange: (patch: Partial<WarehouseFloorObject>) => void;
  onDeleteSelection: () => void;
  onDuplicateSelection: () => void;
  onBringIntoView: () => void;
  onFixSpacing: () => void;
  onSave: () => void;
  onDiscard: () => void;
  showGrid: boolean;
  showLabels: boolean;
  snapToGridEnabled: boolean;
  onToggleViewSetting: (key: 'showGrid' | 'showLabels' | 'snapToGridEnabled', value: boolean) => void;
}

const OBJECT_ACTIONS: Array<{ type: WarehouseAreaObjectType; label: string; icon: React.ReactNode }> = [
  { type: 'ZONE', label: 'Zone', icon: <MapPinned size={16} /> },
  { type: 'STAGING', label: 'Staging', icon: <Warehouse size={16} /> },
  { type: 'RECEIVING', label: 'Receiving', icon: <PackagePlus size={16} /> },
  { type: 'SHIPPING', label: 'Shipping', icon: <PackagePlus size={16} /> },
  { type: 'OFFICE', label: 'Office', icon: <Grid2x2Plus size={16} /> },
  { type: 'RESTRICTED', label: 'Restricted', icon: <ShieldCheck size={16} /> },
];

const DesignerSidebar: React.FC<DesignerSidebarProps> = ({
  departments,
  dimensions,
  rackTemplates,
  assetDefinitions,
  floorSizePresets,
  layoutTemplates,
  activeRackTemplateId,
  selectedObject,
  selectedConflicts,
  dirty,
  unsavedObjectCount,
  onSelectRackTemplate,
  onAddRackTemplate,
  onAddAsset,
  onApplyFloorSize,
  onApplyLayoutTemplate,
  onAddObjectType,
  onAddAisle,
  onAddDockDoor,
  onDimensionsChange,
  onSelectionChange,
  onDeleteSelection,
  onDuplicateSelection,
  onBringIntoView,
  onFixSpacing,
  onSave,
  onDiscard,
  showGrid,
  showLabels,
  snapToGridEnabled,
  onToggleViewSetting,
}) => (
  <div className="flex h-full min-h-0 flex-col bg-[#ede6dc] text-[#2b2925]">
    <div
      data-scroll-region="layout-tools"
      className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4"
      style={{ scrollbarGutter: 'stable' }}
    >
      <Section title="Warehouse Floor">
        <div className="rounded-lg border border-[#c7bcae] bg-[#f7f3ec] p-4">
          <div className="grid grid-cols-2 gap-2">
            {floorSizePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApplyFloorSize(preset)}
                className="rounded-md border border-[#c7bcae] bg-[#ede6dc] px-3 py-2 text-left transition hover:border-[#5d7f81] hover:bg-white"
              >
                <div className="text-xs font-bold text-[#2b2925]">{preset.name}</div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a8174]">
                  {preset.width} x {preset.depth} {preset.unit}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 min-[481px]:grid-cols-2">
            <Field label="Width">
              <input
                aria-label="Warehouse floor width"
                type="number"
                min={20}
                className="input-field"
                value={dimensions.width}
                onChange={(event) => onDimensionsChange({ width: Math.max(20, Number(event.target.value)) })}
              />
            </Field>
            <Field label="Depth">
              <input
                aria-label="Warehouse floor depth"
                type="number"
                min={20}
                className="input-field"
                value={dimensions.depth}
                onChange={(event) => onDimensionsChange({ depth: Math.max(20, Number(event.target.value)) })}
              />
            </Field>
            <Field label="Unit">
              <select
                aria-label="Warehouse floor unit"
                className="input-field"
                value={dimensions.unit}
                onChange={(event) => onDimensionsChange({ unit: event.target.value as WarehouseFloorDimensions['unit'] })}
              >
                <option value="ft">Feet</option>
                <option value="m">Meters</option>
              </select>
            </Field>
            <Field label="Grid Size">
              <input
                aria-label="Warehouse floor grid size"
                type="number"
                min={1}
                className="input-field"
                value={dimensions.gridSize}
                onChange={(event) => onDimensionsChange({ gridSize: Math.max(1, Number(event.target.value)) })}
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Add Objects">
        <div className="grid grid-cols-2 gap-2">
          {OBJECT_ACTIONS.map((action) => (
            <button type="button"
              key={action.type}
              onClick={() => onAddObjectType(action.type)}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#c7bcae] bg-[#f7f3ec] px-3 py-2 text-sm font-semibold text-[#5f5950] transition hover:border-[#5d7f81] hover:bg-white hover:text-[#2b2925]"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Smart Object Library">
        <WarehouseAssetCatalog assets={assetDefinitions} onAddAsset={onAddAsset} />
      </Section>

      <Section title="Zones / Departments">
        <ZoneLegend departments={departments} />
      </Section>

      <Section title="Rack Templates">
        <TemplatePicker
          rackTemplates={rackTemplates}
          layoutTemplates={layoutTemplates}
          activeRackTemplateId={activeRackTemplateId}
          onSelectRackTemplate={onSelectRackTemplate}
          onAddRackTemplate={onAddRackTemplate}
          onApplyLayoutTemplate={onApplyLayoutTemplate}
        />
      </Section>

      <Section title="Aisles & Walkways">
        <AisleTool onAddAisle={onAddAisle} />
      </Section>

      <Section title="Dock Doors / Entrances">
        <DockDoorTool onAddDockDoor={onAddDockDoor} />
      </Section>

      <Section title="Selection Inspector">
        <RackInspector
          object={selectedObject}
          departments={departments}
          conflicts={selectedConflicts}
          onChange={onSelectionChange}
          onDelete={onDeleteSelection}
          onDuplicate={onDuplicateSelection}
          onBringIntoView={onBringIntoView}
          onFixSpacing={onFixSpacing}
        />
      </Section>

      <Section title="View Settings">
        <div className="rounded-lg border border-[#c7bcae] bg-[#f7f3ec] p-4">
          <div className="mt-4 space-y-2">
            <Toggle label="Show Grid" checked={showGrid} onChange={(checked) => onToggleViewSetting('showGrid', checked)} />
            <Toggle label="Show Labels" checked={showLabels} onChange={(checked) => onToggleViewSetting('showLabels', checked)} />
            <Toggle label="Snap to Grid" checked={snapToGridEnabled} onChange={(checked) => onToggleViewSetting('snapToGridEnabled', checked)} />
          </div>
        </div>
      </Section>
    </div>

    <SaveBar dirty={dirty} objectCount={unsavedObjectCount} onSave={onSave} onDiscard={onDiscard} />
  </div>
);

const Section: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <section>
    <div className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-[#7d7569]">{title}</div>
    {children}
  </section>
);

const Field: React.FC<React.PropsWithChildren<{ label: string }>> = ({ label, children }) => (
  <label className="block">
    <div className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#7d7569]">{label}</div>
    {children}
  </label>
);

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, onChange }) => (
  <button
    type="button"
    aria-pressed={checked}
    onClick={() => onChange(!checked)}
    className="flex w-full items-center justify-between rounded-lg border border-[#c7bcae] bg-[#ede6dc] px-3 py-2.5 text-left"
  >
    <span className="text-sm text-[#5f5950]">{label}</span>
    <span className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-[#5d7f81]' : 'bg-[#b6aa9b]'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-[1.35rem]' : 'left-0.5'}`} />
    </span>
  </button>
);

export default DesignerSidebar;
