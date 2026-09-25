import { describe, expect, it } from 'vitest';
import { createDefaultRfidSystemState } from '../utils/rfidController';
import {
  buildWarehouseRenderScene,
  getWarehouse3DModelKind,
  WAREHOUSE_3D_MODEL_BY_TYPE,
} from '../components/warehouse-designer/renderSceneAdapter';
import {
  buildObjectFromRackTemplate,
  buildWarehouseAreaObject,
  buildWarehouseAssetObject,
  RACK_TEMPLATE_DEFINITIONS,
  WAREHOUSE_AREA_DEFINITIONS,
  WAREHOUSE_ASSET_DEFINITIONS,
} from '../components/warehouse-designer/warehouseTemplates';
import type {
  WarehouseFloorObject,
  WarehouseFloorPlan,
  WarehouseObjectType,
} from '../components/warehouse-designer/warehouseTypes';

const WAREHOUSE_OBJECT_TYPES: WarehouseObjectType[] = [
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
];

function makePlan(objects: WarehouseFloorObject[]): WarehouseFloorPlan {
  return {
    warehouseId: 'warehouse-3d-test',
    dimensions: { width: 160, depth: 100, unit: 'ft', gridSize: 4 },
    objects,
    rfidSystem: createDefaultRfidSystemState(1),
    updatedAt: 1,
    version: 3,
  };
}

describe('warehouse 3D fixture coverage', () => {
  it('assigns an explicit 3D model family to every warehouse object type', () => {
    expect(Object.keys(WAREHOUSE_3D_MODEL_BY_TYPE).sort()).toEqual([...WAREHOUSE_OBJECT_TYPES].sort());
    WAREHOUSE_OBJECT_TYPES.forEach((type) => expect(getWarehouse3DModelKind(type)).toBeTruthy());
  });

  it('builds every rack template into the normalized 3D scene', () => {
    expect(RACK_TEMPLATE_DEFINITIONS).toHaveLength(12);

    RACK_TEMPLATE_DEFINITIONS.forEach((template) => {
      const object = buildObjectFromRackTemplate({
        warehouseId: 'warehouse-3d-test',
        templateId: template.id,
      });
      const scene = buildWarehouseRenderScene(makePlan([object]), []);

      expect(object).toMatchObject({ type: 'RACK', assetModel: template.assetModel });
      expect(scene.objects[0]).toMatchObject({ id: object.id, assetModel: template.assetModel });
      expect(getWarehouse3DModelKind(scene.objects[0].type)).toBe('rack');
    });
  });

  it('builds every smart fixture and floor object into the normalized 3D scene', () => {
    expect(WAREHOUSE_ASSET_DEFINITIONS).toHaveLength(12);
    expect(WAREHOUSE_AREA_DEFINITIONS).toHaveLength(8);

    const objects = [
      ...WAREHOUSE_ASSET_DEFINITIONS.map((asset) => buildWarehouseAssetObject({
        warehouseId: 'warehouse-3d-test',
        assetId: asset.id,
      })),
      ...WAREHOUSE_AREA_DEFINITIONS.map((area) => buildWarehouseAreaObject({
        warehouseId: 'warehouse-3d-test',
        type: area.type,
      })),
    ];
    const scene = buildWarehouseRenderScene(makePlan(objects), []);

    expect(scene.objects).toHaveLength(20);
    WAREHOUSE_ASSET_DEFINITIONS.forEach((definition) => {
      const object = scene.objects.find((item) => item.assetModel === definition.assetModel);
      expect(object).toMatchObject({ type: definition.type, assetModel: definition.assetModel });
      expect(getWarehouse3DModelKind(definition.type)).toBeTruthy();
    });
    WAREHOUSE_AREA_DEFINITIONS.forEach((definition) => {
      const object = scene.objects.find((item) => item.type === definition.type);
      expect(object).toBeTruthy();
      expect(getWarehouse3DModelKind(definition.type)).toBe('area');
    });
  });
});
