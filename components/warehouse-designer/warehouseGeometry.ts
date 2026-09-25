import type { DepartmentDef, InventoryItem, Rack } from '../../types';
import { clampRfidPower, createDefaultRfidSystemState } from '../../utils/rfidController';
import { downloadFile, shortId } from '../../utils/storage';
import type {
  CollisionIssue,
  DesignerStats,
  FloorPlanMigrationResult,
  RackTemplateDefinition,
  WarehouseClientPreview,
  WarehouseFloorDimensions,
  WarehouseFloorObject,
  WarehouseFloorPlan,
  WarehouseObjectType,
  WarehouseRfidSystemState,
} from './warehouseTypes';

export const FLOOR_PLAN_VERSION = 3;

export const DEFAULT_FLOOR_DIMENSIONS: WarehouseFloorDimensions = {
  width: 120,
  depth: 80,
  unit: 'ft',
  gridSize: 5,
};

const NON_BLOCKING_OBJECT_TYPES: WarehouseObjectType[] = [
  'ZONE',
  'AISLE',
  'STAGING',
  'RECEIVING',
  'SHIPPING',
  'OFFICE',
  'RESTRICTED',
  'IOT_SENSOR',
  'CAMERA',
  'RFID_ANTENNA',
  'RFID_READER',
];

const OBJECT_LABELS: Record<WarehouseObjectType, string> = {
  RACK: 'Rack',
  PALLET: 'Pallet',
  CONVEYOR: 'Conveyor',
  PACK_STATION: 'Pack Station',
  FORKLIFT: 'Forklift',
  AMR: 'AMR Robot',
  CHARGING_STATION: 'Charging Station',
  SAFETY_BARRIER: 'Safety Barrier',
  IOT_SENSOR: 'IoT Sensor',
  CAMERA: 'Safety Camera',
  RFID_ANTENNA: 'RFID Antenna',
  RFID_PORTAL: 'RFID Portal',
  RFID_READER: 'RFID Reader Hub',
  ZONE: 'Zone',
  AISLE: 'Aisle',
  DOCK_DOOR: 'Dock Door',
  STAGING: 'Staging Area',
  RECEIVING: 'Receiving Area',
  SHIPPING: 'Shipping Area',
  OFFICE: 'Office',
  RESTRICTED: 'Restricted Area',
};

const DEFAULT_OBJECT_COLORS: Record<WarehouseObjectType, string> = {
  RACK: '#45a3b8',
  PALLET: '#a97945',
  CONVEYOR: '#5d7f81',
  PACK_STATION: '#668c77',
  FORKLIFT: '#d0a95c',
  AMR: '#45a3b8',
  CHARGING_STATION: '#6f88a8',
  SAFETY_BARRIER: '#d8a627',
  IOT_SENSOR: '#4d8ba8',
  CAMERA: '#7d7569',
  RFID_ANTENNA: '#3d8b79',
  RFID_PORTAL: '#2f6f75',
  RFID_READER: '#4d7275',
  ZONE: '#6b8c90',
  AISLE: '#7b8791',
  DOCK_DOOR: '#d0a95c',
  STAGING: '#4f7d78',
  RECEIVING: '#4d8ba8',
  SHIPPING: '#6f88a8',
  OFFICE: '#7f8b77',
  RESTRICTED: '#9d4f4f',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function sanitizeRfidSystem(raw: unknown): WarehouseRfidSystemState {
  const fallback = createDefaultRfidSystemState();
  if (!isRecord(raw)) return fallback;
  const validModes = ['AUTO', 'INTAKE', 'OUTTAKE', 'CYCLE_COUNT', 'MAINTENANCE'];
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : false,
    mode: validModes.includes(String(raw.mode))
      ? raw.mode as WarehouseRfidSystemState['mode']
      : fallback.mode,
    txPower: clampRfidPower(asNumber(raw.txPower, fallback.txPower)),
    readIntervalMs: Math.max(100, Math.round(asNumber(raw.readIntervalMs, fallback.readIntervalMs))),
    duplicateWindowMs: Math.max(0, Math.round(asNumber(raw.duplicateWindowMs, fallback.duplicateWindowMs))),
    lastUpdated: asNumber(raw.lastUpdated, fallback.lastUpdated),
  };
}

export function getObjectColor(object: WarehouseFloorObject, departments: DepartmentDef[]): string {
  if (object.color) return object.color;
  if (object.departmentId) {
    const department = departments.find((item) => item.id === object.departmentId);
    if (department?.color) return department.color;
  }
  return DEFAULT_OBJECT_COLORS[object.type];
}

export function getObjectLabel(type: WarehouseObjectType): string {
  return OBJECT_LABELS[type];
}

export function sanitizeDimensions(raw: unknown): WarehouseFloorDimensions {
  if (!isRecord(raw)) return { ...DEFAULT_FLOOR_DIMENSIONS };
  return {
    width: Math.max(20, asNumber(raw.width, DEFAULT_FLOOR_DIMENSIONS.width)),
    depth: Math.max(20, asNumber(raw.depth, DEFAULT_FLOOR_DIMENSIONS.depth)),
    unit: raw.unit === 'm' ? 'm' : 'ft',
    gridSize: Math.max(1, asNumber(raw.gridSize, DEFAULT_FLOOR_DIMENSIONS.gridSize)),
  };
}

export function sanitizeFloorObject(raw: unknown, warehouseId: string): WarehouseFloorObject | null {
  if (!isRecord(raw)) return null;
  const type = raw.type;
  const validType = [
    'RACK',
    'PALLET',
    'CONVEYOR',
    'PACK_STATION',
    'FORKLIFT',
    'AMR',
    'CHARGING_STATION',
    'SAFETY_BARRIER',
    'IOT_SENSOR',
    'CAMERA',
    'RFID_ANTENNA',
    'RFID_PORTAL',
    'RFID_READER',
    'ZONE',
    'AISLE',
    'DOCK_DOOR',
    'STAGING',
    'RECEIVING',
    'SHIPPING',
    'OFFICE',
    'RESTRICTED',
  ].includes(String(type))
    ? (type as WarehouseObjectType)
    : null;

  if (!validType) return null;

  const id = asString(raw.id, '');
  if (!id) return null;

  return {
    id,
    warehouseId: asString(raw.warehouseId, warehouseId),
    type: validType,
    name: asString(raw.name, `${OBJECT_LABELS[validType]} ${id.slice(-4)}`),
    departmentId: typeof raw.departmentId === 'string' && raw.departmentId.trim() ? raw.departmentId : undefined,
    x: asNumber(raw.x, 0),
    y: asNumber(raw.y, 0),
    width: Math.max(1, asNumber(raw.width, 10)),
    depth: Math.max(1, asNumber(raw.depth, 10)),
    height: Math.max(1, asNumber(raw.height, validType === 'RACK' ? 16 : 1)),
    rotation: asNumber(raw.rotation, 0),
    assetModel:
      typeof raw.assetModel === 'string'
        ? raw.assetModel as WarehouseFloorObject['assetModel']
        : validType === 'RACK'
          ? 'PALLET_RACK'
          : undefined,
    shelfLevels: validType === 'RACK' ? Math.max(1, Math.round(asNumber(raw.shelfLevels, 4))) : undefined,
    bayCount: validType === 'RACK' ? Math.max(1, Math.round(asNumber(raw.bayCount, 3))) : undefined,
    loadCount: Math.max(0, Math.round(asNumber(raw.loadCount, validType === 'PALLET' ? 4 : 0))),
    automationState:
      raw.automationState === 'ACTIVE' ||
      raw.automationState === 'IDLE' ||
      raw.automationState === 'CHARGING' ||
      raw.automationState === 'FAULT'
        ? raw.automationState
        : undefined,
    sensorRange: Math.max(0, asNumber(raw.sensorRange, 0)) || undefined,
    rfidEnabled:
      ['RFID_ANTENNA', 'RFID_PORTAL', 'RFID_READER'].includes(validType)
        ? typeof raw.rfidEnabled === 'boolean' ? raw.rfidEnabled : true
        : undefined,
    rfidPower:
      ['RFID_ANTENNA', 'RFID_PORTAL', 'RFID_READER'].includes(validType)
        ? clampRfidPower(asNumber(raw.rfidPower, 24))
        : undefined,
    rfidMode:
      raw.rfidMode === 'AUTO' ||
      raw.rfidMode === 'INTAKE' ||
      raw.rfidMode === 'OUTTAKE' ||
      raw.rfidMode === 'CYCLE_COUNT' ||
      raw.rfidMode === 'MAINTENANCE'
        ? raw.rfidMode
        : undefined,
    rfidReaderId: typeof raw.rfidReaderId === 'string' && raw.rfidReaderId.trim() ? raw.rfidReaderId.trim() : undefined,
    rfidReadRate: Math.max(0, Math.round(asNumber(raw.rfidReadRate, 0))),
    color: typeof raw.color === 'string' && raw.color.trim() ? raw.color : undefined,
    status:
      raw.status === 'MAINTENANCE' || raw.status === 'OFFLINE' || raw.status === 'OPERATIONAL'
        ? raw.status
        : validType === 'RACK'
          ? 'OPERATIONAL'
          : undefined,
    capacity: asNumber(raw.capacity, validType === 'RACK' ? 0 : 0),
    occupied: asNumber(raw.occupied, 0),
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    locked: typeof raw.locked === 'boolean' ? raw.locked : false,
    isNew: typeof raw.isNew === 'boolean' ? raw.isNew : false,
  };
}

export function racksToFloorObjects(racks: Rack[]): WarehouseFloorObject[] {
  return racks.map((rack) => ({
    id: rack.id,
    warehouseId: rack.warehouseId,
    type: 'RACK',
    name: rack.name?.trim() || `Rack ${rack.id.slice(-4).toUpperCase()}`,
    departmentId: rack.departmentId,
    x: rack.x / 100,
    y: rack.y / 100,
    width: rack.width / 100,
    depth: rack.height / 100,
    height: Math.max(12, Math.round(rack.height / 110)),
    rotation: 0,
    assetModel: 'PALLET_RACK',
    shelfLevels: 4,
    bayCount: 3,
    status: rack.status,
    capacity: rack.capacity,
    occupied: rack.occupied,
    notes: rack.notes || '',
    locked: false,
    isNew: rack.isNew ?? false,
  }));
}

export function floorObjectsToRacks(objects: WarehouseFloorObject[]): Rack[] {
  return objects
    .filter((object) => object.type === 'RACK')
    .map((object) => ({
      id: object.id,
      name: object.name,
      warehouseId: object.warehouseId,
      departmentId: object.departmentId || 'unknown',
      x: Math.round(object.x * 100),
      y: Math.round(object.y * 100),
      width: Math.round(object.width * 100),
      height: Math.round(object.depth * 100),
      status: object.status || 'OPERATIONAL',
      capacity: Math.max(0, Math.round(object.capacity || 0)),
      occupied: Math.max(0, Math.round(object.occupied || 0)),
      notes: object.notes || '',
      isNew: object.isNew ?? false,
    }));
}

export function createDefaultFloorPlan(warehouseId: string, racks: Rack[]): WarehouseFloorPlan {
  return {
    warehouseId,
    dimensions: { ...DEFAULT_FLOOR_DIMENSIONS },
    objects: racksToFloorObjects(racks),
    rfidSystem: createDefaultRfidSystemState(),
    updatedAt: Date.now(),
    version: FLOOR_PLAN_VERSION,
  };
}

export function sanitizeFloorPlan(raw: unknown, warehouseId: string, racks: Rack[]): WarehouseFloorPlan {
  if (!isRecord(raw)) return createDefaultFloorPlan(warehouseId, racks);
  const objects = Array.isArray(raw.objects)
    ? raw.objects
        .map((item) => sanitizeFloorObject(item, warehouseId))
        .filter((item): item is WarehouseFloorObject => item !== null)
    : racksToFloorObjects(racks);

  return {
    warehouseId: asString(raw.warehouseId, warehouseId),
    dimensions: sanitizeDimensions(raw.dimensions),
    objects,
    rfidSystem: sanitizeRfidSystem(raw.rfidSystem),
    updatedAt: asNumber(raw.updatedAt, Date.now()),
    version: Math.max(FLOOR_PLAN_VERSION, asNumber(raw.version, FLOOR_PLAN_VERSION)),
  };
}

export function migrateFloorPlan(raw: unknown, warehouseId: string, racks: Rack[]): FloorPlanMigrationResult {
  const plan = sanitizeFloorPlan(raw, warehouseId, racks);
  const derivedRacks = floorObjectsToRacks(plan.objects);
  return { plan, derivedRacks };
}

export function updateRackOccupancyFromInventory(
  objects: WarehouseFloorObject[],
  inventory: InventoryItem[],
): WarehouseFloorObject[] {
  const totals = inventory.reduce<Record<string, number>>((acc, item) => {
    if (!item.rackId) return acc;
    acc[item.rackId] = (acc[item.rackId] || 0) + item.quantity;
    return acc;
  }, {});

  return objects.map((object) => (
    object.type === 'RACK'
      ? { ...object, occupied: totals[object.id] || object.occupied || 0 }
      : object
  ));
}

function intersects(a: WarehouseFloorObject, b: WarehouseFloorObject): boolean {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.depth;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.depth;

  return !(ax2 <= b.x || bx2 <= a.x || ay2 <= b.y || by2 <= a.y);
}

export function detectLayoutConflicts(objects: WarehouseFloorObject[]): CollisionIssue[] {
  const issues: CollisionIssue[] = [];
  const collidable = objects.filter((object) => !NON_BLOCKING_OBJECT_TYPES.includes(object.type));
  for (let i = 0; i < collidable.length; i += 1) {
    for (let j = i + 1; j < collidable.length; j += 1) {
      const a = collidable[i];
      const b = collidable[j];
      if (!intersects(a, b)) continue;
      issues.push({
        sourceId: a.id,
        targetId: b.id,
        message: `${a.name} overlaps ${b.name}`,
      });
    }
  }
  return issues;
}

export function findFreePlacement(
  object: WarehouseFloorObject,
  objects: WarehouseFloorObject[],
  dimensions: WarehouseFloorDimensions,
): WarehouseFloorObject {
  const step = Math.max(1, dimensions.gridSize);
  const maxX = Math.max(0, dimensions.width - object.width);
  const maxY = Math.max(0, dimensions.depth - object.depth);
  const existing = objects.filter((item) => !NON_BLOCKING_OBJECT_TYPES.includes(item.type));

  if (object.type === 'DOCK_DOOR') {
    for (let x = 0; x <= maxX; x += step) {
      const candidate = clampObjectToFloor({ ...object, x, y: 0 }, dimensions);
      if (!existing.some((item) => intersects(candidate, item))) return candidate;
    }
  }

  for (let y = step; y <= maxY; y += step) {
    for (let x = step; x <= maxX; x += step) {
      const candidate = clampObjectToFloor({ ...object, x, y }, dimensions);
      if (!existing.some((item) => intersects(candidate, item))) return candidate;
    }
  }

  return clampObjectToFloor(object, dimensions);
}

export function getConflictsForObject(objectId: string, issues: CollisionIssue[]): CollisionIssue[] {
  return issues.filter((issue) => issue.sourceId === objectId || issue.targetId === objectId);
}

export function snapToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

export function nudgeObjectToFreeSpace(
  object: WarehouseFloorObject,
  objects: WarehouseFloorObject[],
  gridSize: number,
): WarehouseFloorObject | null {
  const candidates = [
    [gridSize, 0],
    [-gridSize, 0],
    [0, gridSize],
    [0, -gridSize],
    [gridSize, gridSize],
    [gridSize * 2, 0],
    [0, gridSize * 2],
  ];

  for (const [dx, dy] of candidates) {
    const next = {
      ...object,
      x: Math.max(0, snapToGrid(object.x + dx, gridSize)),
      y: Math.max(0, snapToGrid(object.y + dy, gridSize)),
    };
    const others = objects.filter((item) => item.id !== object.id);
    if (!getConflictsForObject(next.id, detectLayoutConflicts([...others, next])).length) {
      return next;
    }
  }

  return null;
}

export function computeDesignerStats(objects: WarehouseFloorObject[], issues: CollisionIssue[]): DesignerStats {
  const racks = objects.filter((object) => object.type === 'RACK');
  const zones = objects.filter((object) => object.type === 'ZONE');
  const automation = objects.filter((object) => ['CONVEYOR', 'PACK_STATION', 'AMR', 'CHARGING_STATION', 'IOT_SENSOR', 'CAMERA', 'RFID_ANTENNA', 'RFID_PORTAL', 'RFID_READER'].includes(object.type));
  const totalCapacity = racks.reduce((sum, rack) => sum + (rack.capacity || 0), 0);
  const totalOccupied = racks.reduce((sum, rack) => sum + Math.min(rack.occupied || 0, rack.capacity || 0), 0);

  return {
    rackCount: racks.length,
    zoneCount: zones.length,
    automationCount: automation.length,
    objectCount: objects.length,
    occupancyPercent: totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0,
    conflictCount: issues.length,
  };
}

export function buildClientPreview(plan: WarehouseFloorPlan): WarehouseClientPreview {
  const stats = computeDesignerStats(plan.objects, detectLayoutConflicts(plan.objects));
  return {
    warehouseId: plan.warehouseId,
    dimensions: plan.dimensions,
    objectCount: stats.objectCount,
    rackCount: stats.rackCount,
    zoneCount: stats.zoneCount,
    occupancyPercent: stats.occupancyPercent,
    exportedAt: Date.now(),
    rfidSystem: plan.rfidSystem,
    objects: plan.objects.map((object) => ({
      id: object.id,
      type: object.type,
      name: object.name,
      x: object.x,
      y: object.y,
      width: object.width,
      depth: object.depth,
      height: object.height,
      assetModel: object.assetModel,
      shelfLevels: object.shelfLevels,
      bayCount: object.bayCount,
      automationState: object.automationState,
      rfidEnabled: object.rfidEnabled,
      rfidPower: object.rfidPower,
      rfidMode: object.rfidMode,
      rfidReaderId: object.rfidReaderId,
      rfidReadRate: object.rfidReadRate,
      status: object.status,
      departmentId: object.departmentId,
    })),
  };
}

export function exportFloorPlanJSON(plan: WarehouseFloorPlan, fileBase: string): void {
  downloadFile(`${fileBase}.json`, JSON.stringify(plan, null, 2), 'application/json');
}

export function exportClientPreviewJSON(plan: WarehouseFloorPlan, fileBase: string): void {
  downloadFile(`${fileBase}-client-preview.json`, JSON.stringify(buildClientPreview(plan), null, 2), 'application/json');
}

export function validateFloorPlanImport(raw: unknown, warehouseId: string): WarehouseFloorPlan {
  const plan = sanitizeFloorPlan(raw, warehouseId, []);
  if (!plan.objects.length) {
    throw new Error('Imported floor plan does not contain any layout objects.');
  }
  return {
    ...plan,
    warehouseId,
    objects: plan.objects.map((object) => ({ ...object, warehouseId })),
    updatedAt: Date.now(),
    version: FLOOR_PLAN_VERSION,
  };
}

export function createFloorObject(partial: Partial<WarehouseFloorObject> & Pick<WarehouseFloorObject, 'warehouseId' | 'type'>): WarehouseFloorObject {
  const type = partial.type;
  return {
    id: partial.id || shortId(type.toLowerCase()),
    warehouseId: partial.warehouseId,
    type,
    name: partial.name || `${OBJECT_LABELS[type]} ${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    departmentId: partial.departmentId,
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    width: partial.width ?? 12,
    depth: partial.depth ?? 8,
    height: partial.height ?? (type === 'RACK' ? 16 : 2),
    rotation: partial.rotation ?? 0,
    assetModel: partial.assetModel ?? (type === 'RACK' ? 'PALLET_RACK' : undefined),
    shelfLevels: partial.shelfLevels ?? (type === 'RACK' ? 4 : undefined),
    bayCount: partial.bayCount ?? (type === 'RACK' ? 3 : undefined),
    loadCount: partial.loadCount ?? (type === 'PALLET' ? 4 : undefined),
    automationState: partial.automationState,
    sensorRange: partial.sensorRange,
    rfidEnabled: partial.rfidEnabled ?? (['RFID_ANTENNA', 'RFID_PORTAL', 'RFID_READER'].includes(type) ? true : undefined),
    rfidPower: partial.rfidPower ?? (['RFID_ANTENNA', 'RFID_PORTAL', 'RFID_READER'].includes(type) ? 24 : undefined),
    rfidMode: partial.rfidMode,
    rfidReaderId: partial.rfidReaderId,
    rfidReadRate: partial.rfidReadRate ?? (['RFID_ANTENNA', 'RFID_PORTAL', 'RFID_READER'].includes(type) ? 0 : undefined),
    color: partial.color,
    status: partial.status ?? (type === 'RACK' ? 'OPERATIONAL' : undefined),
    capacity: partial.capacity ?? (type === 'RACK' ? 48 : 0),
    occupied: partial.occupied ?? 0,
    notes: partial.notes ?? '',
    locked: partial.locked ?? false,
    isNew: partial.isNew ?? true,
  };
}

export function applyGridToObject(object: WarehouseFloorObject, dimensions: WarehouseFloorDimensions, snap: boolean): WarehouseFloorObject {
  if (!snap) return clampObjectToFloor(object, dimensions);
  return clampObjectToFloor(
    {
      ...object,
      x: snapToGrid(object.x, dimensions.gridSize),
      y: snapToGrid(object.y, dimensions.gridSize),
      width: Math.max(dimensions.gridSize, snapToGrid(object.width, dimensions.gridSize)),
      depth: Math.max(dimensions.gridSize, snapToGrid(object.depth, dimensions.gridSize)),
    },
    dimensions,
  );
}

export function clampObjectToFloor(object: WarehouseFloorObject, dimensions: WarehouseFloorDimensions): WarehouseFloorObject {
  return {
    ...object,
    x: Math.max(0, Math.min(object.x, Math.max(0, dimensions.width - object.width))),
    y: Math.max(0, Math.min(object.y, Math.max(0, dimensions.depth - object.depth))),
    width: Math.max(1, Math.min(object.width, dimensions.width)),
    depth: Math.max(1, Math.min(object.depth, dimensions.depth)),
  };
}

export function inferRackHeightFromTemplate(template: RackTemplateDefinition): number {
  return template.height;
}
