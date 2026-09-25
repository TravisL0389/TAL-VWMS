import { shortId } from '../../utils/storage';
import type {
  FloorSizePreset,
  LayoutTemplatePreset,
  RackTemplateDefinition,
  WarehouseAreaDefinition,
  WarehouseAreaObjectType,
  WarehouseAssetDefinition,
  WarehouseFloorObject,
} from './warehouseTypes';
import { createFloorObject } from './warehouseGeometry';

export const RACK_TEMPLATE_DEFINITIONS: RackTemplateDefinition[] = [
  {
    id: 'standard-pallet',
    name: 'Standard Pallet Rack',
    width: 12,
    depth: 4,
    height: 20,
    defaultCapacity: 48,
    shelfLevels: 4,
    bayCount: 3,
    assetModel: 'PALLET_RACK',
    visualStyle: 'Long-run pallet storage with standard aisle clearance.',
    recommendedUse: 'General warehouse pallet positions',
    referenceImage: '/warehouse-references/selective-pallet-racking.jpg',
  },
  {
    id: 'safety-deck-pallet',
    name: 'Safety Deck Pallet Rack',
    width: 12,
    depth: 5,
    height: 18,
    defaultCapacity: 36,
    shelfLevels: 3,
    bayCount: 2,
    assetModel: 'PALLET_RACK',
    visualStyle: 'Orange step beams, protected uprights, mesh decking, and boxed pallet positions.',
    recommendedUse: 'Mixed pallet and carton storage with fall protection',
    referenceImage: '/warehouse-references/pallet-safety-rack.webp',
  },
  {
    id: 'wide-bulk',
    name: 'Wide Bulk Rack',
    width: 18,
    depth: 6,
    height: 18,
    defaultCapacity: 72,
    shelfLevels: 3,
    bayCount: 3,
    assetModel: 'BULK_RACK',
    visualStyle: 'Wider footprint with bulk handling.',
    recommendedUse: 'High-volume, oversized cartons or pallet stacks',
  },
  {
    id: 'small-parts',
    name: 'Small Parts Shelf',
    width: 8,
    depth: 3,
    height: 12,
    defaultCapacity: 30,
    shelfLevels: 5,
    bayCount: 4,
    assetModel: 'SMALL_PARTS_SHELF',
    visualStyle: 'Compact shelving with dense pick access.',
    recommendedUse: 'Bins, parts, accessories, repair stock',
    referenceImage: '/warehouse-references/carton-flow-shelving.jpg',
  },
  {
    id: 'carton-flow',
    name: 'Carton Flow Pick Rack',
    width: 10,
    depth: 4,
    height: 14,
    defaultCapacity: 80,
    shelfLevels: 8,
    bayCount: 5,
    assetModel: 'CARTON_FLOW_RACK',
    visualStyle: 'Dense sloped pick faces with narrow bins and replenishment access.',
    recommendedUse: 'Apparel, small goods, parts, and high-velocity each picking',
    referenceImage: '/warehouse-references/carton-flow-shelving.jpg',
  },
  {
    id: 'cold-storage',
    name: 'Cold Storage Rack',
    width: 10,
    depth: 5,
    height: 18,
    defaultCapacity: 36,
    shelfLevels: 4,
    bayCount: 2,
    assetModel: 'COLD_STORAGE_RACK',
    visualStyle: 'Insulated row footprint with safety spacing.',
    recommendedUse: 'Temperature-controlled storage',
  },
  {
    id: 'equipment-bay',
    name: 'Equipment Bay',
    width: 14,
    depth: 8,
    height: 16,
    defaultCapacity: 24,
    shelfLevels: 2,
    bayCount: 2,
    assetModel: 'EQUIPMENT_BAY',
    visualStyle: 'Open-front service bay with wide access.',
    recommendedUse: 'Rental gear, carts, cases, tools',
    referenceImage: '/warehouse-references/av-flight-case-racking.jpg',
  },
  {
    id: 'audio-road-cases',
    name: 'Audio Road Case Rack',
    width: 18,
    depth: 7,
    height: 20,
    defaultCapacity: 30,
    shelfLevels: 3,
    bayCount: 3,
    assetModel: 'AUDIO_CASE_RACK',
    visualStyle: 'Heavy red-beam storage sized for touring audio flight cases and amplifiers.',
    recommendedUse: 'Line arrays, amplifiers, consoles, cable trunks, and audio road cases',
    referenceImage: '/warehouse-references/av-flight-case-racking.jpg',
  },
  {
    id: 'lighting-fixtures',
    name: 'Lighting Fixture Rack',
    width: 18,
    depth: 7,
    height: 20,
    defaultCapacity: 36,
    shelfLevels: 4,
    bayCount: 3,
    assetModel: 'LIGHTING_RACK',
    visualStyle: 'Protected case shelving for moving lights, LED fixtures, and rigging accessories.',
    recommendedUse: 'Moving lights, fixtures, dimming, power, and lighting control cases',
    referenceImage: '/warehouse-references/av-flight-case-racking.jpg',
  },
  {
    id: 'pro-video-cases',
    name: 'Pro Video Equipment Rack',
    width: 16,
    depth: 7,
    height: 18,
    defaultCapacity: 28,
    shelfLevels: 4,
    bayCount: 2,
    assetModel: 'VIDEO_EQUIPMENT_RACK',
    visualStyle: 'Secure case storage for cameras, switching, projection, and display systems.',
    recommendedUse: 'Camera chains, lenses, switchers, projectors, displays, and video cases',
    referenceImage: '/warehouse-references/av-flight-case-racking.jpg',
  },
  {
    id: 'vertical-storage',
    name: 'Vertical Storage',
    width: 6,
    depth: 4,
    height: 24,
    defaultCapacity: 40,
    shelfLevels: 6,
    bayCount: 2,
    assetModel: 'VERTICAL_RACK',
    visualStyle: 'Tall narrow density-focused storage.',
    recommendedUse: 'Long materials, vertical bins, pipe or tube storage',
  },
  {
    id: 'secure-cage',
    name: 'Cage / Secure Storage',
    width: 10,
    depth: 8,
    height: 14,
    defaultCapacity: 28,
    shelfLevels: 4,
    bayCount: 2,
    assetModel: 'SECURE_CAGE',
    visualStyle: 'Enclosed secure footprint with restricted access.',
    recommendedUse: 'High-value, restricted, serialized stock',
  },
];

export const FLOOR_SIZE_PRESETS: FloorSizePreset[] = [
  { id: 'compact', name: 'Compact', width: 80, depth: 50, unit: 'ft', gridSize: 2 },
  { id: 'standard', name: 'Standard', width: 120, depth: 80, unit: 'ft', gridSize: 5 },
  { id: 'distribution', name: 'Distribution', width: 200, depth: 140, unit: 'ft', gridSize: 5 },
  { id: 'metric-hub', name: 'Metric Hub', width: 60, depth: 40, unit: 'm', gridSize: 2 },
];

export const WAREHOUSE_AREA_DEFINITIONS: WarehouseAreaDefinition[] = [
  { type: 'ZONE', name: 'Storage Zone', width: 24, depth: 16, height: 1, color: '#6b8c90' },
  { type: 'STAGING', name: 'Staging Area', width: 18, depth: 12, height: 1, color: '#4f7d78' },
  { type: 'RECEIVING', name: 'Receiving Area', width: 18, depth: 12, height: 1, color: '#4d8ba8' },
  { type: 'SHIPPING', name: 'Shipping Area', width: 18, depth: 12, height: 1, color: '#6f88a8' },
  { type: 'OFFICE', name: 'Office Area', width: 14, depth: 10, height: 1, color: '#7f8b77' },
  { type: 'RESTRICTED', name: 'Restricted Area', width: 16, depth: 12, height: 1, color: '#9d4f4f' },
  { type: 'AISLE', name: 'Aisle', width: 16, depth: 6, height: 1, color: '#4a5962' },
  { type: 'DOCK_DOOR', name: 'Dock Door', width: 12, depth: 2, height: 10, color: '#d0a95c' },
];

export const WAREHOUSE_ASSET_DEFINITIONS: WarehouseAssetDefinition[] = [
  {
    id: 'loaded-pallet',
    name: 'Loaded Pallet',
    category: 'Material Handling',
    type: 'PALLET',
    assetModel: 'WOOD_PALLET',
    description: 'Standard pallet footprint with a configurable load stack.',
    width: 4,
    depth: 4,
    height: 5,
    color: '#a97945',
    defaults: { loadCount: 6, capacity: 1, occupied: 1 },
  },
  {
    id: 'roller-conveyor',
    name: 'Smart Conveyor',
    category: 'Material Handling',
    type: 'CONVEYOR',
    assetModel: 'ROLLER_CONVEYOR',
    description: 'Powered roller section for inbound, sortation, and pack flow.',
    width: 16,
    depth: 4,
    height: 3,
    color: '#5d7f81',
    defaults: { automationState: 'ACTIVE', capacity: 12 },
  },
  {
    id: 'smart-pack-bench',
    name: 'Smart Pack Station',
    category: 'Material Handling',
    type: 'PACK_STATION',
    assetModel: 'SMART_PACK_BENCH',
    description: 'Ergonomic pack bench with scan, scale, and operator display.',
    width: 8,
    depth: 5,
    height: 7,
    color: '#668c77',
    defaults: { automationState: 'ACTIVE', capacity: 4 },
  },
  {
    id: 'electric-forklift',
    name: 'Electric Forklift',
    category: 'Material Handling',
    type: 'FORKLIFT',
    assetModel: 'ELECTRIC_FORKLIFT',
    description: 'Electric lift truck used for aisle and dock planning.',
    width: 4,
    depth: 9,
    height: 8,
    color: '#d0a95c',
    defaults: { automationState: 'IDLE' },
  },
  {
    id: 'amr',
    name: 'AMR Robot',
    category: 'Automation',
    type: 'AMR',
    assetModel: 'AUTONOMOUS_MOBILE_ROBOT',
    description: 'Autonomous mobile robot for tote and pallet movement.',
    width: 4,
    depth: 4,
    height: 2,
    color: '#45a3b8',
    referenceImage: '/warehouse-references/amr-fleet.png',
    defaults: { automationState: 'ACTIVE', capacity: 1 },
  },
  {
    id: 'robot-charger',
    name: 'Robot Charging Bay',
    category: 'Automation',
    type: 'CHARGING_STATION',
    assetModel: 'ROBOT_CHARGER',
    description: 'Charging and standby point for autonomous equipment.',
    width: 6,
    depth: 5,
    height: 4,
    color: '#6f88a8',
    defaults: { automationState: 'ACTIVE', capacity: 2 },
  },
  {
    id: 'safety-rail',
    name: 'Safety Barrier',
    category: 'Safety & IoT',
    type: 'SAFETY_BARRIER',
    assetModel: 'SAFETY_RAIL',
    description: 'High-visibility barrier for pedestrian and equipment separation.',
    width: 12,
    depth: 1,
    height: 4,
    color: '#d8a627',
  },
  {
    id: 'environment-sensor',
    name: 'IoT Environment Sensor',
    category: 'Safety & IoT',
    type: 'IOT_SENSOR',
    assetModel: 'ENVIRONMENT_SENSOR',
    description: 'Temperature, humidity, air-quality, and occupancy telemetry node.',
    width: 2,
    depth: 2,
    height: 10,
    color: '#4d8ba8',
    defaults: { automationState: 'ACTIVE', sensorRange: 24 },
  },
  {
    id: 'ai-camera',
    name: 'AI Safety Camera',
    category: 'Safety & IoT',
    type: 'CAMERA',
    assetModel: 'AI_SECURITY_CAMERA',
    description: 'Overhead safety, traffic, and inventory-visibility camera.',
    width: 2,
    depth: 2,
    height: 14,
    color: '#7d7569',
    defaults: { automationState: 'ACTIVE', sensorRange: 36 },
  },
  {
    id: 'rfid-ceiling-antenna',
    name: 'RFID Coverage Antenna',
    category: 'RFID & Tracking',
    type: 'RFID_ANTENNA',
    assetModel: 'RFID_CEILING_ANTENNA',
    description: 'Adjustable UHF antenna for aisles, pick faces, and storage-zone presence reads.',
    width: 4,
    depth: 4,
    height: 14,
    color: '#3d8b79',
    referenceImage: '/warehouse-references/rfid-tag-reference.jpg',
    defaults: {
      automationState: 'ACTIVE',
      sensorRange: 28,
      rfidEnabled: true,
      rfidPower: 24,
      rfidMode: 'AUTO',
    },
  },
  {
    id: 'rfid-dock-portal',
    name: 'RFID Intake / Outtake Portal',
    category: 'RFID & Tracking',
    type: 'RFID_PORTAL',
    assetModel: 'RFID_DOCK_PORTAL',
    description: 'Two-sided dock portal for directional intake, outtake, and chain-of-custody reads.',
    width: 10,
    depth: 3,
    height: 12,
    color: '#2f6f75',
    referenceImage: '/warehouse-references/rfid-tag-reference.jpg',
    defaults: {
      automationState: 'ACTIVE',
      sensorRange: 16,
      rfidEnabled: true,
      rfidPower: 27,
      rfidMode: 'AUTO',
    },
  },
  {
    id: 'rfid-reader-hub',
    name: 'RFID Edge Reader Hub',
    category: 'RFID & Tracking',
    type: 'RFID_READER',
    assetModel: 'RFID_READER_HUB',
    description: 'On-floor reader and edge-controller cabinet for antenna orchestration and health monitoring.',
    width: 3,
    depth: 3,
    height: 6,
    color: '#4d7275',
    referenceImage: '/warehouse-references/rfid-tag-reference.jpg',
    defaults: {
      automationState: 'ACTIVE',
      rfidEnabled: true,
      rfidPower: 24,
      rfidMode: 'AUTO',
    },
  },
];

function makeRack(
  warehouseId: string,
  departmentId: string | undefined,
  templateId: string,
  x: number,
  y: number,
  overrides: Partial<WarehouseFloorObject> = {},
): WarehouseFloorObject {
  const template = RACK_TEMPLATE_DEFINITIONS.find((item) => item.id === templateId) || RACK_TEMPLATE_DEFINITIONS[0];
  return createFloorObject({
    warehouseId,
    type: 'RACK',
    name: overrides.name || template.name,
    departmentId,
    x,
    y,
    width: template.width,
    depth: template.depth,
    height: template.height,
    capacity: template.defaultCapacity,
    shelfLevels: template.shelfLevels,
    bayCount: template.bayCount,
    assetModel: template.assetModel,
    ...overrides,
  });
}

function makeArea(
  warehouseId: string,
  type: WarehouseFloorObject['type'],
  name: string,
  x: number,
  y: number,
  width: number,
  depth: number,
  overrides: Partial<WarehouseFloorObject> = {},
): WarehouseFloorObject {
  return createFloorObject({
    warehouseId,
    type,
    name,
    x,
    y,
    width,
    depth,
    height: overrides.height ?? (type === 'DOCK_DOOR' ? 10 : 2),
    ...overrides,
  });
}

function rowOfRacks(params: {
  warehouseId: string;
  departmentId?: string;
  templateId: string;
  startX: number;
  startY: number;
  count: number;
  gap?: number;
  occupiedRatio?: number;
}): WarehouseFloorObject[] {
  const template = RACK_TEMPLATE_DEFINITIONS.find((item) => item.id === params.templateId) || RACK_TEMPLATE_DEFINITIONS[0];
  const gap = params.gap ?? 4;
  return Array.from({ length: params.count }).map((_, index) =>
    makeRack(
      params.warehouseId,
      params.departmentId,
      params.templateId,
      params.startX + index * (template.width + gap),
      params.startY,
      {
        name: `${template.name} ${index + 1}`,
        occupied: params.occupiedRatio === undefined
          ? undefined
          : Math.round(template.defaultCapacity * params.occupiedRatio),
      },
    ));
}

export const LAYOUT_TEMPLATE_PRESETS: LayoutTemplatePreset[] = [
  {
    id: 'smart-automation-hub',
    name: 'Smart Automation Hub',
    description: 'Robotic pick flow with conveyors, charging, pack stations, telemetry, and controlled pedestrian lanes.',
    category: 'Smart Warehouse',
    build: ({ warehouseId, defaultDepartmentId }) => ({
      dimensions: { width: 160, depth: 100, gridSize: 4 },
      objects: [
        makeArea(warehouseId, 'RECEIVING', 'Automated Receiving', 6, 6, 24, 14),
        makeArea(warehouseId, 'SHIPPING', 'Carrier Dispatch', 128, 6, 24, 14),
        makeArea(warehouseId, 'AISLE', 'AMR Travel Spine', 46, 24, 14, 62, { color: '#7d918f' }),
        makeArea(warehouseId, 'STAGING', 'Dynamic Staging', 66, 6, 28, 14),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'standard-pallet', startX: 8, startY: 28, count: 2, gap: 6 }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'standard-pallet', startX: 8, startY: 46, count: 2, gap: 6 }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'small-parts', startX: 70, startY: 30, count: 5, gap: 5 }),
        buildWarehouseAssetObject({ warehouseId, assetId: 'roller-conveyor', x: 66, y: 22, overrides: { width: 70, name: 'Sortation Conveyor' } }),
        buildWarehouseAssetObject({ warehouseId, assetId: 'smart-pack-bench', x: 104, y: 44, overrides: { name: 'Pack Cell A' } }),
        buildWarehouseAssetObject({ warehouseId, assetId: 'smart-pack-bench', x: 118, y: 44, overrides: { name: 'Pack Cell B' } }),
        buildWarehouseAssetObject({ warehouseId, assetId: 'robot-charger', x: 64, y: 78, overrides: { name: 'AMR Charging Bank' } }),
        buildWarehouseAssetObject({ warehouseId, assetId: 'amr', x: 50, y: 42, overrides: { name: 'AMR 01' } }),
        buildWarehouseAssetObject({ warehouseId, assetId: 'amr', x: 50, y: 60, overrides: { name: 'AMR 02' } }),
        buildWarehouseAssetObject({ warehouseId, assetId: 'environment-sensor', x: 140, y: 82 }),
        buildWarehouseAssetObject({ warehouseId, assetId: 'ai-camera', x: 34, y: 88 }),
        buildWarehouseAssetObject({ warehouseId, assetId: 'rfid-dock-portal', x: 34, y: 8, overrides: { name: 'Inbound RFID Portal', rfidMode: 'INTAKE', rfidReaderId: 'RFID-IN-01' } }),
        buildWarehouseAssetObject({ warehouseId, assetId: 'rfid-dock-portal', x: 116, y: 8, overrides: { name: 'Outbound RFID Portal', rfidMode: 'OUTTAKE', rfidReaderId: 'RFID-OUT-01' } }),
        buildWarehouseAssetObject({ warehouseId, assetId: 'rfid-ceiling-antenna', x: 56, y: 36, overrides: { name: 'Central Aisle Antenna', rfidReaderId: 'RFID-AISLE-01' } }),
        buildWarehouseAssetObject({ warehouseId, assetId: 'rfid-reader-hub', x: 98, y: 82, overrides: { name: 'RFID Edge Hub', rfidReaderId: 'EDGE-HUB-01' } }),
      ],
    }),
  },
  {
    id: 'small-retail-stockroom',
    name: 'Small Retail Stockroom',
    description: 'Compact back-of-house shelving with a receiving edge and office nook.',
    category: 'Retail',
    build: ({ warehouseId, defaultDepartmentId }) => ({
      dimensions: { width: 80, depth: 50 },
      objects: [
        makeArea(warehouseId, 'RECEIVING', 'Receiving', 4, 4, 18, 10),
        makeArea(warehouseId, 'OFFICE', 'Control Desk', 60, 4, 14, 10),
        makeArea(warehouseId, 'ZONE', 'Primary Pick Zone', 22, 12, 52, 30, { departmentId: defaultDepartmentId }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'small-parts', startX: 24, startY: 18, count: 4 }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'small-parts', startX: 24, startY: 28, count: 4 }),
      ],
    }),
  },
  {
    id: 'food-truck-storage',
    name: 'Food Truck / Small Business Storage',
    description: 'Prep-friendly storage with receiving, cold storage, and a protected staging lane.',
    category: 'Food & Beverage',
    build: ({ warehouseId, defaultDepartmentId }) => ({
      dimensions: { width: 70, depth: 45 },
      objects: [
        makeArea(warehouseId, 'RECEIVING', 'Receiving', 4, 4, 16, 12),
        makeArea(warehouseId, 'STAGING', 'Prep Staging', 22, 4, 18, 12),
        makeArea(warehouseId, 'SHIPPING', 'Dispatch Ready', 42, 4, 16, 12),
        makeArea(warehouseId, 'ZONE', 'Cold Zone', 4, 20, 18, 18, { departmentId: defaultDepartmentId }),
        makeArea(warehouseId, 'ZONE', 'Dry Goods', 24, 18, 36, 20, { departmentId: defaultDepartmentId }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'cold-storage', startX: 6, startY: 22, count: 2, gap: 4 }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'small-parts', startX: 26, startY: 22, count: 3, gap: 5 }),
      ],
    }),
  },
  {
    id: 'av-event-warehouse',
    name: 'AV / Event Lighting Warehouse',
    description: 'Wide equipment lanes, protected staging, and secure gear cage.',
    category: 'Entertainment / AV',
    build: ({ warehouseId, defaultDepartmentId }) => ({
      dimensions: { width: 120, depth: 80 },
      objects: [
        makeArea(warehouseId, 'RECEIVING', 'Inbound Check-In', 6, 6, 20, 12),
        makeArea(warehouseId, 'SHIPPING', 'Outbound Staging', 92, 6, 20, 12),
        makeArea(warehouseId, 'STAGING', 'Show Build Staging', 34, 8, 24, 12),
        makeArea(warehouseId, 'RESTRICTED', 'Control / Secure Gear', 92, 54, 18, 18),
        makeArea(warehouseId, 'AISLE', 'Main Aisle', 28, 20, 12, 48, { color: '#4a5962' }),
        makeArea(warehouseId, 'AISLE', 'Secondary Aisle', 70, 20, 10, 48, { color: '#4a5962' }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'audio-road-cases', startX: 8, startY: 22, count: 3, gap: 5, occupiedRatio: 0.7 }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'lighting-fixtures', startX: 8, startY: 34, count: 3, gap: 5, occupiedRatio: 0.58 }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'pro-video-cases', startX: 8, startY: 48, count: 3, gap: 5, occupiedRatio: 0.64 }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'secure-cage', startX: 92, startY: 56, count: 1 }),
        buildWarehouseAssetObject({ warehouseId, assetId: 'rfid-dock-portal', x: 6, y: 18, overrides: { name: 'AV Check-In Portal', rfidMode: 'INTAKE', rfidReaderId: 'AV-IN-01' } }),
        buildWarehouseAssetObject({ warehouseId, assetId: 'rfid-ceiling-antenna', x: 74, y: 40, overrides: { name: 'Case Tracking Antenna', rfidReaderId: 'AV-AISLE-01' } }),
        buildWarehouseAssetObject({ warehouseId, assetId: 'rfid-reader-hub', x: 104, y: 58, overrides: { name: 'AV RFID Edge Hub', rfidReaderId: 'AV-EDGE-01' } }),
      ],
    }),
  },
  {
    id: 'ecommerce-pick-pack',
    name: 'E-Commerce Pick Pack Warehouse',
    description: 'High pick-density front with receiving-to-packing straight flow.',
    category: 'E-Commerce',
    build: ({ warehouseId, defaultDepartmentId }) => ({
      dimensions: { width: 130, depth: 75 },
      objects: [
        makeArea(warehouseId, 'RECEIVING', 'Receiving', 4, 6, 20, 12),
        makeArea(warehouseId, 'STAGING', 'Pick Pack', 52, 6, 22, 12),
        makeArea(warehouseId, 'SHIPPING', 'Carrier Outbound', 104, 6, 20, 12),
        makeArea(warehouseId, 'AISLE', 'Main Pick Spine', 46, 18, 10, 46, { color: '#4a5962' }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'small-parts', startX: 8, startY: 22, count: 4, gap: 4 }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'small-parts', startX: 8, startY: 32, count: 4, gap: 4 }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'standard-pallet', startX: 62, startY: 22, count: 4, gap: 4 }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'standard-pallet', startX: 62, startY: 34, count: 4, gap: 4 }),
      ],
    }),
  },
  {
    id: 'manufacturing-parts-cage',
    name: 'Manufacturing Parts Cage',
    description: 'Dense caged storage with defined aisles and restricted area control.',
    category: 'Manufacturing',
    build: ({ warehouseId, defaultDepartmentId }) => ({
      dimensions: { width: 100, depth: 70 },
      objects: [
        makeArea(warehouseId, 'RESTRICTED', 'Caged Storage', 6, 10, 84, 50),
        makeArea(warehouseId, 'AISLE', 'North Aisle', 8, 18, 80, 8, { color: '#4a5962' }),
        makeArea(warehouseId, 'AISLE', 'South Aisle', 8, 38, 80, 8, { color: '#4a5962' }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'secure-cage', startX: 12, startY: 28, count: 4, gap: 6 }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'small-parts', startX: 12, startY: 48, count: 5, gap: 4 }),
      ],
    }),
  },
  {
    id: 'equipment-rental',
    name: 'Equipment Rental Warehouse',
    description: 'Service lanes, check-in/check-out zones, and bay-style equipment storage.',
    category: 'Rental',
    build: ({ warehouseId, defaultDepartmentId }) => ({
      dimensions: { width: 130, depth: 90 },
      objects: [
        makeArea(warehouseId, 'RECEIVING', 'Check-In', 6, 6, 20, 14),
        makeArea(warehouseId, 'SHIPPING', 'Check-Out', 104, 6, 20, 14),
        makeArea(warehouseId, 'STAGING', 'Maintenance Queue', 36, 6, 24, 14),
        makeArea(warehouseId, 'AISLE', 'Central Service Lane', 60, 24, 12, 54, { color: '#4a5962' }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'equipment-bay', startX: 8, startY: 28, count: 3, gap: 8 }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'wide-bulk', startX: 76, startY: 28, count: 2, gap: 8 }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'vertical-storage', startX: 76, startY: 48, count: 3, gap: 6 }),
      ],
    }),
  },
  {
    id: 'cold-storage-layout',
    name: 'Cold Storage Layout',
    description: 'Temperature-controlled rows with controlled receiving and dispatch.',
    category: 'Cold Storage',
    build: ({ warehouseId, defaultDepartmentId }) => ({
      dimensions: { width: 110, depth: 70 },
      objects: [
        makeArea(warehouseId, 'RECEIVING', 'Cold Receiving', 6, 6, 18, 12),
        makeArea(warehouseId, 'SHIPPING', 'Cold Dispatch', 86, 6, 18, 12),
        makeArea(warehouseId, 'ZONE', 'Cold Envelope', 6, 20, 98, 42, { departmentId: defaultDepartmentId, color: '#597f95' }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'cold-storage', startX: 12, startY: 28, count: 4, gap: 6 }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'cold-storage', startX: 12, startY: 42, count: 4, gap: 6 }),
      ],
    }),
  },
  {
    id: 'u-shaped-picking-flow',
    name: 'U-Shaped Picking Flow',
    description: 'Inbound and outbound near one another with a U-shaped picking path.',
    category: 'Flow',
    build: ({ warehouseId, defaultDepartmentId }) => ({
      dimensions: { width: 120, depth: 80 },
      objects: [
        makeArea(warehouseId, 'RECEIVING', 'Receiving', 6, 6, 18, 12),
        makeArea(warehouseId, 'SHIPPING', 'Shipping', 96, 6, 18, 12),
        makeArea(warehouseId, 'AISLE', 'U-Flow', 26, 20, 12, 44, { color: '#4a5962' }),
        makeArea(warehouseId, 'AISLE', 'Return Spine', 74, 20, 12, 44, { color: '#4a5962' }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'standard-pallet', startX: 40, startY: 22, count: 2, gap: 8 }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'standard-pallet', startX: 40, startY: 38, count: 2, gap: 8 }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'standard-pallet', startX: 40, startY: 54, count: 2, gap: 8 }),
      ],
    }),
  },
  {
    id: 'receiving-to-shipping-straight',
    name: 'Receiving-to-Shipping Straight Flow',
    description: 'Linear throughput with clear spine and dense side storage.',
    category: 'Flow',
    build: ({ warehouseId, defaultDepartmentId }) => ({
      dimensions: { width: 140, depth: 70 },
      objects: [
        makeArea(warehouseId, 'RECEIVING', 'Receiving', 4, 6, 20, 12),
        makeArea(warehouseId, 'SHIPPING', 'Shipping', 116, 6, 20, 12),
        makeArea(warehouseId, 'AISLE', 'Straight Flow Spine', 28, 26, 84, 10, { color: '#4a5962' }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'standard-pallet', startX: 28, startY: 40, count: 5, gap: 4 }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'standard-pallet', startX: 28, startY: 54, count: 5, gap: 4 }),
      ],
    }),
  },
  {
    id: 'high-density-rack-rows',
    name: 'High Density Rack Rows',
    description: 'Tight repeated rack rows with structured aisles for maximum capacity.',
    category: 'Density',
    build: ({ warehouseId, defaultDepartmentId }) => ({
      dimensions: { width: 150, depth: 90 },
      objects: [
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'standard-pallet', startX: 10, startY: 18, count: 8, gap: 4 }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'standard-pallet', startX: 10, startY: 32, count: 8, gap: 4 }),
        ...rowOfRacks({ warehouseId, departmentId: defaultDepartmentId, templateId: 'standard-pallet', startX: 10, startY: 46, count: 8, gap: 4 }),
        makeArea(warehouseId, 'AISLE', 'North Spine', 8, 26, 128, 4, { color: '#4a5962' }),
        makeArea(warehouseId, 'AISLE', 'Central Spine', 8, 40, 128, 4, { color: '#4a5962' }),
      ],
    }),
  },
];

export function buildObjectFromRackTemplate(params: {
  warehouseId: string;
  departmentId?: string;
  templateId: string;
  x?: number;
  y?: number;
}): WarehouseFloorObject {
  return makeRack(
    params.warehouseId,
    params.departmentId,
    params.templateId,
    params.x ?? 10,
    params.y ?? 10,
  );
}

export function buildWarehouseAssetObject(params: {
  warehouseId: string;
  assetId: string;
  x?: number;
  y?: number;
  overrides?: Partial<WarehouseFloorObject>;
}): WarehouseFloorObject {
  const definition = WAREHOUSE_ASSET_DEFINITIONS.find((asset) => asset.id === params.assetId);
  if (!definition) {
    throw new Error(`Unknown warehouse asset: ${params.assetId}`);
  }

  return createFloorObject({
    warehouseId: params.warehouseId,
    type: definition.type,
    name: definition.name,
    assetModel: definition.assetModel,
    x: params.x ?? 10,
    y: params.y ?? 10,
    width: definition.width,
    depth: definition.depth,
    height: definition.height,
    color: definition.color,
    ...definition.defaults,
    ...params.overrides,
  });
}

export function buildWarehouseAreaObject(params: {
  warehouseId: string;
  type: WarehouseAreaObjectType;
  departmentId?: string;
  x?: number;
  y?: number;
  overrides?: Partial<WarehouseFloorObject>;
}): WarehouseFloorObject {
  const definition = WAREHOUSE_AREA_DEFINITIONS.find((area) => area.type === params.type);
  if (!definition) throw new Error(`Unknown warehouse area: ${params.type}`);
  const sequence = shortId(params.type.toLowerCase()).slice(-3).toUpperCase();
  return makeArea(
    params.warehouseId,
    params.type,
    `${definition.name} ${sequence}`,
    params.x ?? (params.type === 'DOCK_DOOR' ? 8 : 10),
    params.y ?? (params.type === 'DOCK_DOOR' ? 0 : 10),
    definition.width,
    definition.depth,
    {
      departmentId: params.departmentId,
      height: definition.height,
      color: definition.color,
      ...params.overrides,
    },
  );
}

export function buildAisleObject(warehouseId: string): WarehouseFloorObject {
  return buildWarehouseAreaObject({ warehouseId, type: 'AISLE', x: 20, y: 20 });
}

export function buildDockDoorObject(warehouseId: string): WarehouseFloorObject {
  return buildWarehouseAreaObject({ warehouseId, type: 'DOCK_DOOR' });
}
