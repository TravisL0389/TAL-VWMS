import type {
  InventoryItem,
  RfidSystemMode,
  WarehouseFloorObject,
  WarehouseRfidSystemState,
} from '../types';
import type { RfidReadDirection, RfidReadEvent, RfidSystemMetrics } from '../components/warehouse-designer/warehouseTypes';

export const RFID_ENDPOINT_TYPES = ['RFID_ANTENNA', 'RFID_PORTAL', 'RFID_READER'] as const;

export interface RfidGatewayCommand {
  systemEnabled: boolean;
  mode: RfidSystemMode;
  txPower: number;
  readIntervalMs: number;
  duplicateWindowMs: number;
  endpoints: Array<{
    id: string;
    readerId: string;
    enabled: boolean;
    txPower: number;
    mode: RfidSystemMode;
  }>;
}

export interface RfidHardwareAdapter {
  applyCommand: (command: RfidGatewayCommand) => Promise<void>;
  healthCheck: () => Promise<{ connected: boolean; message: string }>;
}

export function createDefaultRfidSystemState(now = Date.now()): WarehouseRfidSystemState {
  return {
    enabled: false,
    mode: 'AUTO',
    txPower: 24,
    readIntervalMs: 750,
    duplicateWindowMs: 3000,
    lastUpdated: now,
  };
}

export function isRfidEndpoint(object: WarehouseFloorObject): boolean {
  return RFID_ENDPOINT_TYPES.includes(object.type as (typeof RFID_ENDPOINT_TYPES)[number]);
}

export function buildRfidGatewayCommand(
  state: WarehouseRfidSystemState,
  objects: WarehouseFloorObject[],
): RfidGatewayCommand {
  return {
    systemEnabled: state.enabled,
    mode: state.mode,
    txPower: state.txPower,
    readIntervalMs: state.readIntervalMs,
    duplicateWindowMs: state.duplicateWindowMs,
    endpoints: objects.filter(isRfidEndpoint).map((object) => ({
      id: object.id,
      readerId: object.rfidReaderId || object.id,
      enabled: state.enabled && object.rfidEnabled !== false && object.automationState !== 'FAULT',
      txPower: clampRfidPower(object.rfidPower ?? state.txPower),
      mode: resolveEffectiveRfidMode(state.mode, object.rfidMode),
    })),
  };
}

export function runVirtualRfidDiagnostic(params: {
  state: WarehouseRfidSystemState;
  objects: WarehouseFloorObject[];
  inventory: InventoryItem[];
  now?: number;
}): { events: RfidReadEvent[]; readRates: Record<string, number> } {
  const now = params.now ?? Date.now();
  if (!params.state.enabled) return { events: [], readRates: {} };

  const endpoints = params.objects.filter(
    (object) => isRfidEndpoint(object) && object.rfidEnabled !== false && object.automationState !== 'FAULT',
  );
  if (!endpoints.length) return { events: [], readRates: {} };

  const taggedInventory = params.inventory.filter((item) => Boolean(item.rfid?.trim()));
  const tags = taggedInventory.length
    ? taggedInventory.slice(0, 12).map((item) => ({ epc: item.rfid!.trim(), name: item.name }))
    : [
        { epc: 'DEMO-EPC-3008-A1', name: 'Diagnostic Tag A' },
        { epc: 'DEMO-EPC-3008-B2', name: 'Diagnostic Tag B' },
        { epc: 'DEMO-EPC-3008-C3', name: 'Diagnostic Tag C' },
      ];

  const events = tags.map((tag, index): RfidReadEvent => {
    const endpoint = endpoints[index % endpoints.length];
    const seed = stableHash(`${tag.epc}:${endpoint.id}:${now}`);
    return {
      id: `virtual-read-${now}-${index}`,
      epc: tag.epc,
      itemName: tag.name,
      antennaId: endpoint.id,
      antennaName: endpoint.name,
      direction: resolveDirection(resolveEffectiveRfidMode(params.state.mode, endpoint.rfidMode), index),
      confidence: Math.min(99, 91 + (seed % 9)),
      timestamp: now - index * 420,
      source: 'VIRTUAL_DIAGNOSTIC',
    };
  });

  const readsByEndpoint = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.antennaId] = (acc[event.antennaId] || 0) + 1;
    return acc;
  }, {});
  const readRates = Object.fromEntries(
    endpoints.map((endpoint) => [
      endpoint.id,
      Math.max(0, Math.round(((readsByEndpoint[endpoint.id] || 0) * 60000) / params.state.readIntervalMs)),
    ]),
  );

  return { events, readRates };
}

export function computeRfidMetrics(params: {
  state: WarehouseRfidSystemState;
  objects: WarehouseFloorObject[];
  inventory: InventoryItem[];
  events: RfidReadEvent[];
}): RfidSystemMetrics {
  const endpoints = params.objects.filter(isRfidEndpoint);
  const online = endpoints.filter(
    (object) => params.state.enabled && object.rfidEnabled !== false && object.automationState !== 'FAULT',
  );
  return {
    configuredEndpoints: endpoints.length,
    onlineEndpoints: online.length,
    trackedTags: params.inventory.filter((item) => Boolean(item.rfid?.trim())).length,
    readsPerMinute: online.reduce((sum, object) => sum + (object.rfidReadRate || 0), 0),
    eventCount: params.events.length,
  };
}

export function clampRfidPower(value: number): number {
  return Math.round(Math.min(31.5, Math.max(10, value)) * 2) / 2;
}

export function resolveEffectiveRfidMode(
  systemMode: RfidSystemMode,
  endpointMode?: RfidSystemMode,
): RfidSystemMode {
  return systemMode === 'AUTO' ? endpointMode || 'AUTO' : systemMode;
}

function resolveDirection(mode: RfidSystemMode, index: number): RfidReadDirection {
  if (mode === 'INTAKE') return 'INBOUND';
  if (mode === 'OUTTAKE') return 'OUTBOUND';
  if (mode === 'CYCLE_COUNT') return 'CYCLE_COUNT';
  if (mode === 'MAINTENANCE') return 'PRESENCE';
  return index % 2 === 0 ? 'INBOUND' : 'OUTBOUND';
}

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}
