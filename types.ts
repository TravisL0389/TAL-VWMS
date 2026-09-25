// =============================================================================
// VWMS Type Definitions
// Designed to be flexible enough for any warehouse type — entertainment,
// retail, manufacturing, e-commerce, tools, equipment rental, etc.
// =============================================================================

export type IconKey =
  | 'sparkles' | 'lightbulb' | 'cpu' | 'link' | 'settings' | 'cable'
  | 'box' | 'wrench' | 'hammer' | 'truck' | 'shirt' | 'shoppingBag'
  | 'pill' | 'utensils' | 'beaker' | 'leaf' | 'gift' | 'monitor'
  | 'package' | 'archive' | 'briefcase' | 'wine' | 'baby' | 'book';

export interface DepartmentDef {
  id: string;            // unique slug, e.g. "moving-lights" or "category-a"
  label: string;         // user-facing name
  prefix: string;        // 3-letter prefix used in case ids
  color: string;         // hex color, e.g. "#3b82f6"
  icon: IconKey;
}

export interface Warehouse {
  id: string;            // user-defined or auto-generated
  name: string;
  location?: string;
  createdAt: number;
}

export type RackStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'OFFLINE';

export type FloorUnit = 'ft' | 'm';

export interface WarehouseFloorDimensions {
  width: number;
  depth: number;
  unit: FloorUnit;
  gridSize: number;
}

export type WarehouseObjectType =
  | 'RACK'
  | 'PALLET'
  | 'CONVEYOR'
  | 'PACK_STATION'
  | 'FORKLIFT'
  | 'AMR'
  | 'CHARGING_STATION'
  | 'SAFETY_BARRIER'
  | 'IOT_SENSOR'
  | 'CAMERA'
  | 'RFID_ANTENNA'
  | 'RFID_PORTAL'
  | 'RFID_READER'
  | 'ZONE'
  | 'AISLE'
  | 'DOCK_DOOR'
  | 'STAGING'
  | 'RECEIVING'
  | 'SHIPPING'
  | 'OFFICE'
  | 'RESTRICTED';

export type WarehouseAssetModel =
  | 'PALLET_RACK'
  | 'BULK_RACK'
  | 'SMALL_PARTS_SHELF'
  | 'CARTON_FLOW_RACK'
  | 'AUDIO_CASE_RACK'
  | 'LIGHTING_RACK'
  | 'VIDEO_EQUIPMENT_RACK'
  | 'COLD_STORAGE_RACK'
  | 'EQUIPMENT_BAY'
  | 'VERTICAL_RACK'
  | 'SECURE_CAGE'
  | 'WOOD_PALLET'
  | 'ROLLER_CONVEYOR'
  | 'SMART_PACK_BENCH'
  | 'ELECTRIC_FORKLIFT'
  | 'AUTONOMOUS_MOBILE_ROBOT'
  | 'ROBOT_CHARGER'
  | 'SAFETY_RAIL'
  | 'ENVIRONMENT_SENSOR'
  | 'AI_SECURITY_CAMERA'
  | 'RFID_CEILING_ANTENNA'
  | 'RFID_DOCK_PORTAL'
  | 'RFID_READER_HUB';

export type WarehouseAutomationState = 'ACTIVE' | 'IDLE' | 'CHARGING' | 'FAULT';

export type RfidSystemMode = 'AUTO' | 'INTAKE' | 'OUTTAKE' | 'CYCLE_COUNT' | 'MAINTENANCE';

export interface WarehouseRfidSystemState {
  enabled: boolean;
  mode: RfidSystemMode;
  txPower: number;
  readIntervalMs: number;
  duplicateWindowMs: number;
  lastUpdated: number;
}

export interface WarehouseFloorObject {
  id: string;
  warehouseId: string;
  type: WarehouseObjectType;
  name: string;
  departmentId?: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height?: number;
  rotation?: number;
  assetModel?: WarehouseAssetModel;
  shelfLevels?: number;
  bayCount?: number;
  loadCount?: number;
  automationState?: WarehouseAutomationState;
  sensorRange?: number;
  rfidEnabled?: boolean;
  rfidPower?: number;
  rfidMode?: RfidSystemMode;
  rfidReaderId?: string;
  rfidReadRate?: number;
  color?: string;
  status?: RackStatus;
  capacity?: number;
  occupied?: number;
  notes?: string;
  locked?: boolean;
  isNew?: boolean;
}

export interface WarehouseFloorPlan {
  warehouseId: string;
  dimensions: WarehouseFloorDimensions;
  objects: WarehouseFloorObject[];
  rfidSystem: WarehouseRfidSystemState;
  updatedAt: number;
  version: number;
}

export interface Rack {
  id: string;            // unique within warehouse
  name?: string;         // optional friendly name
  warehouseId: string;
  departmentId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: RackStatus;
  capacity: number;      // total slots
  occupied: number;      // current occupancy
  notes?: string;
  isNew?: boolean;       // unsaved
}

export type ItemStatus = 'AVAILABLE' | 'IN_USE' | 'REPAIR' | 'RETIRED';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  rfid?: string;
  departmentId: string;
  warehouseId: string;
  rackId?: string;       // location
  shelf?: number;
  position?: 'FRONT' | 'BACK';
  quantity: number;
  available: number;     // not currently checked out
  status: ItemStatus;
  notes?: string;
  lastUpdated: number;
}

export type OrderStatus = 'DRAFT' | 'PENDING' | 'PULLING' | 'PACKED' | 'SHIPPED' | 'CANCELLED';

export interface OrderLine {
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  pulled: number;
}

export interface Order {
  id: string;
  reference: string;     // user-friendly ref, e.g. "ORD-101"
  client?: string;
  project?: string;
  warehouseId: string;
  status: OrderStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  dueDate?: number;
  lines: OrderLine[];
  createdAt: number;
}

export interface PullStep {
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  rackId: string;
  rackName: string;
  shelf?: number;
  position?: 'FRONT' | 'BACK';
  estimatedSeconds: number;
  reasoning?: string;    // why this step is here in the route
  warning?: string;      // out of stock, low, in repair, etc.
}

export interface PullPlan {
  orderId: string;
  steps: PullStep[];
  totalEstimatedSeconds: number;
  totalDistance?: number;
  warnings: string[];
  notes?: string;
  generatedBy: 'AI' | 'HEURISTIC';
  generatedAt: number;
}

export interface AppSettings {
  warehouseId: string;            // currently active warehouse
  sidebarPosition: 'LEFT' | 'RIGHT';
  density: 'COMFORTABLE' | 'COMPACT';
  enableAI: boolean;
  enableNotifications: boolean;
  enableAutosave: boolean;
  brandName: string;              // top-bar branding (e.g. "ACME Logistics")
  departmentLabel: string;        // singular, customizable: "Department" | "Category" | "Zone" | "Section"
  itemLabel: string;              // singular: "Item" | "Asset" | "Case" | "Product"
  rackLabel: string;              // singular: "Rack" | "Shelf" | "Bay" | "Location"
}

export interface Notification {
  id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'AI';
  title: string;
  message: string;
  time: number;
  unread: boolean;
}
