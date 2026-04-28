import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  MousePointer, Plus, Trash2, Wrench, X, ChevronLeft, ChevronRight,
  Maximize2, ZoomIn, ZoomOut, RotateCcw, Save, Search, AlertTriangle,
  Map as MapIcon, Layers, Grid3x3, Lock, Unlock, Eye, EyeOff,
} from 'lucide-react';
import type {
  Rack, DepartmentDef, InventoryItem, AppSettings, RackStatus,
} from '../types';
import { RACK_TEMPLATES, getDepartmentMeta, getIcon } from '../constants';
import { shortId } from '../utils/storage';

// =============================================================================
// WarehouseMapView — visual warehouse builder.
//
// Capabilities:
//   - Place racks with drag-to-position
//   - Three creation modes: Single Rack, Multi-Rack Array, Layout Templates
//   - Pan and zoom
//   - Sidebar dockable LEFT or RIGHT (settings.sidebarPosition)
//   - Sidebar collapsible
//   - Mobile-friendly: sidebar becomes a bottom sheet on small screens
//   - Generic department system (no hardcoded jargon)
//   - Tools: SELECT, ADD, MAINTAIN, DELETE
//   - Fit-to-view, reset, lock layout
//
// All features adapt to whatever industry the warehouse was set up for.
// =============================================================================

type Tool = 'SELECT' | 'ADD' | 'MAINTAIN' | 'DELETE';
type CreationMode = 'SINGLE' | 'ARRAY' | 'TEMPLATE';

interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  generate: (deptId: string) => Omit<Rack, 'id' | 'warehouseId'>[];
}

const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'single-row',
    name: 'Single Row',
    description: '4 standard bays in a row',
    icon: <Grid3x3 size={20} />,
    generate: (deptId) => Array.from({ length: 4 }).map((_, i) => ({
      departmentId: deptId,
      x: 200 + i * 1300, y: 200,
      width: 1200, height: 800,
      status: 'OPERATIONAL' as RackStatus,
      capacity: 48, occupied: 0, isNew: true,
    })),
  },
  {
    id: 'double-row',
    name: 'Double Row',
    description: '8 bays in two rows with aisle',
    icon: <Layers size={20} />,
    generate: (deptId) => Array.from({ length: 8 }).map((_, i) => {
      const row = Math.floor(i / 4);
      const col = i % 4;
      return {
        departmentId: deptId,
        x: 200 + col * 1300, y: 200 + row * 1100,
        width: 1200, height: 800,
        status: 'OPERATIONAL' as RackStatus,
        capacity: 48, occupied: 0, isNew: true,
      };
    }),
  },
  {
    id: 'u-shape',
    name: 'U-Shape',
    description: '6 bays forming a U layout',
    icon: <MapIcon size={20} />,
    generate: (deptId) => {
      const racks: Omit<Rack, 'id' | 'warehouseId'>[] = [];
      // Left column
      for (let i = 0; i < 2; i++) racks.push({
        departmentId: deptId, x: 200, y: 200 + i * 1100,
        width: 1200, height: 800, status: 'OPERATIONAL', capacity: 48, occupied: 0, isNew: true,
      });
      // Bottom row
      for (let i = 0; i < 2; i++) racks.push({
        departmentId: deptId, x: 1500 + i * 1300, y: 1300,
        width: 1200, height: 800, status: 'OPERATIONAL', capacity: 48, occupied: 0, isNew: true,
      });
      // Right column
      for (let i = 0; i < 2; i++) racks.push({
        departmentId: deptId, x: 4100, y: 200 + i * 1100,
        width: 1200, height: 800, status: 'OPERATIONAL', capacity: 48, occupied: 0, isNew: true,
      });
      return racks;
    },
  },
];

interface WarehouseMapViewProps {
  racks: Rack[];
  setRacks: React.Dispatch<React.SetStateAction<Rack[]>>;
  inventory: InventoryItem[];
  departments: DepartmentDef[];
  warehouseId: string;
  settings: AppSettings;
  onSettingsChange: (next: Partial<AppSettings>) => void;
  onNotify: (n: { type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'; title: string; message: string }) => void;
}

const WarehouseMapView: React.FC<WarehouseMapViewProps> = ({
  racks, setRacks, inventory, departments, warehouseId, settings, onSettingsChange, onNotify,
}) => {
  const [tool, setTool] = useState<Tool>('SELECT');
  const [creationMode, setCreationMode] = useState<CreationMode>('SINGLE');
  const [activeDept, setActiveDept] = useState<string>(() => departments[0]?.id || '');
  const [activeTemplate, setActiveTemplate] = useState<string>(RACK_TEMPLATES[1].id);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ kind: 'commit' | 'clear' | 'delete'; rackId?: string } | null>(null);

  // Array creation parameters
  const [arrayRows, setArrayRows] = useState(2);
  const [arrayCols, setArrayCols] = useState(4);
  const [arrayGap, setArrayGap] = useState(100);

  // View state
  const [zoom, setZoom] = useState(0.15);
  const [pan, setPan] = useState({ x: 200, y: 100 });
  const [locked, setLocked] = useState(false);
  const [showLabels, setShowLabels] = useState(true);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));

  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingRack = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const panning = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const hasAutoFitted = useRef(false);

  // Default active department whenever departments change
  useEffect(() => {
    if (!departments.find(d => d.id === activeDept) && departments[0]) {
      setActiveDept(departments[0].id);
    }
  }, [departments, activeDept]);

  // Auto-collapse sidebar on small viewports
  useEffect(() => {
    const onResize = () => {
      const nextWidth = window.innerWidth;
      setViewportWidth(nextWidth);
      if (nextWidth < 768) {
        setSidebarOpen(false);
      } else {
        setMobileSheetOpen(false);
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    hasAutoFitted.current = false;
  }, [warehouseId]);

  useEffect(() => {
    if (!selectedRackId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTypingTarget = !!target && (
        target.isContentEditable ||
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT'
      );

      if (isTypingTarget || confirming?.kind === 'delete') return;

      event.preventDefault();
      setConfirming({ kind: 'delete', rackId: selectedRackId });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedRackId, confirming]);

  const sidebarOnRight = settings.sidebarPosition === 'RIGHT';
  const compactViewport = viewportWidth < 1024;

  // Inventory counts per rack for occupancy display
  const occupancyByRack = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of inventory) {
      if (item.rackId) map[item.rackId] = (map[item.rackId] || 0) + item.quantity;
    }
    return map;
  }, [inventory]);

  const hasUnsaved = racks.some(r => r.isNew);
  const newCount = racks.filter(r => r.isNew).length;

  // ---------------------------------------------------------------------------
  // Rack creation
  // ---------------------------------------------------------------------------
  const addSingle = useCallback(() => {
    const tpl = RACK_TEMPLATES.find(t => t.id === activeTemplate) || RACK_TEMPLATES[1];
    if (!activeDept) return;
    // Place near current pan center
    const baseX = Math.max(0, -pan.x / zoom + 200);
    const baseY = Math.max(0, -pan.y / zoom + 200);
    // Offset so successive new racks don't overlap
    const offset = racks.filter(r => r.isNew).length * 100;
    setRacks(prev => [
      ...prev,
      {
        id: shortId('r'),
        warehouseId,
        departmentId: activeDept,
        x: baseX + offset, y: baseY + offset,
        width: tpl.width, height: tpl.height,
        status: 'OPERATIONAL',
        capacity: tpl.capacity, occupied: 0,
        isNew: true,
      },
    ]);
    onNotify({ type: 'INFO', title: 'New rack added', message: 'Drag to position, then save.' });
  }, [activeTemplate, activeDept, pan, zoom, racks, setRacks, warehouseId, onNotify]);

  const addArray = useCallback(() => {
    const tpl = RACK_TEMPLATES.find(t => t.id === activeTemplate) || RACK_TEMPLATES[1];
    if (!activeDept) return;
    const baseX = Math.max(0, -pan.x / zoom + 200);
    const baseY = Math.max(0, -pan.y / zoom + 200);
    const newRacks: Rack[] = [];
    for (let r = 0; r < arrayRows; r++) {
      for (let c = 0; c < arrayCols; c++) {
        newRacks.push({
          id: shortId('r'),
          warehouseId,
          departmentId: activeDept,
          x: baseX + c * (tpl.width + arrayGap),
          y: baseY + r * (tpl.height + arrayGap),
          width: tpl.width, height: tpl.height,
          status: 'OPERATIONAL',
          capacity: tpl.capacity, occupied: 0,
          isNew: true,
        });
      }
    }
    setRacks(prev => [...prev, ...newRacks]);
    onNotify({ type: 'INFO', title: `${newRacks.length} racks added`, message: 'Adjust as needed and save.' });
  }, [activeTemplate, activeDept, arrayRows, arrayCols, arrayGap, pan, zoom, setRacks, warehouseId, onNotify]);

  const addTemplate = useCallback((tplId: string) => {
    if (!activeDept) return;
    const tpl = LAYOUT_TEMPLATES.find(t => t.id === tplId);
    if (!tpl) return;
    const baseX = Math.max(0, -pan.x / zoom + 200);
    const baseY = Math.max(0, -pan.y / zoom + 200);
    const generated = tpl.generate(activeDept).map(r => ({
      ...r,
      id: shortId('r'),
      warehouseId,
      x: r.x + baseX,
      y: r.y + baseY,
    }));
    setRacks(prev => [...prev, ...generated]);
    onNotify({ type: 'INFO', title: `Template applied: ${tpl.name}`, message: 'Adjust as needed and save.' });
  }, [activeDept, pan, zoom, setRacks, warehouseId, onNotify]);

  const commitChanges = useCallback(() => {
    setRacks(prev => prev.map(r => ({ ...r, isNew: false })));
    setConfirming(null);
    onNotify({ type: 'SUCCESS', title: 'Layout saved', message: `${newCount} rack(s) committed to your warehouse.` });
  }, [setRacks, newCount, onNotify]);

  const clearUnsaved = useCallback(() => {
    setRacks(prev => prev.filter(r => !r.isNew));
    setConfirming(null);
    onNotify({ type: 'INFO', title: 'Unsaved racks cleared', message: 'Reverted to last saved layout.' });
  }, [setRacks, onNotify]);

  const deleteRack = useCallback((id: string) => {
    setRacks(prev => prev.filter(r => r.id !== id));
    setSelectedRackId(null);
    setConfirming(null);
    onNotify({ type: 'INFO', title: 'Rack deleted', message: 'Removed from warehouse layout.' });
  }, [setRacks, onNotify]);

  const cycleStatus = useCallback((id: string) => {
    setRacks(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next: RackStatus = r.status === 'OPERATIONAL' ? 'MAINTENANCE'
        : r.status === 'MAINTENANCE' ? 'OFFLINE'
        : 'OPERATIONAL';
      return { ...r, status: next };
    }));
  }, [setRacks]);

  // ---------------------------------------------------------------------------
  // View controls
  // ---------------------------------------------------------------------------
  const fitToView = useCallback(() => {
    if (racks.length === 0) {
      setZoom(0.15);
      setPan({ x: 200, y: 100 });
      return;
    }
    const minX = Math.min(...racks.map(r => r.x));
    const minY = Math.min(...racks.map(r => r.y));
    const maxX = Math.max(...racks.map(r => r.x + r.width));
    const maxY = Math.max(...racks.map(r => r.y + r.height));
    const w = maxX - minX;
    const h = maxY - minY;
    const cw = canvasRef.current?.clientWidth || 800;
    const ch = canvasRef.current?.clientHeight || 600;
    const padding = 100;
    const z = Math.min((cw - padding * 2) / w, (ch - padding * 2) / h);
    setZoom(Math.min(0.5, Math.max(0.05, z)));
    setPan({
      x: (cw - w * z) / 2 - minX * z,
      y: (ch - h * z) / 2 - minY * z,
    });
  }, [racks]);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (racks.length === 0) {
      if (compactViewport && !hasAutoFitted.current) {
        setZoom(0.12);
        setPan({ x: 80, y: 80 });
        hasAutoFitted.current = true;
      }
      return;
    }

    if (!hasAutoFitted.current || compactViewport) {
      const frame = window.requestAnimationFrame(() => {
        fitToView();
        hasAutoFitted.current = true;
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [compactViewport, fitToView, racks.length, warehouseId]);

  const resetView = useCallback(() => {
    setZoom(0.15);
    setPan({ x: 200, y: 100 });
  }, []);

  const zoomIn = () => setZoom(z => Math.min(1, z * 1.25));
  const zoomOut = () => setZoom(z => Math.max(0.03, z / 1.25));

  // ---------------------------------------------------------------------------
  // Mouse interactions
  // ---------------------------------------------------------------------------
  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.canvas === 'true') {
      panning.current = { startX: e.clientX, startY: e.clientY, origX: pan.x, origY: pan.y };
      setSelectedRackId(null);
    }
  };

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (panning.current) {
      const dx = e.clientX - panning.current.startX;
      const dy = e.clientY - panning.current.startY;
      setPan({ x: panning.current.origX + dx, y: panning.current.origY + dy });
    }
    if (draggingRack.current && !locked) {
      const dx = (e.clientX - draggingRack.current.startX) / zoom;
      const dy = (e.clientY - draggingRack.current.startY) / zoom;
      const id = draggingRack.current.id;
      setRacks(prev => prev.map(r => r.id === id
        ? { ...r, x: Math.max(0, draggingRack.current!.origX + dx), y: Math.max(0, draggingRack.current!.origY + dy), isNew: r.isNew || true }
        : r,
      ));
    }
  };

  const onCanvasMouseUp = () => {
    panning.current = null;
    draggingRack.current = null;
  };

  const onCanvasTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    if ((e.target as HTMLElement).dataset.canvas === 'true') {
      const touch = e.touches[0];
      panning.current = { startX: touch.clientX, startY: touch.clientY, origX: pan.x, origY: pan.y };
      setSelectedRackId(null);
    }
  };

  const onCanvasTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];

    if (panning.current) {
      e.preventDefault();
      const dx = touch.clientX - panning.current.startX;
      const dy = touch.clientY - panning.current.startY;
      setPan({ x: panning.current.origX + dx, y: panning.current.origY + dy });
    }

    if (draggingRack.current && !locked) {
      e.preventDefault();
      const dx = (touch.clientX - draggingRack.current.startX) / zoom;
      const dy = (touch.clientY - draggingRack.current.startY) / zoom;
      const id = draggingRack.current.id;
      setRacks(prev => prev.map(r => r.id === id
        ? { ...r, x: Math.max(0, draggingRack.current!.origX + dx), y: Math.max(0, draggingRack.current!.origY + dy), isNew: r.isNew || true }
        : r,
      ));
    }
  };

  const onCanvasTouchEnd = () => {
    panning.current = null;
    draggingRack.current = null;
  };

  const onRackMouseDown = (e: React.MouseEvent, rack: Rack) => {
    e.stopPropagation();
    if (tool === 'SELECT') {
      setSelectedRackId(rack.id);
      if (!locked) {
        draggingRack.current = { id: rack.id, startX: e.clientX, startY: e.clientY, origX: rack.x, origY: rack.y };
      }
    } else if (tool === 'MAINTAIN') {
      cycleStatus(rack.id);
    } else if (tool === 'DELETE') {
      setConfirming({ kind: 'delete', rackId: rack.id });
    }
  };

  const onRackTouchStart = (e: React.TouchEvent<HTMLDivElement>, rack: Rack) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    const touch = e.touches[0];
    if (tool === 'SELECT') {
      setSelectedRackId(rack.id);
      if (!locked) {
        draggingRack.current = { id: rack.id, startX: touch.clientX, startY: touch.clientY, origX: rack.x, origY: rack.y };
      }
    } else if (tool === 'MAINTAIN') {
      cycleStatus(rack.id);
    } else if (tool === 'DELETE') {
      setConfirming({ kind: 'delete', rackId: rack.id });
    }
  };

  // Wheel zoom
  const onWheel = (e: React.WheelEvent) => {
    if (!canvasRef.current) return;
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const newZoom = Math.min(1, Math.max(0.03, zoom * delta));
    // Keep zoom anchored at cursor
    const scale = newZoom / zoom;
    setPan({ x: cx - (cx - pan.x) * scale, y: cy - (cy - pan.y) * scale });
    setZoom(newZoom);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const selectedRack = selectedRackId ? racks.find(r => r.id === selectedRackId) : null;

  const sidebar = (
    <div className="flex h-full min-h-0 w-full flex-col border-[#b6aa9b] bg-[#ede6dc]">
      {/* Sidebar header */}
          <div className="flex items-center justify-between border-b border-[#b6aa9b] px-5 py-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-[#7d7569]">Builder</div>
          <div className="text-sm font-semibold text-[#232321]">Warehouse Layout</div>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="hidden rounded p-1 text-[#7d7569] hover:bg-[#d8cfc2] hover:text-[#232321] md:flex"
          aria-label="Collapse sidebar"
        >
          {sidebarOnRight ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <button
          onClick={() => setMobileSheetOpen(false)}
          className="rounded p-1 text-[#7d7569] hover:bg-[#d8cfc2] hover:text-[#232321] md:hidden"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Department picker */}
        <Section title={`Active ${settings.departmentLabel}`}>
          <div className="grid grid-cols-2 gap-2">
            {departments.map(d => {
              const Icon = getIcon(d.icon);
              const isActive = d.id === activeDept;
              return (
                <button
                  key={d.id}
                  onClick={() => setActiveDept(d.id)}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-left transition ${
                    isActive
                      ? 'border-[#5d7f81] bg-[#e4efef]'
                      : 'border-[#b6aa9b] bg-[#f1ebe2] hover:border-[#978c7f]'
                  }`}
                  style={isActive ? { borderColor: d.color, backgroundColor: `${d.color}15` } : undefined}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-white"
                    style={{ backgroundColor: d.color }}
                  >
                    <Icon size={14} />
                  </span>
                  <span className="truncate text-xs font-semibold text-[#232321]">{d.label}</span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Creation mode tabs */}
        <Section title="Add Method">
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#ddd5c8] p-1">
            {[
              { id: 'SINGLE', label: 'Single' },
              { id: 'ARRAY', label: 'Array' },
              { id: 'TEMPLATE', label: 'Layout' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setCreationMode(opt.id as CreationMode)}
                className={`rounded px-2 py-1.5 text-xs font-semibold transition ${
                  creationMode === opt.id ? 'bg-[#5d7f81] text-white' : 'text-[#7d7569] hover:text-[#232321]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Single mode */}
          {creationMode === 'SINGLE' && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#8a8174]">Size</label>
                <select
                  value={activeTemplate}
                  onChange={e => setActiveTemplate(e.target.value)}
                  className="mt-1 w-full rounded border border-[#c7bcae] bg-[#fbf8f2] px-2 py-1.5 text-sm text-[#232321] focus:border-[#5d7f81] focus:outline-none"
                >
                  {RACK_TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>{t.name} — {t.capacity} slots</option>
                  ))}
                </select>
                <div className="mt-1 text-[11px] text-[#8a8174]">
                  {RACK_TEMPLATES.find(t => t.id === activeTemplate)?.description}
                </div>
              </div>
              <button
                onClick={addSingle}
                disabled={!activeDept}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5d7f81] py-2 text-sm font-bold text-white transition hover:bg-[#4f7172] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={16} /> Add {settings.rackLabel}
              </button>
            </div>
          )}

          {/* Array mode */}
          {creationMode === 'ARRAY' && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#8a8174]">Size</label>
                <select
                  value={activeTemplate}
                  onChange={e => setActiveTemplate(e.target.value)}
                  className="mt-1 w-full rounded border border-[#c7bcae] bg-[#fbf8f2] px-2 py-1.5 text-sm text-[#232321] focus:border-[#5d7f81] focus:outline-none"
                >
                  {RACK_TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumField label="Rows" value={arrayRows} onChange={setArrayRows} min={1} max={10} />
                <NumField label="Columns" value={arrayCols} onChange={setArrayCols} min={1} max={10} />
              </div>
              <NumField label="Gap" value={arrayGap} onChange={setArrayGap} min={0} max={500} step={10} />
              <div className="rounded bg-[#ece6dd] p-2 text-[11px] text-[#6e665c]">
                Will create <span className="font-bold text-[#232321]">{arrayRows * arrayCols}</span> {settings.rackLabel.toLowerCase()}s in a {arrayRows}×{arrayCols} grid.
              </div>
              <button
                onClick={addArray}
                disabled={!activeDept}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5d7f81] py-2 text-sm font-bold text-white transition hover:bg-[#4f7172] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={16} /> Add Array
              </button>
            </div>
          )}

          {/* Template mode */}
          {creationMode === 'TEMPLATE' && (
            <div className="mt-3 space-y-2">
              {LAYOUT_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => addTemplate(t.id)}
                  disabled={!activeDept}
                  className="flex w-full items-center gap-3 rounded-lg border border-[#c7bcae] bg-[#fbf8f2] p-3 text-left transition hover:border-[#5d7f81] hover:bg-[#f1ede6] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded bg-[#e4efef] text-[#5d7f81]">
                    {t.icon}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-[#232321]">{t.name}</span>
                    <span className="block text-[11px] text-[#8a8174]">{t.description}</span>
                  </span>
                  <Plus size={14} className="text-[#8a8174]" />
                </button>
              ))}
            </div>
          )}
        </Section>

        {/* Selection details */}
        {selectedRack && (
          <Section title="Selected">
            <div className="space-y-2 rounded-lg border border-[#c7bcae] bg-[#fbf8f2] p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-[#8a8174]">ID</div>
                <div className="font-mono text-xs text-[#232321]">{selectedRack.id}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-[#8a8174]">{settings.departmentLabel}</div>
                <div className="text-xs text-[#232321]">{getDepartmentMeta(selectedRack.departmentId, departments).label}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-[#8a8174]">Status</div>
                <button
                  onClick={() => cycleStatus(selectedRack.id)}
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                    selectedRack.status === 'OPERATIONAL' ? 'bg-green-600/20 text-green-400'
                    : selectedRack.status === 'MAINTENANCE' ? 'bg-yellow-600/20 text-yellow-400'
                    : 'bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {selectedRack.status}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-[#8a8174]">Capacity</div>
                <div className="text-xs text-[#232321]">{selectedRack.capacity} slots</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-[#8a8174]">Items here</div>
                <div className="text-xs text-[#232321]">{occupancyByRack[selectedRack.id] || 0}</div>
              </div>
              <button
                onClick={() => setConfirming({ kind: 'delete', rackId: selectedRack.id })}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded border border-red-600/30 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-600/10"
              >
                <Trash2 size={12} /> Delete {settings.rackLabel}
              </button>
            </div>
          </Section>
        )}

        {/* Layout summary */}
        <Section title="Summary">
          <div className="space-y-1.5 rounded-lg border border-[#c7bcae] bg-[#fbf8f2] p-3 text-xs">
            <SumRow label={`Total ${settings.rackLabel}s`} value={String(racks.length)} />
            <SumRow label="Saved" value={String(racks.length - newCount)} />
            <SumRow label="Unsaved" value={String(newCount)} highlight={newCount > 0} />
            <SumRow label="Items placed" value={String(Object.keys(occupancyByRack).length)} />
          </div>
        </Section>
      </div>

      {/* Sticky save bar */}
      {hasUnsaved && (
        <div className="sticky bottom-0 border-t border-[#c7bcae] bg-[#ece6dd] p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] text-yellow-400">
            <AlertTriangle size={12} /> {newCount} unsaved change{newCount === 1 ? '' : 's'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming({ kind: 'clear' })}
            className="flex-1 rounded border border-[#c7bcae] py-1.5 text-xs font-semibold text-[#6e665c] hover:bg-[#f1ede6]"
            >
              Discard
            </button>
            <button
              onClick={() => setConfirming({ kind: 'commit' })}
              className="flex flex-1 items-center justify-center gap-1.5 rounded bg-[#5d7f81] py-1.5 text-xs font-bold text-white hover:bg-[#4f7172]"
            >
              <Save size={12} /> Save
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="relative flex min-h-full w-full overflow-x-hidden overflow-y-auto bg-[#ddd7cc] md:h-full md:overflow-hidden"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehaviorY: 'auto' }}
    >
      {/* Sidebar — desktop, dock left */}
      {!sidebarOnRight && (
        <div
          className={`hidden md:flex h-full transition-all duration-300 border-r border-[#b6aa9b] ${
            sidebarOpen ? 'w-80' : 'w-0'
          }`}
        >
          {sidebarOpen && sidebar}
        </div>
      )}

      {/* Main canvas area */}
      <div className="relative flex min-h-[calc(100dvh-10.5rem)] flex-1 flex-col md:h-full md:min-h-0">
        {/* Top toolbar */}
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#b6aa9b] bg-[#ede6dc] px-2 py-2 sm:px-3">
          {/* Tools */}
          <div className="flex min-w-0 max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-[#ddd5c8] p-1">
            <ToolBtn active={tool === 'SELECT'} onClick={() => setTool('SELECT')} icon={<MousePointer size={14} />} label="Select" />
            <ToolBtn active={tool === 'ADD'} onClick={() => setTool('ADD')} icon={<Plus size={14} />} label="Add" />
            <ToolBtn active={tool === 'MAINTAIN'} onClick={() => setTool('MAINTAIN')} icon={<Wrench size={14} />} label="Status" />
            <ToolBtn active={tool === 'DELETE'} onClick={() => setTool('DELETE')} icon={<Trash2 size={14} />} label="Delete" />
          </div>

          {/* View controls */}
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            <IconBtn onClick={zoomOut} icon={<ZoomOut size={14} />} label="Zoom out" />
            <span className="px-2 font-mono text-xs text-[#7d7569]">{Math.round(zoom * 100)}%</span>
            <IconBtn onClick={zoomIn} icon={<ZoomIn size={14} />} label="Zoom in" />
            <div className="mx-1 h-5 w-px bg-[#b6aa9b]" />
            <IconBtn onClick={fitToView} icon={<Maximize2 size={14} />} label="Fit to view" />
            <IconBtn onClick={resetView} icon={<RotateCcw size={14} />} label="Reset view" />
            <div className="mx-1 hidden h-5 w-px bg-[#c7bcae] sm:block" />
            <IconBtn
              onClick={() => setLocked(l => !l)}
              icon={locked ? <Lock size={14} /> : <Unlock size={14} />}
              label={locked ? 'Unlock' : 'Lock'}
              active={locked}
            />
            <IconBtn
              onClick={() => setShowLabels(s => !s)}
              icon={showLabels ? <Eye size={14} /> : <EyeOff size={14} />}
              label="Toggle labels"
              active={showLabels}
            />
            <div className="mx-1 hidden h-5 w-px bg-[#c7bcae] md:block" />
            <button
              onClick={() => onSettingsChange({ sidebarPosition: sidebarOnRight ? 'LEFT' : 'RIGHT' })}
              className="hidden md:flex items-center gap-1.5 rounded px-2 py-1 text-xs text-[#8a8174] hover:bg-[#e7e0d6] hover:text-[#232321]"
              title="Switch sidebar side"
            >
              {sidebarOnRight ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
              <span className="hidden lg:inline">Dock {sidebarOnRight ? 'Left' : 'Right'}</span>
            </button>
          </div>

          {/* Sidebar reopen + mobile open */}
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="hidden md:flex items-center gap-1.5 rounded bg-[#5d7f81] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4f7172]"
              >
                {sidebarOnRight ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                <span>Builder</span>
              </button>
            )}
            <button
              onClick={() => setMobileSheetOpen(true)}
              className="flex md:hidden items-center gap-1.5 rounded bg-[#5d7f81] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4f7172]"
            >
              Builder
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative min-h-[calc(100dvh-15rem)] flex-1 overflow-hidden bg-[#ddd7cc] md:min-h-0"
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onMouseLeave={onCanvasMouseUp}
          onTouchStart={onCanvasTouchStart}
          onTouchMove={onCanvasTouchMove}
          onTouchEnd={onCanvasTouchEnd}
          onWheel={onWheel}
          data-canvas="true"
          style={{ cursor: panning.current ? 'grabbing' : tool === 'SELECT' ? 'grab' : 'crosshair', touchAction: 'none' }}
        >
          {/* Grid background */}
          <div
            data-canvas="true"
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(167,159,147,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(167,159,147,0.18) 1px, transparent 1px)`,
              backgroundSize: `${100 * zoom}px ${100 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
          />

          {/* Empty state */}
          {racks.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="max-w-md text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e4efef] text-[#5d7f81]">
                  <MapIcon size={32} />
                </div>
                <h3 className="mb-2 text-lg font-bold text-[#232321]">Your warehouse is empty</h3>
                <p className="text-sm text-[#5d564d]">
                  Open the builder to add {settings.rackLabel.toLowerCase()}s. Choose a single bay, an array, or a layout template to get started.
                </p>
              </div>
            </div>
          )}

          {/* Racks */}
          <div
            className="absolute origin-top-left"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            {racks.map(rack => {
              const dept = getDepartmentMeta(rack.departmentId, departments);
              const isSelected = rack.id === selectedRackId;
              const occ = occupancyByRack[rack.id] || 0;
              const fillPct = rack.capacity > 0 ? Math.min(100, (occ / rack.capacity) * 100) : 0;
              const Icon = getIcon(dept.icon);
              return (
                <div
                  key={rack.id}
                  onMouseDown={e => onRackMouseDown(e, rack)}
                  onTouchStart={e => onRackTouchStart(e, rack)}
                  className="absolute select-none"
                  style={{
                    left: rack.x,
                    top: rack.y,
                    width: rack.width,
                    height: rack.height,
                    borderWidth: 8,
                    borderStyle: 'solid',
                    borderColor: isSelected ? '#45a3b8' : dept.color,
                    backgroundColor: rack.status === 'OFFLINE' ? '#1a1a1a' : `${dept.color}30`,
                    opacity: rack.status === 'OFFLINE' ? 0.5 : 1,
                    cursor: tool === 'DELETE' ? 'not-allowed' : 'pointer',
                    boxShadow: rack.isNew ? '0 0 0 4px rgba(234, 179, 8, 0.6)' : isSelected ? '0 0 0 4px rgba(69, 163, 184, 0.35)' : 'none',
                  }}
                >
                  {/* Capacity fill */}
                  <div
                    className="absolute bottom-0 left-0 right-0"
                    style={{
                      height: `${fillPct}%`,
                      backgroundColor: dept.color,
                      opacity: 0.4,
                    }}
                  />
                  {/* Status indicator */}
                  {rack.status === 'MAINTENANCE' && (
                    <div className="absolute right-3 top-3 rounded bg-yellow-500 px-3 py-1 text-2xl font-black text-black">
                      MAINT
                    </div>
                  )}
                  {/* Label */}
                  {showLabels && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                      <Icon size={Math.min(rack.width / 8, rack.height / 8)} />
                      <div className="mt-2 px-4 text-center font-black uppercase tracking-wide" style={{ fontSize: Math.min(rack.width / 12, 80) }}>
                        {dept.label}
                      </div>
                      <div className="mt-2 font-mono text-zinc-300" style={{ fontSize: Math.min(rack.width / 18, 50) }}>
                        {occ} / {rack.capacity}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="pointer-events-none absolute bottom-2 left-1/2 hidden -translate-x-1/2 rounded bg-[#ede6dc]/92 px-3 py-1 text-[10px] text-[#625a50] backdrop-blur sm:block">
            Scroll to zoom · Drag empty space to pan · {locked ? 'Layout locked' : 'Drag racks to move'}
          </div>
        </div>
      </div>

      {/* Sidebar — desktop, dock right */}
      {sidebarOnRight && (
        <div
          className={`hidden md:flex h-full transition-all duration-300 border-l border-[#c7bcae] ${
            sidebarOpen ? 'w-80' : 'w-0'
          }`}
        >
          {sidebarOpen && sidebar}
        </div>
      )}

      {/* Mobile bottom sheet */}
      {mobileSheetOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileSheetOpen(false)}>
          <div className="absolute inset-0 bg-[#b8afa3]/35" />
          <div
            className="absolute bottom-0 left-0 right-0 flex max-h-[88dvh] flex-col rounded-t-2xl bg-[#f4f0e8]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-2 pb-1">
              <div className="h-1 w-10 rounded-full bg-[#c7bcae]" />
            </div>
            <div
              className="flex-1 overflow-y-auto"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehaviorY: 'auto' }}
            >
              {sidebar}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modals */}
      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#b8afa3]/45 p-4"
          onClick={() => setConfirming(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[#c7bcae] bg-[#f4f0e8] p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-bold text-[#232321]">
              {confirming.kind === 'commit' ? 'Save layout changes?'
              : confirming.kind === 'clear' ? 'Discard unsaved changes?'
              : 'Delete this rack?'}
            </h3>
            <p className="mb-5 text-sm text-[#5d564d]">
              {confirming.kind === 'commit'
                ? `${newCount} change${newCount === 1 ? '' : 's'} will be committed to your warehouse layout.`
                : confirming.kind === 'clear'
                ? 'All unsaved racks will be removed. This cannot be undone.'
                : 'The rack will be removed. Inventory currently assigned to it will become unassigned.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirming(null)}
                className="flex-1 rounded border border-[#c7bcae] py-2 text-sm text-[#6e665c] hover:bg-[#f1ede6]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirming.kind === 'commit') commitChanges();
                  else if (confirming.kind === 'clear') clearUnsaved();
                  else if (confirming.kind === 'delete' && confirming.rackId) deleteRack(confirming.rackId);
                }}
                className={`flex-1 rounded py-2 text-sm font-bold text-white ${
                  confirming.kind === 'delete'
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-[#5d7f81] hover:bg-[#4f7172]'
                }`}
              >
                {confirming.kind === 'commit' ? 'Save' : confirming.kind === 'clear' ? 'Discard' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Helpers
// =============================================================================
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="border-b border-[#c7bcae] p-4 sm:p-5">
    <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#8a8174]">{title}</div>
    {children}
  </div>
);

const SumRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="flex items-center justify-between">
    <span className="text-[#8a8174]">{label}</span>
    <span className={`font-mono font-bold ${highlight ? 'text-yellow-600' : 'text-[#232321]'}`}>{value}</span>
  </div>
);

const NumField: React.FC<{ label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }> = ({ label, value, onChange, min, max, step }) => (
  <div>
    <label className="text-[10px] font-black uppercase tracking-widest text-[#8a8174]">{label}</label>
    <input
      type="number"
      min={min}
      max={max}
      step={step ?? 1}
      value={value}
      onChange={e => onChange(parseInt(e.target.value) || 0)}
      className="mt-1 w-full rounded border border-[#c7bcae] bg-[#fbf8f2] px-2 py-1.5 text-sm text-[#232321] focus:border-[#5d7f81] focus:outline-none"
    />
  </div>
);

const ToolBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    title={label}
    aria-label={label}
    className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-semibold transition ${
      active ? 'bg-[#5d7f81] text-white' : 'text-[#8a8174] hover:bg-[#e7e0d6] hover:text-[#232321]'
    }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const IconBtn: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string; active?: boolean }> = ({ onClick, icon, label, active }) => (
  <button
    onClick={onClick}
    title={label}
    aria-label={label}
    className={`flex h-7 w-7 items-center justify-center rounded transition ${
      active ? 'bg-[#5d7f81] text-white' : 'text-[#8a8174] hover:bg-[#e7e0d6] hover:text-[#232321]'
    }`}
  >
    {icon}
  </button>
);

export default WarehouseMapView;
