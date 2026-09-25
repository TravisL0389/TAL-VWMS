import { describe, expect, it } from 'vitest';
import {
  buildRfidGatewayCommand,
  computeRfidMetrics,
  createDefaultRfidSystemState,
  runVirtualRfidDiagnostic,
} from '../utils/rfidController';
import { createFloorObject } from '../components/warehouse-designer/warehouseGeometry';
import type { InventoryItem } from '../types';

const antenna = createFloorObject({
  id: 'antenna-1',
  warehouseId: 'wh-1',
  type: 'RFID_ANTENNA',
  name: 'Inbound Antenna',
  rfidEnabled: true,
  rfidPower: 27,
  rfidMode: 'INTAKE',
  rfidReaderId: 'RFID-IN-01',
  automationState: 'ACTIVE',
});

const inventory: InventoryItem[] = [{
  id: 'item-1',
  name: 'Tagged Case',
  sku: 'CASE-01',
  rfid: 'EPC-3008-ABC',
  departmentId: 'dept-1',
  warehouseId: 'wh-1',
  quantity: 1,
  available: 1,
  status: 'AVAILABLE',
  lastUpdated: 1,
}];

describe('RFID control plane', () => {
  it('keeps endpoints effectively off while the system interlock is disabled', () => {
    const state = createDefaultRfidSystemState(1);
    const command = buildRfidGatewayCommand(state, [antenna]);

    expect(command.systemEnabled).toBe(false);
    expect(command.endpoints[0]).toMatchObject({ enabled: false, readerId: 'RFID-IN-01', txPower: 27 });
    expect(runVirtualRfidDiagnostic({ state, objects: [antenna], inventory, now: 100 })).toEqual({ events: [], readRates: {} });
  });

  it('produces directional virtual reads and health metrics when energized', () => {
    const state = { ...createDefaultRfidSystemState(1), enabled: true };
    const diagnostic = runVirtualRfidDiagnostic({ state, objects: [antenna], inventory, now: 100 });
    const observedAntenna = { ...antenna, rfidReadRate: diagnostic.readRates[antenna.id] };
    const metrics = computeRfidMetrics({ state, objects: [observedAntenna], inventory, events: diagnostic.events });

    expect(diagnostic.events).toHaveLength(1);
    expect(diagnostic.events[0]).toMatchObject({ epc: 'EPC-3008-ABC', direction: 'INBOUND', source: 'VIRTUAL_DIAGNOSTIC' });
    expect(metrics).toMatchObject({ configuredEndpoints: 1, onlineEndpoints: 1, trackedTags: 1, eventCount: 1 });
    expect(metrics.readsPerMinute).toBeGreaterThan(0);
  });

  it('uses an explicit system mode to regulate locally assigned endpoints', () => {
    const state = { ...createDefaultRfidSystemState(1), enabled: true, mode: 'CYCLE_COUNT' as const };
    const diagnostic = runVirtualRfidDiagnostic({ state, objects: [antenna], inventory, now: 100 });
    const command = buildRfidGatewayCommand(state, [antenna]);

    expect(diagnostic.events[0].direction).toBe('CYCLE_COUNT');
    expect(command.endpoints[0].mode).toBe('CYCLE_COUNT');
  });
});
