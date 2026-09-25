import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  MousePointer, Plus, Trash2, Wrench, X, ChevronLeft, ChevronRight,
  Maximize2, ZoomIn, ZoomOut, RotateCcw, Save, AlertTriangle,
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
  accent: string;
  generate: (deptId: string) => Omit<Rack, 'id' | 'warehouseId'>[];
}

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface PendingCanvasAction {
  startClientX: number;
  startClientY: number;
  startPanX: number;
  startPanY: number;
  startWorldX: number;
  startWorldY: number;
  timerId: number | null;
  input: 'mouse' | 'touch';
  mode: 'pending' | 'panning' | 'marquee';
}

interface DragSelectionState {
  ids: string[];
  startClientX: number;
  startClientY: number;
  origins: Record<string, { x: number; y: number }>;
}

const GRID_SIZE = 100;
const FLOOR_WIDTH = 12000;
const FLOOR_HEIGHT = 8000;
const MOUSE_HOLD_TO_SELECT_MS = 220;
const TOUCH_HOLD_TO_SELECT_MS = 260;
const MOUSE_DRAG_THRESHOLD = 10;
const TOUCH_DRAG_THRESHOLD = 18;
const GRID_MARKERS = Array.from({ length: 12 }, (_, index) => (index + 1) * 1000);

const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'single-row',
    name: 'Single Row',
    description: '4 standard bays in a row',
    icon: <Grid3x3 size={20} />,
    accent: '#45a3b8',
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
    accent: '#8a6fef',
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
    accent: '#d59645',
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
  const [selectedRackIds, setSelectedRackIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
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
  const [snapToGrid, setSnapToGrid] = useState(true);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));

  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingRack = useRef<DragSelectionState | null>(null);
  const canvasAction = useRef<PendingCanvasAction | null>(null);
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
    return () => {
      if (canvasAction.current?.timerId) {
        window.clearTimeout(canvasAction.current.timerId);
      }
    };
  }, []);

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
  const activeRackTemplate = RACK_TEMPLATES.find(t => t.id === activeTemplate) || RACK_TEMPLATES[1];

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
  const departmentCount = new Set(racks.map(r => r.departmentId)).size;
  const totalCapacity = racks.reduce((sum, rack) => sum + rack.capacity, 0);
  const totalOccupancy = racks.reduce((sum, rack) => sum + (occupancyByRack[rack.id] || 0), 0);
  const occupancyPercent = totalCapacity > 0 ? Math.min(100, Math.round((totalOccupancy / totalCapacity) * 100)) : 0;

  const snapCoordinate = useCallback((value: number) => (
    snapToGrid ? Math.round(value / GRID_SIZE) * GRID_SIZE : Math.round(value)
  ), [snapToGrid]);

  const getWorldCoordinates = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [pan.x, pan.y, zoom]);

  const rackIntersectsSelection = useCallback((rack: Rack, marquee: SelectionBox) => {
    const left = Math.min(marquee.startX, marquee.endX);
    const right = Math.max(marquee.startX, marquee.endX);
    const top = Math.min(marquee.startY, marquee.endY);
    const bottom = Math.max(marquee.startY, marquee.endY);

    return !(
      rack.x + rack.width < left ||
      rack.x > right ||
      rack.y + rack.height < top ||
      rack.y > bottom
    );
  }, []);

  const stopCanvasAction = useCallback(() => {
    if (canvasAction.current?.timerId) {
      window.clearTimeout(canvasAction.current.timerId);
    }
    canvasAction.current = null;
  }, []);

  const beginMarqueeSelection = useCallback((clientX: number, clientY: number, input: 'mouse' | 'touch') => {
    const world = getWorldCoordinates(clientX, clientY);
    if (!world) return;

    setSelectedRackId(null);
    setSelectedRackIds([]);
    setSelectionBox({
      startX: world.x,
      startY: world.y,
      endX: world.x,
      endY: world.y,
    });

    canvasAction.current = {
      startClientX: clientX,
      startClientY: clientY,
      startPanX: pan.x,
      startPanY: pan.y,
      startWorldX: world.x,
      startWorldY: world.y,
      timerId: null,
      input,
      mode: 'marquee',
    };
  }, [getWorldCoordinates, pan.x, pan.y]);

  const getSnappedDragDelta = useCallback((state: DragSelectionState, clientX: number, clientY: number) => {
    const rawDx = (clientX - state.startClientX) / zoom;
    const rawDy = (clientY - state.startClientY) / zoom;

    if (!snapToGrid) {
      return { dx: rawDx, dy: rawDy };
    }

    const anchorId = state.ids[0];
    const anchorOrigin = state.origins[anchorId];
    if (!anchorOrigin) {
      return { dx: rawDx, dy: rawDy };
    }

    return {
      dx: snapCoordinate(anchorOrigin.x + rawDx) - anchorOrigin.x,
      dy: snapCoordinate(anchorOrigin.y + rawDy) - anchorOrigin.y,
    };
  }, [snapCoordinate, snapToGrid, zoom]);

  const updateDraggedRacks = useCallback((clientX: number, clientY: number) => {
    if (!draggingRack.current || locked) return;

    const { dx, dy } = getSnappedDragDelta(draggingRack.current, clientX, clientY);
    const targetIds = new Set(draggingRack.current.ids);

    setRacks(prev => prev.map(r => {
      if (!targetIds.has(r.id)) return r;
      const origin = draggingRack.current?.origins[r.id];
      if (!origin) return r;
      return {
        ...r,
        x: Math.max(0, origin.x + dx),
        y: Math.max(0, origin.y + dy),
        isNew: true,
      };
    }));
  }, [getSnappedDragDelta, locked, setRacks]);

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
    setSelectedRackIds([]);
    setSelectionBox(null);
    onNotify({ type: 'INFO', title: 'Unsaved racks cleared', message: 'Reverted to last saved layout.' });
  }, [setRacks, onNotify]);

  const deleteRack = useCallback((id: string) => {
    setRacks(prev => prev.filter(r => r.id !== id));
    setSelectedRackId(null);
    setSelectedRackIds(prev => prev.filter(rackId => rackId !== id));
    setConfirming(null);
    onNotify({ type: 'INFO', title: 'Rack deleted', message: 'Removed from warehouse layout.' });
  }, [setRacks, onNotify]);

  const deleteSelectedRacks = useCallback(() => {
    if (selectedRackIds.length === 0) return;
    const idsToDelete = new Set(selectedRackIds);
    setRacks(prev => prev.filter(r => !idsToDelete.has(r.id)));
    setSelectedRackId(null);
    setSelectedRackIds([]);
    setSelectionBox(null);
    onNotify({
      type: 'INFO',
      title: 'Bulk selection deleted',
      message: `${idsToDelete.size} ${settings.rackLabel.toLowerCase()}${idsToDelete.size === 1 ? '' : 's'} removed from the layout.`,
    });
  }, [onNotify, selectedRackIds, setRacks, settings.rackLabel]);

  const alignSelectedToGrid = useCallback(() => {
    if (selectedRackIds.length === 0) return;
    const idsToAlign = new Set(selectedRackIds);
    setRacks(prev => prev.map(r => (
      idsToAlign.has(r.id)
        ? { ...r, x: Math.max(0, snapCoordinate(r.x)), y: Math.max(0, snapCoordinate(r.y)), isNew: true }
        : r
    )));
    onNotify({
      type: 'SUCCESS',
      title: 'Selection aligned',
      message: `${idsToAlign.size} ${settings.rackLabel.toLowerCase()}${idsToAlign.size === 1 ? '' : 's'} snapped to the active grid.`,
    });
  }, [onNotify, selectedRackIds, setRacks, settings.rackLabel, snapCoordinate]);

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
      stopCanvasAction();
      const world = getWorldCoordinates(e.clientX, e.clientY);
      if (!world) return;
      const timerId = window.setTimeout(
        () => beginMarqueeSelection(e.clientX, e.clientY, 'mouse'),
        MOUSE_HOLD_TO_SELECT_MS,
      );
      canvasAction.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
        startWorldX: world.x,
        startWorldY: world.y,
        timerId,
        input: 'mouse',
        mode: 'pending',
      };
    }
  };

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (canvasAction.current) {
      const action = canvasAction.current;
      const dx = e.clientX - action.startClientX;
      const dy = e.clientY - action.startClientY;
      const distance = Math.hypot(dx, dy);

      const dragThreshold = action.input === 'touch' ? TOUCH_DRAG_THRESHOLD : MOUSE_DRAG_THRESHOLD;

      if (action.mode === 'pending' && distance > dragThreshold) {
        if (action.timerId) {
          window.clearTimeout(action.timerId);
        }
        action.timerId = null;
        action.mode = 'panning';
      }

      if (action.mode === 'panning') {
        setPan({ x: action.startPanX + dx, y: action.startPanY + dy });
      }

      if (action.mode === 'marquee') {
        const world = getWorldCoordinates(e.clientX, e.clientY);
        if (!world) return;
        const nextSelection = {
          startX: action.startWorldX,
          startY: action.startWorldY,
          endX: world.x,
          endY: world.y,
        };
        setSelectionBox(nextSelection);
        const matchingIds = racks.filter(rack => rackIntersectsSelection(rack, nextSelection)).map(rack => rack.id);
        setSelectedRackIds(matchingIds);
        setSelectedRackId(matchingIds[0] ?? null);
      }
    }

    updateDraggedRacks(e.clientX, e.clientY);
  };

  const onCanvasMouseUp = () => {
    if (canvasAction.current?.mode === 'pending') {
      setSelectedRackId(null);
      setSelectedRackIds([]);
    }
    stopCanvasAction();
    setSelectionBox(null);
    draggingRack.current = null;
  };

  const onCanvasTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    if ((e.target as HTMLElement).dataset.canvas === 'true') {
      const touch = e.touches[0];
      stopCanvasAction();
      const world = getWorldCoordinates(touch.clientX, touch.clientY);
      if (!world) return;
      const timerId = window.setTimeout(
        () => beginMarqueeSelection(touch.clientX, touch.clientY, 'touch'),
        TOUCH_HOLD_TO_SELECT_MS,
      );
      canvasAction.current = {
        startClientX: touch.clientX,
        startClientY: touch.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
        startWorldX: world.x,
        startWorldY: world.y,
        timerId,
        input: 'touch',
        mode: 'pending',
      };
    }
  };

  const onCanvasTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];

    if (canvasAction.current) {
      const action = canvasAction.current;
      const dx = touch.clientX - action.startClientX;
      const dy = touch.clientY - action.startClientY;
      const distance = Math.hypot(dx, dy);

      const dragThreshold = action.input === 'touch' ? TOUCH_DRAG_THRESHOLD : MOUSE_DRAG_THRESHOLD;

      if (action.mode === 'pending' && distance > dragThreshold) {
        if (action.timerId) {
          window.clearTimeout(action.timerId);
        }
        action.timerId = null;
        action.mode = 'panning';
      }

      if (action.mode === 'panning') {
        e.preventDefault();
        setPan({ x: action.startPanX + dx, y: action.startPanY + dy });
      }

      if (action.mode === 'marquee') {
        e.preventDefault();
        const world = getWorldCoordinates(touch.clientX, touch.clientY);
        if (!world) return;
        const nextSelection = {
          startX: action.startWorldX,
          startY: action.startWorldY,
          endX: world.x,
          endY: world.y,
        };
        setSelectionBox(nextSelection);
        const matchingIds = racks.filter(rack => rackIntersectsSelection(rack, nextSelection)).map(rack => rack.id);
        setSelectedRackIds(matchingIds);
        setSelectedRackId(matchingIds[0] ?? null);
      }
    }

    if (draggingRack.current && !locked) {
      e.preventDefault();
      updateDraggedRacks(touch.clientX, touch.clientY);
    }
  };

  const onCanvasTouchEnd = () => {
    if (canvasAction.current?.mode === 'pending') {
      setSelectedRackId(null);
      setSelectedRackIds([]);
    }
    stopCanvasAction();
    setSelectionBox(null);
    draggingRack.current = null;
  };

  const onRackMouseDown = (e: React.MouseEvent, rack: Rack) => {
    e.stopPropagation();
    stopCanvasAction();
    setSelectionBox(null);
    if (tool === 'SELECT') {
      setSelectedRackId(rack.id);
      if (!locked) {
        const bulkIds = selectedRackIds.length > 1 && selectedRackIds.includes(rack.id)
          ? selectedRackIds
          : [rack.id];
        const origins = Object.fromEntries(
          racks
            .filter(currentRack => bulkIds.includes(currentRack.id))
            .map(currentRack => [currentRack.id, { x: currentRack.x, y: currentRack.y }]),
        );
        if (bulkIds.length === 1) {
          setSelectedRackIds([]);
        }
        draggingRack.current = {
          ids: bulkIds,
          startClientX: e.clientX,
          startClientY: e.clientY,
          origins,
        };
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
    stopCanvasAction();
    setSelectionBox(null);
    const touch = e.touches[0];
    if (tool === 'SELECT') {
      setSelectedRackId(rack.id);
      if (!locked) {
        const bulkIds = selectedRackIds.length > 1 && selectedRackIds.includes(rack.id)
          ? selectedRackIds
          : [rack.id];
        const origins = Object.fromEntries(
          racks
            .filter(currentRack => bulkIds.includes(currentRack.id))
            .map(currentRack => [currentRack.id, { x: currentRack.x, y: currentRack.y }]),
        );
        if (bulkIds.length === 1) {
          setSelectedRackIds([]);
        }
        draggingRack.current = {
          ids: bulkIds,
          startClientX: touch.clientX,
          startClientY: touch.clientY,
          origins,
        };
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
  const marqueeSelectionCount = selectedRackIds.length;

  const sidebar = (
    <div className="flex h-full min-h-0 w-full flex-col border-[#b6aa9b] bg-[#ede6dc]">
      {/* Sidebar header */}
          <div className="flex items-center justify-between border-b border-[#b6aa9b] px-5 py-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-[#7d7569]">Builder</div>
          <div className="text-sm font-semibold text-[#232321]">Warehouse Layout</div>
        </div>
        <button type="button"
          onClick={() => setSidebarOpen(false)}
          className="hidden rounded p-1 text-[#7d7569] hover:bg-[#d8cfc2] hover:text-[#232321] md:flex"
          aria-label="Collapse sidebar"
        >
          {sidebarOnRight ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <button type="button"
          onClick={() => setMobileSheetOpen(false)}
          className="rounded p-1 text-[#7d7569] hover:bg-[#d8cfc2] hover:text-[#232321] md:hidden"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Section title="Command Deck">
          <div className="space-y-3">
            <div className="rounded-[22px] border border-[#c7bcae] bg-[#fbf8f2] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7d7569]">Quick Deploy</div>
                  <div className="mt-1 text-sm font-semibold text-[#232321]">{activeRackTemplate.name}</div>
                  <div className="mt-1 text-[11px] leading-5 text-[#7d7569]">{activeRackTemplate.description}</div>
                </div>
                <div className="rounded-full border border-[#b6aa9b] bg-[#ece6dd] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#6f665a]">
                  {activeRackTemplate.capacity} slots
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button"
                  onClick={addSingle}
                  disabled={!activeDept}
                  className="rounded-xl bg-[#5d7f81] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#4f7172] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add One
                </button>
                <button type="button"
                  onClick={addArray}
                  disabled={!activeDept}
                  className="rounded-xl border border-[#c7bcae] bg-[#f4efe6] px-3 py-2 text-xs font-bold text-[#4d4a44] transition hover:bg-[#ece6dd] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add Array
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {RACK_TEMPLATES.slice(0, 4).map(template => (
                <button type="button"
                  key={template.id}
                  onClick={() => {
                    setCreationMode('SINGLE');
                    setActiveTemplate(template.id);
                  }}
                  className={`rounded-[18px] border p-3 text-left transition ${
                    activeTemplate === template.id
                      ? 'border-[#5d7f81] bg-[#e4efef]'
                      : 'border-[#c7bcae] bg-[#f7f2ea] hover:border-[#a79b8d] hover:bg-[#f1ece4]'
                  }`}
                >
                  <div className="text-xs font-bold text-[#232321]">{template.name}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#857b6d]">
                    {template.width} × {template.height}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Department picker */}
        <Section title={`Active ${settings.departmentLabel}`}>
          <div className="grid grid-cols-1 gap-2 min-[481px]:grid-cols-2">
            {departments.map(d => {
              const Icon = getIcon(d.icon);
              const isActive = d.id === activeDept;
              return (
                <button type="button"
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
          <div className="grid grid-cols-1 gap-1 rounded-lg bg-[#ddd5c8] p-1 min-[481px]:grid-cols-3">
            {[
              { id: 'SINGLE', label: 'Single' },
              { id: 'ARRAY', label: 'Array' },
              { id: 'TEMPLATE', label: 'Layout' },
            ].map(opt => (
              <button type="button"
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
              <button type="button"
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
              <div className="grid grid-cols-1 gap-2 min-[481px]:grid-cols-2">
                <NumField label="Rows" value={arrayRows} onChange={setArrayRows} min={1} max={10} />
                <NumField label="Columns" value={arrayCols} onChange={setArrayCols} min={1} max={10} />
              </div>
              <NumField label="Gap" value={arrayGap} onChange={setArrayGap} min={0} max={500} step={10} />
              <div className="rounded bg-[#ece6dd] p-2 text-[11px] text-[#6e665c]">
                Will create <span className="font-bold text-[#232321]">{arrayRows * arrayCols}</span> {settings.rackLabel.toLowerCase()}s in a {arrayRows}×{arrayCols} grid.
              </div>
              <button type="button"
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
                <button type="button"
                  key={t.id}
                  onClick={() => addTemplate(t.id)}
                  disabled={!activeDept}
                  className="flex w-full items-center gap-3 rounded-lg border border-[#c7bcae] bg-[#fbf8f2] p-3 text-left transition hover:border-[#5d7f81] hover:bg-[#f1ede6] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded text-white"
                    style={{ backgroundColor: t.accent }}
                  >
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
        {marqueeSelectionCount > 1 && (
          <Section title="Bulk Selection">
            <div className="space-y-2 rounded-lg border border-[#97b8bb] bg-[#e4efef] p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-[#5f6d6e]">Highlighted</div>
                <div className="font-mono text-xs font-bold text-[#173338]">{marqueeSelectionCount}</div>
              </div>
              <div className="text-[11px] leading-5 text-[#436063]">
                Press and hold on open floor space, drag to highlight, then drag any highlighted {settings.rackLabel.toLowerCase()} to move the full group together.
              </div>
              <div className="grid grid-cols-1 gap-2 min-[481px]:grid-cols-2">
                <button type="button"
                  onClick={alignSelectedToGrid}
                  className="rounded-xl bg-[#5d7f81] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#4f7172]"
                >
                  Align to Grid
                </button>
                <button type="button"
                  onClick={() => {
                    setSelectedRackIds([]);
                    setSelectedRackId(null);
                  }}
                  className="rounded-xl border border-[#97b8bb] bg-[#eef6f6] px-3 py-2 text-xs font-bold text-[#35575d] transition hover:bg-[#e2eeee]"
                >
                  Clear Highlight
                </button>
                <button type="button"
                  onClick={() => setConfirming({ kind: 'delete', rackId: '__bulk__' })}
                  className="min-[481px]:col-span-2 rounded-xl border border-red-600/25 bg-red-600/10 px-3 py-2 text-xs font-bold text-red-500 transition hover:bg-red-600/15"
                >
                  Delete Highlighted
                </button>
              </div>
            </div>
          </Section>
        )}

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
                <button type="button"
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
              <button type="button"
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
            <SumRow label="Snap to grid" value={snapToGrid ? 'ON' : 'OFF'} />
            <SumRow label={`Active ${settings.departmentLabel}s`} value={String(departmentCount)} />
            <SumRow label="Occupancy" value={`${occupancyPercent}%`} highlight={occupancyPercent >= 80} />
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
            <button type="button"
              onClick={() => setConfirming({ kind: 'clear' })}
            className="flex-1 rounded border border-[#c7bcae] py-1.5 text-xs font-semibold text-[#6e665c] hover:bg-[#f1ede6]"
            >
              Discard
            </button>
            <button type="button"
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
        <div className="border-b border-[#c7bcae] bg-[linear-gradient(135deg,#f4efe7,#e6ddd1)] px-3 py-3 sm:px-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.26em] text-[#7d7569]">Virtual Layout Designer</div>
              <div className="mt-1 text-xl font-black text-[#232321]">Operational floor planning command deck</div>
              <div className="mt-1 text-sm text-[#6f665a]">
                Hold and drag to highlight groups, keep every move snapped, and deploy layouts with cleaner control.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <MetricPill label="Racks" value={String(racks.length)} tone="neutral" />
              <MetricPill label="Zones" value={String(departmentCount)} tone="neutral" />
              <MetricPill label="Occupancy" value={`${occupancyPercent}%`} tone={occupancyPercent >= 80 ? 'warning' : 'accent'} />
              <MetricPill label="Unsaved" value={String(newCount)} tone={newCount > 0 ? 'warning' : 'neutral'} />
            </div>
          </div>
        </div>

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
            <div className="rounded-full border border-[#b6aa9b] bg-[#f5f0e8] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#6f665a]">
              Grid {GRID_SIZE}
            </div>
            {marqueeSelectionCount > 1 && (
              <div className="rounded-full border border-[#97b8bb] bg-[#e4efef] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#315558]">
                {marqueeSelectionCount} Selected
              </div>
            )}
            {selectedRack && marqueeSelectionCount <= 1 && (
              <div className="rounded-full border border-[#c7bcae] bg-[#f6f1e8] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#6f665a]">
                Focus {selectedRack.id}
              </div>
            )}
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
            <IconBtn
              onClick={() => setSnapToGrid(enabled => !enabled)}
              icon={<Grid3x3 size={14} />}
              label={snapToGrid ? 'Snap on' : 'Snap off'}
              active={snapToGrid}
            />
            <div className="mx-1 hidden h-5 w-px bg-[#c7bcae] md:block" />
            <button type="button"
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
              <button type="button"
                onClick={() => setSidebarOpen(true)}
                className="hidden md:flex items-center gap-1.5 rounded bg-[#5d7f81] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4f7172]"
              >
                {sidebarOnRight ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                <span>Builder</span>
              </button>
            )}
            <button type="button"
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
          className="relative min-h-[calc(100dvh-15rem)] flex-1 overflow-hidden bg-[#d8d1c4] md:min-h-0"
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onMouseLeave={onCanvasMouseUp}
          onTouchStart={onCanvasTouchStart}
          onTouchMove={onCanvasTouchMove}
          onTouchEnd={onCanvasTouchEnd}
          onWheel={onWheel}
          data-canvas="true"
          style={{ cursor: canvasAction.current?.mode === 'panning' ? 'grabbing' : tool === 'SELECT' ? 'grab' : 'crosshair', touchAction: 'none' }}
        >
          {/* Grid background */}
          <div
            data-canvas="true"
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(120,111,98,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(120,111,98,0.16) 1px, transparent 1px)`,
              backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`,
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
            <div
              data-canvas="true"
              className="absolute overflow-hidden rounded-[56px] border border-[#9b9387] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),_rgba(255,255,255,0)_42%),linear-gradient(180deg,rgba(243,238,230,0.92),rgba(229,223,211,0.98))] shadow-[0_28px_80px_rgba(93,78,58,0.18)]"
              style={{
                left: 0,
                top: 0,
                width: FLOOR_WIDTH,
                height: FLOOR_HEIGHT,
              }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between border-b border-[#c9bfb1] bg-[#f6f1e8]/92 px-10 py-6">
                <div>
                  <div className="text-[46px] font-black uppercase tracking-[0.28em] text-[#31474d]">Virtual Layout Floor</div>
                  <div className="mt-2 text-[24px] font-semibold uppercase tracking-[0.2em] text-[#867b6d]">
                    Snap grid • drag to position • hold to marquee select
                  </div>
                </div>
                <div className="rounded-full border border-[#9cb9bb] bg-[#e5f0f1] px-8 py-4 text-[24px] font-black uppercase tracking-[0.24em] text-[#315458]">
                  {snapToGrid ? 'Snap ON' : 'Snap OFF'}
                </div>
              </div>

              {GRID_MARKERS.map(marker => (
                <div
                  key={`marker-x-${marker}`}
                  className="pointer-events-none absolute top-[132px] text-[32px] font-black uppercase tracking-[0.22em] text-[#998f81]/55"
                  style={{ left: marker }}
                >
                  X{marker / 100}
                </div>
              ))}
              {GRID_MARKERS.slice(0, 8).map(marker => (
                <div
                  key={`marker-y-${marker}`}
                  className="pointer-events-none absolute left-[36px] text-[32px] font-black uppercase tracking-[0.22em] text-[#998f81]/55"
                  style={{ top: marker + 120 }}
                >
                  Y{marker / 100}
                </div>
              ))}
            </div>

            {racks.map(rack => {
              const dept = getDepartmentMeta(rack.departmentId, departments);
              const isSelected = rack.id === selectedRackId;
              const isGroupSelected = selectedRackIds.includes(rack.id);
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
                    borderColor: isSelected || isGroupSelected ? '#45a3b8' : dept.color,
                    backgroundColor: rack.status === 'OFFLINE' ? '#1a1a1a' : `${dept.color}30`,
                    opacity: rack.status === 'OFFLINE' ? 0.5 : 1,
                    cursor: tool === 'DELETE' ? 'not-allowed' : 'pointer',
                    boxShadow: rack.isNew
                      ? '0 0 0 4px rgba(234, 179, 8, 0.6)'
                      : isSelected || isGroupSelected
                      ? '0 0 0 4px rgba(69, 163, 184, 0.35)'
                      : 'none',
                    borderRadius: 28,
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
                  {isGroupSelected && (
                    <div className="absolute left-3 top-3 rounded-full bg-[#45a3b8] px-3 py-1 text-[22px] font-black uppercase tracking-[0.24em] text-white">
                      LINKED
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
            {selectionBox && (
              <div
                className="pointer-events-none absolute border-4 border-dashed border-[#45a3b8] bg-[#45a3b8]/12"
                style={{
                  left: Math.min(selectionBox.startX, selectionBox.endX),
                  top: Math.min(selectionBox.startY, selectionBox.endY),
                  width: Math.abs(selectionBox.endX - selectionBox.startX),
                  height: Math.abs(selectionBox.endY - selectionBox.startY),
                  boxShadow: '0 0 0 12px rgba(69, 163, 184, 0.08)',
                }}
              />
            )}
          </div>

          {/* Footer hint */}
          <div className="pointer-events-none absolute inset-x-4 bottom-3 rounded-xl border border-[#c7bcae] bg-[#ede6dc]/94 px-3 py-2 text-[11px] leading-4 text-[#625a50] backdrop-blur sm:hidden">
            Hold on open floor, drag to highlight, then drag one highlighted rack to move the group.
          </div>
          <div className="pointer-events-none absolute bottom-2 left-1/2 hidden -translate-x-1/2 rounded bg-[#ede6dc]/92 px-3 py-1 text-[10px] text-[#625a50] backdrop-blur sm:block">
            Scroll to zoom · Drag open floor to pan · Hold then drag to marquee select · {locked ? 'Layout locked' : 'Drag highlighted racks to move in bulk'}
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
              : confirming.rackId === '__bulk__' ? 'Delete highlighted racks?'
              : 'Delete this rack?'}
            </h3>
            <p className="mb-5 text-sm text-[#5d564d]">
              {confirming.kind === 'commit'
                ? `${newCount} change${newCount === 1 ? '' : 's'} will be committed to your warehouse layout.`
                : confirming.kind === 'clear'
                ? 'All unsaved racks will be removed. This cannot be undone.'
                : confirming.rackId === '__bulk__'
                ? `${selectedRackIds.length} highlighted ${settings.rackLabel.toLowerCase()}${selectedRackIds.length === 1 ? '' : 's'} will be removed from the floor plan.`
                : 'The rack will be removed. Inventory currently assigned to it will become unassigned.'}
            </p>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => setConfirming(null)}
                className="flex-1 rounded border border-[#c7bcae] py-2 text-sm text-[#6e665c] hover:bg-[#f1ede6]"
              >
                Cancel
              </button>
              <button type="button"
                onClick={() => {
                  if (confirming.kind === 'commit') commitChanges();
                  else if (confirming.kind === 'clear') clearUnsaved();
                  else if (confirming.kind === 'delete' && confirming.rackId === '__bulk__') deleteSelectedRacks();
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

const MetricPill: React.FC<{ label: string; value: string; tone: 'neutral' | 'accent' | 'warning' }> = ({ label, value, tone }) => {
  const palette = tone === 'accent'
    ? 'border-[#97b8bb] bg-[#e4efef] text-[#315558]'
    : tone === 'warning'
    ? 'border-[#d3b06b] bg-[#f5ebd0] text-[#7e5a14]'
    : 'border-[#c7bcae] bg-[#f6f1e8] text-[#6f665a]';

  return (
    <div className={`rounded-2xl border px-3 py-2 ${palette}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.22em]">{label}</div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  );
};

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
  <button type="button"
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
  <button type="button"
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
