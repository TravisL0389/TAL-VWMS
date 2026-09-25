import type { DepartmentDef } from '../../types';
import { getObjectColor } from './warehouseGeometry';
import type { WarehouseFloorObject, WarehouseFloorPlan, WarehouseObjectType } from './warehouseTypes';

export type WarehouseRendererMode = 'r3f' | 'babylon';

export type Warehouse3DModelKind =
  | 'rack'
  | 'pallet'
  | 'conveyor'
  | 'pack-station'
  | 'forklift'
  | 'amr'
  | 'charging-station'
  | 'safety-barrier'
  | 'iot-sensor'
  | 'camera'
  | 'rfid-antenna'
  | 'rfid-portal'
  | 'rfid-reader'
  | 'area';

export const WAREHOUSE_3D_MODEL_BY_TYPE: Record<WarehouseObjectType, Warehouse3DModelKind> = {
  RACK: 'rack',
  PALLET: 'pallet',
  CONVEYOR: 'conveyor',
  PACK_STATION: 'pack-station',
  FORKLIFT: 'forklift',
  AMR: 'amr',
  CHARGING_STATION: 'charging-station',
  SAFETY_BARRIER: 'safety-barrier',
  IOT_SENSOR: 'iot-sensor',
  CAMERA: 'camera',
  RFID_ANTENNA: 'rfid-antenna',
  RFID_PORTAL: 'rfid-portal',
  RFID_READER: 'rfid-reader',
  ZONE: 'area',
  AISLE: 'area',
  DOCK_DOOR: 'area',
  STAGING: 'area',
  RECEIVING: 'area',
  SHIPPING: 'area',
  OFFICE: 'area',
  RESTRICTED: 'area',
};

export function getWarehouse3DModelKind(type: WarehouseObjectType): Warehouse3DModelKind {
  return WAREHOUSE_3D_MODEL_BY_TYPE[type];
}

export interface RenderableWarehouseObject extends WarehouseFloorObject {
  color: string;
  pbr: {
    metallic: number;
    roughness: number;
    alpha: number;
  };
}

export interface WarehouseRenderScene {
  warehouseId: string;
  dimensions: WarehouseFloorPlan['dimensions'];
  rfidSystem: WarehouseFloorPlan['rfidSystem'];
  objects: RenderableWarehouseObject[];
  environment: {
    iblUrl: string;
    exposure: number;
    contrast: number;
  };
  babylonNative: {
    compatible: true;
    note: string;
  };
}

const DEFAULT_IBL_URL = 'https://assets.babylonjs.com/environments/environmentSpecular.env';

export function buildWarehouseRenderScene(plan: WarehouseFloorPlan, departments: DepartmentDef[]): WarehouseRenderScene {
  return {
    warehouseId: plan.warehouseId,
    dimensions: plan.dimensions,
    rfidSystem: plan.rfidSystem,
    objects: plan.objects.map((object) => {
      const rfidEndpoint = ['RFID_ANTENNA', 'RFID_PORTAL', 'RFID_READER'].includes(object.type);
      return {
        ...object,
        rfidEnabled: rfidEndpoint ? plan.rfidSystem.enabled && object.rfidEnabled !== false : object.rfidEnabled,
        color: getObjectColor(object, departments),
        pbr: getPbrProfile(object),
      };
    }),
    environment: {
      iblUrl: DEFAULT_IBL_URL,
      exposure: 1.05,
      contrast: 1.18,
    },
    babylonNative: {
      compatible: true,
      note: 'This normalized scene contract is renderer-agnostic and can be consumed by a Babylon Native host using the same PBR material, IBL, and camera data.',
    },
  };
}

function getPbrProfile(object: WarehouseFloorObject): RenderableWarehouseObject['pbr'] {
  if (object.type === 'RACK') {
    return { metallic: 0.32, roughness: 0.52, alpha: 1 };
  }
  if (object.type === 'CONVEYOR' || object.type === 'FORKLIFT' || object.type === 'SAFETY_BARRIER') {
    return { metallic: 0.42, roughness: 0.44, alpha: 1 };
  }
  if (
    object.type === 'AMR' ||
    object.type === 'CHARGING_STATION' ||
    object.type === 'IOT_SENSOR' ||
    object.type === 'CAMERA' ||
    object.type === 'RFID_ANTENNA' ||
    object.type === 'RFID_PORTAL' ||
    object.type === 'RFID_READER'
  ) {
    return { metallic: 0.38, roughness: 0.34, alpha: 1 };
  }
  if (object.type === 'PALLET') {
    return { metallic: 0.02, roughness: 0.88, alpha: 1 };
  }
  if (object.type === 'PACK_STATION') {
    return { metallic: 0.22, roughness: 0.54, alpha: 1 };
  }
  if (object.type === 'DOCK_DOOR') {
    return { metallic: 0.12, roughness: 0.46, alpha: 0.9 };
  }
  if (object.type === 'AISLE') {
    return { metallic: 0.02, roughness: 0.88, alpha: 0.48 };
  }
  if (object.type === 'ZONE') {
    return { metallic: 0.02, roughness: 0.9, alpha: 0.34 };
  }
  return { metallic: 0.08, roughness: 0.72, alpha: 0.82 };
}
