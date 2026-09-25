import { describe, expect, it } from 'vitest';
import {
  createFloorObject,
  detectLayoutConflicts,
  findFreePlacement,
  sanitizeFloorPlan,
} from '../components/warehouse-designer/warehouseGeometry';
import { LAYOUT_TEMPLATE_PRESETS } from '../components/warehouse-designer/warehouseTemplates';

const dimensions = { width: 60, depth: 40, unit: 'ft' as const, gridSize: 5 };

describe('warehouse floor plan geometry', () => {
  it('migrates legacy racks with shelf and model defaults', () => {
    const plan = sanitizeFloorPlan({
      version: 1,
      dimensions,
      objects: [{
        id: 'rack-legacy',
        warehouseId: 'wh-1',
        type: 'RACK',
        name: 'Legacy Rack',
        x: 5,
        y: 5,
        width: 12,
        depth: 4,
        height: 18,
      }],
    }, 'wh-1', []);

    expect(plan.version).toBe(3);
    expect(plan.rfidSystem).toMatchObject({ enabled: false, mode: 'AUTO', txPower: 24 });
    expect(plan.objects[0]).toMatchObject({
      assetModel: 'PALLET_RACK',
      shelfLevels: 4,
      bayCount: 3,
    });
  });

  it('places new equipment in the first free grid position', () => {
    const existing = createFloorObject({
      id: 'rack-1',
      warehouseId: 'wh-1',
      type: 'RACK',
      x: 5,
      y: 5,
      width: 10,
      depth: 10,
    });
    const pallet = createFloorObject({
      id: 'pallet-1',
      warehouseId: 'wh-1',
      type: 'PALLET',
      x: 5,
      y: 5,
      width: 5,
      depth: 5,
    });

    const placed = findFreePlacement(pallet, [existing], dimensions);

    expect(placed).toMatchObject({ x: 15, y: 5 });
    expect(detectLayoutConflicts([existing, placed])).toHaveLength(0);
  });

  it('treats floor areas and sensor coverage as non-blocking overlays', () => {
    const rack = createFloorObject({ warehouseId: 'wh-1', type: 'RACK', x: 10, y: 10, width: 12, depth: 4 });
    const aisle = createFloorObject({ warehouseId: 'wh-1', type: 'AISLE', x: 8, y: 8, width: 30, depth: 10 });
    const sensor = createFloorObject({ warehouseId: 'wh-1', type: 'IOT_SENSOR', x: 12, y: 11, width: 2, depth: 2 });
    const antenna = createFloorObject({ warehouseId: 'wh-1', type: 'RFID_ANTENNA', x: 12, y: 11, width: 4, depth: 4 });
    const restricted = createFloorObject({ warehouseId: 'wh-1', type: 'RESTRICTED', x: 8, y: 8, width: 30, depth: 20 });

    expect(detectLayoutConflicts([rack, aisle, sensor, antenna, restricted])).toHaveLength(0);
  });

  it.each(['smart-automation-hub', 'av-event-warehouse'])('ships the %s template without physical collisions', (templateId) => {
    const template = LAYOUT_TEMPLATE_PRESETS.find((item) => item.id === templateId);
    const built = template!.build({ warehouseId: 'wh-1', defaultDepartmentId: 'dept-1', unit: 'ft' });

    expect(detectLayoutConflicts(built.objects)).toHaveLength(0);
  });
});
