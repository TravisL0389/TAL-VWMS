import { useState, useEffect, useCallback } from 'react';
import {
  STORAGE_KEYS, loadJSON, saveJSON, shortId,
} from './storage';
import {
  DEFAULT_SETTINGS, DEFAULT_WAREHOUSE, INDUSTRY_PRESETS, ICON_OPTIONS,
} from '../constants';
import type {
  AppSettings, Warehouse, DepartmentDef, Rack, InventoryItem, Order, Notification,
} from '../types';

// ---------------------------------------------------------------------------
// useDataStore — single hook every component reads from. Persists everything
// to localStorage automatically.
// ---------------------------------------------------------------------------

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: shortId('n'),
    type: 'INFO',
    title: 'Welcome to VWMS',
    message: 'Your warehouse is ready. Start by adding inventory or laying out your floor.',
    time: Date.now(),
    unread: true,
  },
];

const VALID_ICON_KEYS = new Set<string>(ICON_OPTIONS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function sanitizeSettings(raw: unknown): AppSettings {
  if (!isRecord(raw)) return { ...DEFAULT_SETTINGS };
  return {
    warehouseId: sanitizeText(raw.warehouseId, DEFAULT_SETTINGS.warehouseId),
    sidebarPosition: raw.sidebarPosition === 'RIGHT' ? 'RIGHT' : 'LEFT',
    density: raw.density === 'COMPACT' ? 'COMPACT' : 'COMFORTABLE',
    enableAI: typeof raw.enableAI === 'boolean' ? raw.enableAI : DEFAULT_SETTINGS.enableAI,
    enableNotifications: typeof raw.enableNotifications === 'boolean' ? raw.enableNotifications : DEFAULT_SETTINGS.enableNotifications,
    enableAutosave: typeof raw.enableAutosave === 'boolean' ? raw.enableAutosave : DEFAULT_SETTINGS.enableAutosave,
    brandName: sanitizeText(raw.brandName, DEFAULT_SETTINGS.brandName),
    departmentLabel: sanitizeText(raw.departmentLabel, DEFAULT_SETTINGS.departmentLabel),
    itemLabel: sanitizeText(raw.itemLabel, DEFAULT_SETTINGS.itemLabel),
    rackLabel: sanitizeText(raw.rackLabel, DEFAULT_SETTINGS.rackLabel),
  };
}

function sanitizeWarehouses(raw: unknown): Warehouse[] {
  if (!Array.isArray(raw)) return [{ ...DEFAULT_WAREHOUSE }];
  const warehouses = raw.flatMap((item): Warehouse[] => {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim()) return [];
    return [{
      id: item.id.trim(),
      name: sanitizeText(item.name, 'Warehouse'),
      location: typeof item.location === 'string' ? item.location : '',
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
    }];
  });
  return warehouses.length > 0 ? warehouses : [{ ...DEFAULT_WAREHOUSE }];
}

function sanitizeDepartments(raw: unknown): DepartmentDef[] {
  if (!Array.isArray(raw)) return INDUSTRY_PRESETS[0].departments.map(d => ({ ...d }));
  const departments = raw.flatMap((item, idx): DepartmentDef[] => {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim()) return [];
    const fallback = INDUSTRY_PRESETS[0].departments[idx % INDUSTRY_PRESETS[0].departments.length];
    return [{
      id: item.id.trim(),
      label: sanitizeText(item.label, fallback.label),
      prefix: sanitizeText(item.prefix, fallback.prefix).toUpperCase().slice(0, 4) || fallback.prefix,
      color: typeof item.color === 'string' && item.color.trim() ? item.color : fallback.color,
      icon: typeof item.icon === 'string' && VALID_ICON_KEYS.has(item.icon) ? item.icon as DepartmentDef['icon'] : fallback.icon,
    }];
  });
  return departments.length > 0 ? departments : INDUSTRY_PRESETS[0].departments.map(d => ({ ...d }));
}

function sanitizeRecordOfArrays<T>(raw: unknown): Record<string, T[]> {
  if (!isRecord(raw)) return {};
  return Object.entries(raw).reduce<Record<string, T[]>>((acc, [key, value]) => {
    if (Array.isArray(value)) acc[key] = value as T[];
    return acc;
  }, {});
}

function sanitizeNotifications(raw: unknown): Notification[] {
  if (!Array.isArray(raw)) return [...DEFAULT_NOTIFICATIONS];
  const notifications = raw.flatMap((item): Notification[] => {
    if (!isRecord(item)) return [];
    const type = item.type;
    if (!['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'AI'].includes(String(type))) return [];
    return [{
      id: sanitizeText(item.id, shortId('n')),
      type: type as Notification['type'],
      title: sanitizeText(item.title, 'Notification'),
      message: sanitizeText(item.message, ''),
      time: typeof item.time === 'number' ? item.time : Date.now(),
      unread: typeof item.unread === 'boolean' ? item.unread : true,
    }];
  });
  return notifications.length > 0 ? notifications : [...DEFAULT_NOTIFICATIONS];
}

function sanitizeRacks(raw: unknown): Rack[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): Rack[] => {
    if (!isRecord(item)) return [];
    const id = sanitizeText(item.id, '');
    const warehouseId = sanitizeText(item.warehouseId, '');
    const departmentId = sanitizeText(item.departmentId, '');
    if (!id || !warehouseId || !departmentId) return [];
    return [{
      id,
      name: typeof item.name === 'string' ? item.name : '',
      warehouseId,
      departmentId,
      x: typeof item.x === 'number' ? item.x : 0,
      y: typeof item.y === 'number' ? item.y : 0,
      width: typeof item.width === 'number' ? item.width : 1200,
      height: typeof item.height === 'number' ? item.height : 800,
      status: item.status === 'MAINTENANCE' || item.status === 'OFFLINE' ? item.status : 'OPERATIONAL',
      capacity: typeof item.capacity === 'number' ? item.capacity : 0,
      occupied: typeof item.occupied === 'number' ? item.occupied : 0,
      notes: typeof item.notes === 'string' ? item.notes : '',
      isNew: typeof item.isNew === 'boolean' ? item.isNew : false,
    }];
  });
}

function sanitizeInventory(raw: unknown): InventoryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): InventoryItem[] => {
    if (!isRecord(item)) return [];
    const id = sanitizeText(item.id, '');
    const departmentId = sanitizeText(item.departmentId, '');
    const warehouseId = sanitizeText(item.warehouseId, '');
    const sku = sanitizeText(item.sku, '');
    const name = sanitizeText(item.name, '');
    if (!id || !departmentId || !warehouseId || !sku || !name) return [];
    return [{
      id,
      name,
      sku,
      barcode: typeof item.barcode === 'string' ? item.barcode : '',
      rfid: typeof item.rfid === 'string' ? item.rfid : '',
      departmentId,
      warehouseId,
      rackId: typeof item.rackId === 'string' && item.rackId.trim() ? item.rackId : undefined,
      shelf: typeof item.shelf === 'number' ? item.shelf : undefined,
      position: item.position === 'FRONT' || item.position === 'BACK' ? item.position : undefined,
      quantity: typeof item.quantity === 'number' ? item.quantity : 0,
      available: typeof item.available === 'number' ? item.available : 0,
      status: item.status === 'IN_USE' || item.status === 'REPAIR' || item.status === 'RETIRED' ? item.status : 'AVAILABLE',
      notes: typeof item.notes === 'string' ? item.notes : '',
      lastUpdated: typeof item.lastUpdated === 'number' ? item.lastUpdated : Date.now(),
    }];
  });
}

function sanitizeOrders(raw: unknown): Order[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): Order[] => {
    if (!isRecord(item)) return [];
    const id = sanitizeText(item.id, '');
    const reference = sanitizeText(item.reference, '');
    const warehouseId = sanitizeText(item.warehouseId, '');
    if (!id || !reference || !warehouseId) return [];
    const lines = Array.isArray(item.lines)
      ? item.lines.flatMap((line): Order['lines'] => {
        if (!isRecord(line)) return [];
        const itemId = sanitizeText(line.itemId, '');
        const sku = sanitizeText(line.sku, '');
        const name = sanitizeText(line.name, '');
        if (!itemId || !sku || !name) return [];
        return [{
          itemId,
          sku,
          name,
          quantity: typeof line.quantity === 'number' ? line.quantity : 0,
          pulled: typeof line.pulled === 'number' ? line.pulled : 0,
        }];
      })
      : [];
    return [{
      id,
      reference,
      client: typeof item.client === 'string' ? item.client : '',
      project: typeof item.project === 'string' ? item.project : '',
      warehouseId,
      status: item.status === 'DRAFT' || item.status === 'PENDING' || item.status === 'PULLING' || item.status === 'PACKED' || item.status === 'SHIPPED' || item.status === 'CANCELLED'
        ? item.status
        : 'DRAFT',
      priority: item.priority === 'LOW' || item.priority === 'HIGH' || item.priority === 'URGENT' ? item.priority : 'NORMAL',
      dueDate: typeof item.dueDate === 'number' ? item.dueDate : undefined,
      lines,
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
    }];
  });
}

function sanitizeRecordOfEntities<T>(raw: unknown, sanitizeArray: (value: unknown) => T[]): Record<string, T[]> {
  if (!isRecord(raw)) return {};
  return Object.entries(raw).reduce<Record<string, T[]>>((acc, [key, value]) => {
    const sanitized = sanitizeArray(value);
    if (sanitized.length > 0) acc[key] = sanitized;
    else if (Array.isArray(value)) acc[key] = [];
    return acc;
  }, {});
}

export function useDataStore() {
  const initialWarehouses = sanitizeWarehouses(
    loadJSON<unknown>(STORAGE_KEYS.WAREHOUSES, [DEFAULT_WAREHOUSE])
  );
  const initialSettings = (() => {
    const loaded = sanitizeSettings(loadJSON<unknown>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS));
    const warehouseId = initialWarehouses.some(w => w.id === loaded.warehouseId)
      ? loaded.warehouseId
      : initialWarehouses[0].id;
    return { ...loaded, warehouseId };
  })();

  // SETUP
  const [setupDone, setSetupDone] = useState<boolean>(() =>
    loadJSON<boolean>(STORAGE_KEYS.SETUP_DONE, false)
  );

  // SETTINGS
  const [settings, setSettings] = useState<AppSettings>(() =>
    initialSettings
  );

  // WAREHOUSES
  const [warehouses, setWarehouses] = useState<Warehouse[]>(() =>
    initialWarehouses
  );

  // DEPARTMENTS — global, shared across warehouses
  const [departments, setDepartments] = useState<DepartmentDef[]>(() =>
    sanitizeDepartments(loadJSON<unknown>(STORAGE_KEYS.DEPARTMENTS, INDUSTRY_PRESETS[0].departments))
  );

  // RACKS — keyed by warehouseId
  const [racksByWh, setRacksByWh] = useState<Record<string, Rack[]>>(() =>
    sanitizeRecordOfEntities<Rack>(loadJSON<unknown>(STORAGE_KEYS.RACKS, {}), sanitizeRacks)
  );

  // INVENTORY — keyed by warehouseId
  const [inventoryByWh, setInventoryByWh] = useState<Record<string, InventoryItem[]>>(() =>
    sanitizeRecordOfEntities<InventoryItem>(loadJSON<unknown>(STORAGE_KEYS.INVENTORY, {}), sanitizeInventory)
  );

  // ORDERS — keyed by warehouseId
  const [ordersByWh, setOrdersByWh] = useState<Record<string, Order[]>>(() =>
    sanitizeRecordOfEntities<Order>(loadJSON<unknown>(STORAGE_KEYS.ORDERS, {}), sanitizeOrders)
  );

  // NOTIFICATIONS — global
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    sanitizeNotifications(loadJSON<unknown>(STORAGE_KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS))
  );

  useEffect(() => {
    if (!warehouses.some(warehouse => warehouse.id === settings.warehouseId) && warehouses[0]) {
      setSettings(prev => ({ ...prev, warehouseId: warehouses[0].id }));
    }
  }, [warehouses, settings.warehouseId]);

  // Persist on change
  useEffect(() => { saveJSON(STORAGE_KEYS.SETUP_DONE, setupDone); }, [setupDone]);
  useEffect(() => { saveJSON(STORAGE_KEYS.SETTINGS, settings); }, [settings]);
  useEffect(() => { saveJSON(STORAGE_KEYS.WAREHOUSES, warehouses); }, [warehouses]);
  useEffect(() => { saveJSON(STORAGE_KEYS.DEPARTMENTS, departments); }, [departments]);
  useEffect(() => { saveJSON(STORAGE_KEYS.RACKS, racksByWh); }, [racksByWh]);
  useEffect(() => { saveJSON(STORAGE_KEYS.INVENTORY, inventoryByWh); }, [inventoryByWh]);
  useEffect(() => { saveJSON(STORAGE_KEYS.ORDERS, ordersByWh); }, [ordersByWh]);
  useEffect(() => { saveJSON(STORAGE_KEYS.NOTIFICATIONS, notifications); }, [notifications]);

  // Convenience accessors for the active warehouse
  const activeId = settings.warehouseId;
  const racks = racksByWh[activeId] || [];
  const inventory = inventoryByWh[activeId] || [];
  const orders = ordersByWh[activeId] || [];

  const setRacks = useCallback((updater: Rack[] | ((prev: Rack[]) => Rack[])) => {
    setRacksByWh(prev => {
      const current = prev[activeId] || [];
      const next = typeof updater === 'function' ? (updater as any)(current) : updater;
      return { ...prev, [activeId]: next };
    });
  }, [activeId]);

  const setInventory = useCallback((updater: InventoryItem[] | ((prev: InventoryItem[]) => InventoryItem[])) => {
    setInventoryByWh(prev => {
      const current = prev[activeId] || [];
      const next = typeof updater === 'function' ? (updater as any)(current) : updater;
      return { ...prev, [activeId]: next };
    });
  }, [activeId]);

  const setOrders = useCallback((updater: Order[] | ((prev: Order[]) => Order[])) => {
    setOrdersByWh(prev => {
      const current = prev[activeId] || [];
      const next = typeof updater === 'function' ? (updater as any)(current) : updater;
      return { ...prev, [activeId]: next };
    });
  }, [activeId]);

  const pushNotification = useCallback((n: Omit<Notification, 'id' | 'time' | 'unread'> & Partial<Pick<Notification, 'unread'>>) => {
    setNotifications(prev => [
      { id: shortId('n'), time: Date.now(), unread: n.unread ?? true, ...n },
      ...prev,
    ].slice(0, 50));
  }, []);

  return {
    // status
    setupDone, setSetupDone,
    // settings
    settings, setSettings,
    // warehouses
    warehouses, setWarehouses,
    activeWarehouse: warehouses.find(w => w.id === activeId) || warehouses[0],
    // departments
    departments, setDepartments,
    // active warehouse data
    racks, setRacks,
    inventory, setInventory,
    orders, setOrders,
    // notifications
    notifications, setNotifications, pushNotification,
  };
}
