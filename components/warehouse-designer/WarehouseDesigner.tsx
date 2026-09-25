import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { PanelBottomOpen, X } from 'lucide-react';
import type { AppSettings, DepartmentDef, InventoryItem, Rack } from '../../types';
import { loadJSON, saveJSON, shortId, STORAGE_KEYS } from '../../utils/storage';
import { computeRfidMetrics, isRfidEndpoint, runVirtualRfidDiagnostic } from '../../utils/rfidController';
import DesignerSidebar from './DesignerSidebar';
import DesignerToolbar from './DesignerToolbar';
import ConfirmDialog from './ConfirmDialog';
import FloorCanvas2D, { FloorCanvasHandle } from './FloorCanvas2D';
import RfidCommandCenter from './RfidCommandCenter';
import {
  clampObjectToFloor,
  applyGridToObject,
  computeDesignerStats,
  createDefaultFloorPlan,
  detectLayoutConflicts,
  exportClientPreviewJSON,
  exportFloorPlanJSON,
  floorObjectsToRacks,
  findFreePlacement,
  getConflictsForObject,
  migrateFloorPlan,
  nudgeObjectToFreeSpace,
  sanitizeDimensions,
  updateRackOccupancyFromInventory,
  validateFloorPlanImport,
} from './warehouseGeometry';
import {
  buildAisleObject,
  buildDockDoorObject,
  buildObjectFromRackTemplate,
  buildWarehouseAreaObject,
  buildWarehouseAssetObject,
  FLOOR_SIZE_PRESETS,
  LAYOUT_TEMPLATE_PRESETS,
  RACK_TEMPLATE_DEFINITIONS,
  WAREHOUSE_AREA_DEFINITIONS,
  WAREHOUSE_ASSET_DEFINITIONS,
} from './warehouseTemplates';
import type {
  FloorSizePreset,
  RfidReadEvent,
  WarehouseAreaObjectType,
  WarehouseFloorDimensions,
  WarehouseFloorObject,
  WarehouseFloorPlan,
} from './warehouseTypes';

const Warehouse3DPreview = lazy(() => import('./Warehouse3DPreview'));

interface WarehouseDesignerProps {
  racks: Rack[];
  setRacks: React.Dispatch<React.SetStateAction<Rack[]>>;
  inventory: InventoryItem[];
  departments: DepartmentDef[];
  warehouseId: string;
  settings: AppSettings;
  onSettingsChange: (next: Partial<AppSettings>) => void;
  onNotify: (n: { type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'; title: string; message: string }) => void;
}

type ConfirmState =
  | { kind: 'discard' }
  | { kind: 'delete'; objectId: string };

const WarehouseDesigner: React.FC<WarehouseDesignerProps> = ({
  racks,
  setRacks,
  inventory,
  departments,
  warehouseId,
  settings,
  onNotify,
}) => {
  const canvasRef = useRef<FloorCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [savedPlan, setSavedPlan] = useState<WarehouseFloorPlan>(() => hydratePlan(warehouseId, racks));
  const [draftPlan, setDraftPlan] = useState<WarehouseFloorPlan>(() => hydratePlan(warehouseId, racks));
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [activeRackTemplateId, setActiveRackTemplateId] = useState<string>(RACK_TEMPLATE_DEFINITIONS[0].id);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [snapToGridEnabled, setSnapToGridEnabled] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [preview3DOpen, setPreview3DOpen] = useState(false);
  const [rfidCommandOpen, setRfidCommandOpen] = useState(false);
  const [rfidEvents, setRfidEvents] = useState<RfidReadEvent[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  useEffect(() => {
    const next = hydratePlan(warehouseId, racks);
    setSavedPlan(next);
    setDraftPlan(next);
    setSelectedObjectId(null);
  }, [racks, warehouseId]);

  const draftObjects = useMemo(
    () => updateRackOccupancyFromInventory(draftPlan.objects, inventory),
    [draftPlan.objects, inventory],
  );

  const normalizedSaved = useMemo(() => normalizePlan(savedPlan), [savedPlan]);
  const normalizedDraft = useMemo(() => normalizePlan(draftPlan), [draftPlan]);
  const dirty = normalizedSaved !== normalizedDraft;
  const conflicts = useMemo(() => detectLayoutConflicts(draftObjects), [draftObjects]);
  const stats = useMemo(() => computeDesignerStats(draftObjects, conflicts), [conflicts, draftObjects]);
  const selectedObject = useMemo(
    () => draftObjects.find((object) => object.id === selectedObjectId) || null,
    [draftObjects, selectedObjectId],
  );
  const unsavedObjectCount = useMemo(
    () => draftObjects.filter((object) => object.isNew).length,
    [draftObjects],
  );
  const selectedConflicts = useMemo(
    () => (selectedObject ? getConflictsForObject(selectedObject.id, conflicts) : []),
    [conflicts, selectedObject],
  );
  const warehouseName = settings.brandName || 'VWMS';
  const rfidEndpoints = useMemo(() => draftObjects.filter(isRfidEndpoint), [draftObjects]);
  const rfidMetrics = useMemo(() => computeRfidMetrics({
    state: draftPlan.rfidSystem,
    objects: draftObjects,
    inventory,
    events: rfidEvents,
  }), [draftObjects, draftPlan.rfidSystem, inventory, rfidEvents]);

  useEffect(() => {
    const closeTopLayer = () => {
      if (confirmState) setConfirmState(null);
      else if (rfidCommandOpen) setRfidCommandOpen(false);
      else if (preview3DOpen) setPreview3DOpen(false);
      else if (mobileSheetOpen) setMobileSheetOpen(false);
      else return false;
      return true;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeTopLayer()) event.preventDefault();
    };
    const onBack = (event: Event) => {
      if (closeTopLayer()) event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('vwms:back', onBack);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('vwms:back', onBack);
    };
  }, [confirmState, mobileSheetOpen, preview3DOpen, rfidCommandOpen]);

  const updateDraftObject = (objectId: string, updater: (current: WarehouseFloorObject) => WarehouseFloorObject) => {
    setDraftPlan((current) => ({
      ...current,
      objects: current.objects.map((object) => {
        if (object.id !== objectId) return object;
        return clampObjectToFloor({ ...updater(object), warehouseId }, current.dimensions);
      }),
    }));
  };

  const updateSelectedObject = (patch: Partial<WarehouseFloorObject>) => {
    if (!selectedObjectId) return;
    updateDraftObject(selectedObjectId, (current) => ({ ...current, ...patch, isNew: current.isNew ?? false }));
  };

  const updateRfidSystem = (patch: Partial<WarehouseFloorPlan['rfidSystem']>) => {
    setDraftPlan((current) => ({
      ...current,
      rfidSystem: {
        ...current.rfidSystem,
        ...patch,
        lastUpdated: Date.now(),
      },
      objects: patch.enabled === false
        ? current.objects.map((object) => isRfidEndpoint(object) ? { ...object, rfidReadRate: 0 } : object)
        : current.objects,
    }));
    if (patch.enabled === false) setRfidEvents([]);
  };

  const runRfidDiagnostic = () => {
    const result = runVirtualRfidDiagnostic({
      state: draftPlan.rfidSystem,
      objects: draftObjects,
      inventory,
    });
    if (!result.events.length) {
      onNotify({
        type: 'WARNING',
        title: 'RFID test could not run',
        message: 'Energize RFID and place at least one healthy endpoint before running diagnostics.',
      });
      return;
    }
    setDraftPlan((current) => ({
      ...current,
      objects: current.objects.map((object) => (
        result.readRates[object.id] === undefined
          ? object
          : { ...object, rfidReadRate: result.readRates[object.id] }
      )),
    }));
    setRfidEvents((current) => [...result.events, ...current].slice(0, 100));
    onNotify({
      type: 'SUCCESS',
      title: 'Virtual RFID signal test complete',
      message: `${result.events.length} simulated reads were verified across the active endpoint network.`,
    });
  };

  const appendPlacedObject = (object: WarehouseFloorObject) => {
    setDraftPlan((current) => ({
      ...current,
      objects: [...current.objects, findFreePlacement(object, current.objects, current.dimensions)],
    }));
    setSelectedObjectId(object.id);
    setMobileSheetOpen(false);
  };

  const updateDimensions = (patch: Partial<WarehouseFloorDimensions>) => {
    setDraftPlan((current) => {
      const dimensions = sanitizeDimensions({ ...current.dimensions, ...patch });
      return {
        ...current,
        dimensions,
        objects: current.objects.map((object) => clampObjectToFloor(object, dimensions)),
      };
    });
  };

  const applyFloorSizePreset = (preset: FloorSizePreset) => {
    updateDimensions(preset);
    onNotify({
      type: 'INFO',
      title: `${preset.name} floor applied`,
      message: `${preset.width} x ${preset.depth} ${preset.unit} with a ${preset.gridSize} ${preset.unit} grid.`,
    });
  };

  const addObject = (type: WarehouseAreaObjectType) => {
    const object = buildWarehouseAreaObject({
      warehouseId,
      type,
      departmentId: departments[0]?.id,
    });
    appendPlacedObject(object);
    onNotify({ type: 'INFO', title: `${object.name} added`, message: 'Edit it in the inspector or drag it into place.' });
  };

  const addRackFromTemplateId = (templateId: string) => {
    const object = buildObjectFromRackTemplate({
      warehouseId,
      departmentId: departments[0]?.id,
      templateId,
      x: 10,
      y: 10,
    });
    appendPlacedObject(object);
    onNotify({ type: 'INFO', title: `${object.name} added`, message: 'Drag it into position or adjust it in the inspector.' });
  };

  const addRackFromTemplate = () => addRackFromTemplateId(activeRackTemplateId);

  const addWarehouseAsset = (assetId: string) => {
    const object = buildWarehouseAssetObject({ warehouseId, assetId });
    appendPlacedObject(object);
    onNotify({
      type: 'INFO',
      title: `${object.name} placed`,
      message: 'The nearest available grid position was selected automatically.',
    });
  };

  const applyLayoutTemplate = (templateId: string) => {
    const template = LAYOUT_TEMPLATE_PRESETS.find((item) => item.id === templateId);
    if (!template) return;
    const built = template.build({
      warehouseId,
      defaultDepartmentId: departments[0]?.id,
      unit: draftPlan.dimensions.unit,
    });
    setDraftPlan((current) => ({
      ...current,
      dimensions: { ...current.dimensions, ...built.dimensions },
      objects: built.objects,
    }));
    setSelectedObjectId(built.objects[0]?.id || null);
    onNotify({ type: 'SUCCESS', title: 'Layout template applied', message: `${template.name} is now loaded into the draft designer.` });
  };

  const saveLayout = () => {
    const planToSave: WarehouseFloorPlan = {
      ...draftPlan,
      objects: draftObjects.map((object) => ({ ...object, isNew: false })),
      updatedAt: Date.now(),
    };
    const floorPlans = loadJSON<Record<string, WarehouseFloorPlan>>(STORAGE_KEYS.FLOOR_PLANS, {});
    saveJSON(STORAGE_KEYS.FLOOR_PLANS, { ...floorPlans, [warehouseId]: planToSave });
    setRacks(floorObjectsToRacks(planToSave.objects).map((rack) => ({ ...rack, isNew: false })));
    setSavedPlan(planToSave);
    setDraftPlan(planToSave);
    onNotify({ type: 'SUCCESS', title: 'Layout saved', message: `Saved ${planToSave.objects.length} floor object(s) for this warehouse.` });
  };

  const discardChanges = () => {
    setDraftPlan(savedPlan);
    setSelectedObjectId(null);
    setConfirmState(null);
    onNotify({ type: 'INFO', title: 'Draft reverted', message: 'The designer has been restored to the last saved layout.' });
  };

  const deleteSelectedObject = () => {
    if (!selectedObject) return;
    setConfirmState({ kind: 'delete', objectId: selectedObject.id });
  };

  const confirmDeleteObject = (objectId: string) => {
    setDraftPlan((current) => ({
      ...current,
      objects: current.objects.filter((object) => object.id !== objectId),
    }));
    setSelectedObjectId(null);
    setConfirmState(null);
    onNotify({ type: 'INFO', title: 'Object removed', message: 'The selected floor object was deleted from the draft layout.' });
  };

  const duplicateSelectedObject = () => {
    if (!selectedObject) return;
    const duplicate = clampObjectToFloor({
      ...selectedObject,
      id: shortId(selectedObject.type.toLowerCase()),
      name: `${selectedObject.name} Copy`,
      x: selectedObject.x + 2,
      y: selectedObject.y + 2,
      isNew: true,
    }, draftPlan.dimensions);
    setDraftPlan((current) => ({ ...current, objects: [...current.objects, duplicate] }));
    setSelectedObjectId(duplicate.id);
  };

  const moveObjectIn3D = (objectId: string, x: number, y: number) => {
    updateDraftObject(objectId, (current) => {
      const moved = { ...current, x, y, isNew: current.isNew ?? false };
      return snapToGridEnabled ? applyGridToObject(moved, draftPlan.dimensions, true) : moved;
    });
  };

  const bringSelectedIntoView = () => {
    if (!selectedObject) return;
    canvasRef.current?.focusObject(selectedObject.id);
  };

  const fixSelectedSpacing = () => {
    if (!selectedObject) return;
    const next = nudgeObjectToFreeSpace(selectedObject, draftObjects, draftPlan.dimensions.gridSize);
    if (!next) {
      onNotify({ type: 'WARNING', title: 'No free slot found', message: 'Try moving the object manually or enlarging the floor boundary.' });
      return;
    }
    updateDraftObject(selectedObject.id, () => next);
    onNotify({ type: 'SUCCESS', title: 'Spacing adjusted', message: `${selectedObject.name} was nudged to the nearest free grid position.` });
  };

  const exportLayout = () => {
    exportFloorPlanJSON({ ...draftPlan, objects: draftObjects }, buildFileBase(warehouseId, 'floor-plan'));
  };

  const exportClientPreview = () => {
    exportClientPreviewJSON({ ...draftPlan, objects: draftObjects }, buildFileBase(warehouseId, 'client-preview'));
  };

  const importLayout = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const plan = validateFloorPlanImport(parsed, warehouseId);
      setDraftPlan(plan);
      setSelectedObjectId(plan.objects[0]?.id || null);
      onNotify({ type: 'SUCCESS', title: 'Floor plan imported', message: `${plan.objects.length} objects loaded into the draft designer.` });
    } catch (error) {
      onNotify({ type: 'ERROR', title: 'Import failed', message: error instanceof Error ? error.message : 'The floor plan file could not be read.' });
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-[#ddd7cc] text-[#2b2925] lg:h-full lg:min-h-0">
      <DesignerToolbar
        warehouseName={warehouseName}
        dirty={dirty}
        stats={stats}
        rfidEnabled={draftPlan.rfidSystem.enabled}
        rfidEndpointCount={rfidMetrics.onlineEndpoints}
        onSave={saveLayout}
        onPreview3D={() => setPreview3DOpen(true)}
        onExport={exportLayout}
        onExportClient={exportClientPreview}
        onImport={() => fileInputRef.current?.click()}
        onResetView={() => canvasRef.current?.resetView()}
        onClearUnsaved={() => setConfirmState({ kind: 'discard' })}
        onOpenRfid={() => setRfidCommandOpen(true)}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="hidden w-[24rem] shrink-0 border-r border-[#b6aa9b] xl:block">
          <DesignerSidebar
            departments={departments}
            dimensions={draftPlan.dimensions}
            rackTemplates={RACK_TEMPLATE_DEFINITIONS}
            assetDefinitions={WAREHOUSE_ASSET_DEFINITIONS}
            floorSizePresets={FLOOR_SIZE_PRESETS}
            layoutTemplates={LAYOUT_TEMPLATE_PRESETS}
            activeRackTemplateId={activeRackTemplateId}
            selectedObject={selectedObject}
            selectedConflicts={selectedConflicts}
            dirty={dirty}
            unsavedObjectCount={unsavedObjectCount}
            onSelectRackTemplate={setActiveRackTemplateId}
            onAddRackTemplate={addRackFromTemplate}
            onAddAsset={addWarehouseAsset}
            onApplyFloorSize={applyFloorSizePreset}
            onApplyLayoutTemplate={applyLayoutTemplate}
            onAddObjectType={addObject}
            onAddAisle={() => {
              const aisle = buildAisleObject(warehouseId);
              appendPlacedObject(aisle);
            }}
            onAddDockDoor={() => {
              const dock = buildDockDoorObject(warehouseId);
              appendPlacedObject(dock);
            }}
            onDimensionsChange={updateDimensions}
            onSelectionChange={updateSelectedObject}
            onDeleteSelection={deleteSelectedObject}
            onDuplicateSelection={duplicateSelectedObject}
            onBringIntoView={bringSelectedIntoView}
            onFixSpacing={fixSelectedSpacing}
            onSave={saveLayout}
            onDiscard={() => setConfirmState({ kind: 'discard' })}
            showGrid={showGrid}
            showLabels={showLabels}
            snapToGridEnabled={snapToGridEnabled}
            onToggleViewSetting={(key, value) => {
              if (key === 'showGrid') setShowGrid(value);
              else if (key === 'showLabels') setShowLabels(value);
              else setSnapToGridEnabled(value);
            }}
          />
        </div>

        <div className="relative min-h-0 min-w-0 flex-1 p-3 sm:p-4">
          <FloorCanvas2D
            ref={canvasRef}
            dimensions={draftPlan.dimensions}
            objects={draftObjects}
            departments={departments}
            selectedObjectId={selectedObjectId}
            conflicts={conflicts}
            showLabels={showLabels}
            showGrid={showGrid}
            snapToGridEnabled={snapToGridEnabled}
            rfidSystemEnabled={draftPlan.rfidSystem.enabled}
            onSelectObject={setSelectedObjectId}
            onMoveObject={updateDraftObject}
          />

          <div className="pointer-events-none absolute left-5 top-5 rounded-full border border-[#b6aa9b] bg-[#f7f3ec]/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6f675d] shadow-sm">
            {stats.conflictCount > 0 ? `${stats.conflictCount} layout conflicts` : 'No layout conflicts'}
          </div>

          <button type="button"
            onClick={() => setMobileSheetOpen(true)}
            className="absolute bottom-5 right-5 flex min-h-11 items-center gap-2 rounded-full bg-[#45a3b8] px-4 py-2.5 text-sm font-semibold text-white shadow-xl transition hover:bg-[#3894a7] xl:hidden"
          >
            <PanelBottomOpen size={16} />
            Designer Tools
          </button>
        </div>
      </div>

      {mobileSheetOpen && (
        <div className="fixed inset-0 z-[240] bg-[#5f5950]/45 backdrop-blur-sm xl:hidden" onClick={() => setMobileSheetOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 flex max-h-[88dvh] flex-col rounded-t-2xl border-t border-[#b6aa9b] bg-[#ede6dc]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Designer tools"
          >
            <div className="flex items-center justify-between border-b border-[#c9beaf] px-4 py-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#7d7569]">Layout</div>
                <div className="text-sm font-bold text-[#2b2925]">Designer Tools</div>
              </div>
              <button type="button"
                onClick={() => setMobileSheetOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#6f675d] transition hover:bg-[#d8cfc2] hover:text-[#2b2925]"
                aria-label="Close designer tools"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DesignerSidebar
                departments={departments}
                dimensions={draftPlan.dimensions}
                rackTemplates={RACK_TEMPLATE_DEFINITIONS}
                assetDefinitions={WAREHOUSE_ASSET_DEFINITIONS}
                floorSizePresets={FLOOR_SIZE_PRESETS}
                layoutTemplates={LAYOUT_TEMPLATE_PRESETS}
                activeRackTemplateId={activeRackTemplateId}
                selectedObject={selectedObject}
                selectedConflicts={selectedConflicts}
                dirty={dirty}
                unsavedObjectCount={unsavedObjectCount}
                onSelectRackTemplate={setActiveRackTemplateId}
                onAddRackTemplate={addRackFromTemplate}
                onAddAsset={addWarehouseAsset}
                onApplyFloorSize={applyFloorSizePreset}
                onApplyLayoutTemplate={(templateId) => {
                  applyLayoutTemplate(templateId);
                  setMobileSheetOpen(false);
                }}
                onAddObjectType={addObject}
                onAddAisle={() => {
                  const aisle = buildAisleObject(warehouseId);
                  appendPlacedObject(aisle);
                }}
                onAddDockDoor={() => {
                  const dock = buildDockDoorObject(warehouseId);
                  appendPlacedObject(dock);
                }}
                onDimensionsChange={updateDimensions}
                onSelectionChange={updateSelectedObject}
                onDeleteSelection={deleteSelectedObject}
                onDuplicateSelection={duplicateSelectedObject}
                onBringIntoView={bringSelectedIntoView}
                onFixSpacing={fixSelectedSpacing}
                onSave={saveLayout}
                onDiscard={() => setConfirmState({ kind: 'discard' })}
                showGrid={showGrid}
                showLabels={showLabels}
                snapToGridEnabled={snapToGridEnabled}
                onToggleViewSetting={(key, value) => {
                  if (key === 'showGrid') setShowGrid(value);
                  else if (key === 'showLabels') setShowLabels(value);
                  else setSnapToGridEnabled(value);
                }}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.kind === 'delete' ? 'Delete floor object?' : 'Discard unsaved changes?'}
        message={
          confirmState?.kind === 'delete'
            ? 'The selected floor object will be removed from the draft layout. Inventory assigned to saved racks will remain in place until you save.'
            : 'All unsaved layout edits will be discarded and the designer will return to the last saved state.'
        }
        confirmLabel={confirmState?.kind === 'delete' ? 'Delete' : 'Discard'}
        tone={confirmState?.kind === 'delete' ? 'danger' : 'default'}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          if (!confirmState) return;
          if (confirmState.kind === 'delete') confirmDeleteObject(confirmState.objectId);
          else discardChanges();
        }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={importLayout}
      />

      <Suspense fallback={null}>
        <Warehouse3DPreview
          open={preview3DOpen}
          plan={{ ...draftPlan, objects: draftObjects }}
          departments={departments}
          rackTemplates={RACK_TEMPLATE_DEFINITIONS}
          assetDefinitions={WAREHOUSE_ASSET_DEFINITIONS}
          areaDefinitions={WAREHOUSE_AREA_DEFINITIONS}
          selectedObjectId={selectedObjectId}
          dirty={dirty}
          snapToGridEnabled={snapToGridEnabled}
          onSelectObject={setSelectedObjectId}
          onMoveObject={moveObjectIn3D}
          onUpdateSelected={updateSelectedObject}
          onAddRack={addRackFromTemplateId}
          onAddAsset={addWarehouseAsset}
          onAddArea={addObject}
          onDuplicateSelected={duplicateSelectedObject}
          onDeleteSelected={deleteSelectedObject}
          onSave={saveLayout}
          onClose={() => setPreview3DOpen(false)}
        />
      </Suspense>

      <RfidCommandCenter
        open={rfidCommandOpen}
        state={draftPlan.rfidSystem}
        metrics={rfidMetrics}
        endpoints={rfidEndpoints}
        events={rfidEvents}
        onClose={() => setRfidCommandOpen(false)}
        onStateChange={updateRfidSystem}
        onRunDiagnostic={runRfidDiagnostic}
        onSelectEndpoint={(objectId) => {
          setSelectedObjectId(objectId);
          setRfidCommandOpen(false);
          window.setTimeout(() => canvasRef.current?.focusObject(objectId), 0);
        }}
      />
    </div>
  );
};

function hydratePlan(warehouseId: string, racks: Rack[]): WarehouseFloorPlan {
  const floorPlans = loadJSON<Record<string, unknown>>(STORAGE_KEYS.FLOOR_PLANS, {});
  const stored = floorPlans[warehouseId];
  const migrated = migrateFloorPlan(stored, warehouseId, racks);
  if (!stored && racks.length === 0) {
    return createDefaultFloorPlan(warehouseId, []);
  }
  return migrated.plan;
}

function normalizePlan(plan: WarehouseFloorPlan): string {
  return JSON.stringify({
    warehouseId: plan.warehouseId,
    dimensions: plan.dimensions,
    rfidSystem: plan.rfidSystem,
    objects: plan.objects.map((object) => ({
      ...object,
      isNew: Boolean(object.isNew),
      rfidReadRate: 0,
    })),
  });
}

function buildFileBase(warehouseId: string, suffix: string): string {
  return `${warehouseId.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${suffix}`;
}

export default WarehouseDesigner;
