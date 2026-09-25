import type {
  FloorUnit,
  Rack,
  RackStatus,
  RfidSystemMode,
  WarehouseAssetModel,
  WarehouseAutomationState,
  WarehouseFloorDimensions,
  WarehouseFloorObject,
  WarehouseFloorPlan,
  WarehouseObjectType,
  WarehouseRfidSystemState,
} from '../../types';

export type {
  FloorUnit,
  RackStatus,
  RfidSystemMode,
  WarehouseAssetModel,
  WarehouseAutomationState,
  WarehouseFloorDimensions,
  WarehouseFloorObject,
  WarehouseFloorPlan,
  WarehouseObjectType,
  WarehouseRfidSystemState,
};

export interface RackTemplateDefinition {
  id: string;
  name: string;
  width: number;
  depth: number;
  height: number;
  defaultCapacity: number;
  shelfLevels: number;
  bayCount: number;
  assetModel: WarehouseAssetModel;
  visualStyle: string;
  recommendedUse: string;
  referenceImage?: string;
}

export interface WarehouseAssetDefinition {
  id: string;
  name: string;
  category: 'Material Handling' | 'Automation' | 'Safety & IoT' | 'RFID & Tracking';
  type: WarehouseObjectType;
  assetModel: WarehouseAssetModel;
  description: string;
  width: number;
  depth: number;
  height: number;
  color: string;
  referenceImage?: string;
  defaults?: Partial<WarehouseFloorObject>;
}

export type WarehouseAreaObjectType =
  | 'ZONE'
  | 'AISLE'
  | 'DOCK_DOOR'
  | 'STAGING'
  | 'RECEIVING'
  | 'SHIPPING'
  | 'OFFICE'
  | 'RESTRICTED';

export interface WarehouseAreaDefinition {
  type: WarehouseAreaObjectType;
  name: string;
  width: number;
  depth: number;
  height: number;
  color: string;
}

export interface FloorSizePreset {
  id: string;
  name: string;
  width: number;
  depth: number;
  unit: FloorUnit;
  gridSize: number;
}

export interface LayoutTemplatePreset {
  id: string;
  name: string;
  description: string;
  category: string;
  build: (context: {
    warehouseId: string;
    defaultDepartmentId?: string;
    unit: FloorUnit;
  }) => {
    dimensions?: Partial<WarehouseFloorDimensions>;
    objects: WarehouseFloorObject[];
  };
}

export interface CollisionIssue {
  sourceId: string;
  targetId: string;
  message: string;
}

export interface DesignerStats {
  rackCount: number;
  zoneCount: number;
  automationCount: number;
  objectCount: number;
  occupancyPercent: number;
  conflictCount: number;
}

export interface WarehouseClientPreview {
  warehouseId: string;
  dimensions: WarehouseFloorDimensions;
  objectCount: number;
  rackCount: number;
  zoneCount: number;
  occupancyPercent: number;
  exportedAt: number;
  rfidSystem: WarehouseRfidSystemState;
  objects: Array<{
    id: string;
    type: WarehouseObjectType;
    name: string;
    x: number;
    y: number;
    width: number;
    depth: number;
    height?: number;
    assetModel?: WarehouseAssetModel;
    shelfLevels?: number;
    bayCount?: number;
    automationState?: WarehouseAutomationState;
    rfidEnabled?: boolean;
    rfidPower?: number;
    rfidMode?: RfidSystemMode;
    rfidReaderId?: string;
    rfidReadRate?: number;
    status?: RackStatus;
    departmentId?: string;
  }>;
}

export type RfidReadDirection = 'INBOUND' | 'OUTBOUND' | 'PRESENCE' | 'CYCLE_COUNT';

export interface RfidReadEvent {
  id: string;
  epc: string;
  itemName: string;
  antennaId: string;
  antennaName: string;
  direction: RfidReadDirection;
  confidence: number;
  timestamp: number;
  source: 'VIRTUAL_DIAGNOSTIC' | 'HARDWARE_GATEWAY';
}

export interface RfidSystemMetrics {
  configuredEndpoints: number;
  onlineEndpoints: number;
  trackedTags: number;
  readsPerMinute: number;
  eventCount: number;
}

export type DesignerSelection = {
  objectId: string | null;
  inspectorOpen: boolean;
};

export interface FloorPlanMigrationResult {
  plan: WarehouseFloorPlan;
  derivedRacks: Rack[];
}
