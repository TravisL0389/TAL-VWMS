import { describe, expect, it } from 'vitest';
import { buildHeuristicPlan, localInsights } from '../utils/aiService';
import type { InventoryItem, Order, Rack } from '../types';

const racks: Rack[] = [
  {
    id: 'rack-a',
    warehouseId: 'wh-1',
    departmentId: 'dept-a',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    status: 'OPERATIONAL',
    capacity: 20,
    occupied: 10,
  },
  {
    id: 'rack-b',
    warehouseId: 'wh-1',
    departmentId: 'dept-a',
    x: 1000,
    y: 1000,
    width: 100,
    height: 100,
    status: 'OPERATIONAL',
    capacity: 20,
    occupied: 5,
  },
];

const inventory: InventoryItem[] = [
  {
    id: 'item-1',
    name: 'Near Item',
    sku: 'SKU-1',
    departmentId: 'dept-a',
    warehouseId: 'wh-1',
    rackId: 'rack-a',
    quantity: 10,
    available: 10,
    status: 'AVAILABLE',
    lastUpdated: 1,
  },
  {
    id: 'item-2',
    name: 'Far Item',
    sku: 'SKU-2',
    departmentId: 'dept-a',
    warehouseId: 'wh-1',
    rackId: 'rack-b',
    quantity: 10,
    available: 1,
    status: 'REPAIR',
    lastUpdated: 1,
  },
];

const order: Order = {
  id: 'order-1',
  reference: 'ORD-1001',
  warehouseId: 'wh-1',
  status: 'PENDING',
  priority: 'NORMAL',
  lines: [
    { itemId: 'item-2', sku: 'SKU-2', name: 'Far Item', quantity: 2, pulled: 0 },
    { itemId: 'item-1', sku: 'SKU-1', name: 'Near Item', quantity: 1, pulled: 0 },
  ],
  createdAt: 1,
};

describe('buildHeuristicPlan', () => {
  it('orders nearer racks first and emits stock warnings', () => {
    const plan = buildHeuristicPlan({ order, inventory, racks });

    expect(plan.generatedBy).toBe('HEURISTIC');
    expect(plan.steps[0]?.itemId).toBe('item-1');
    expect(plan.warnings.some((warning) => warning.includes('Low stock'))).toBe(true);
    expect(plan.warnings.some((warning) => warning.includes('repair'))).toBe(true);
  });
});

describe('localInsights', () => {
  it('surfaces stockout, low-stock, and repair insights', () => {
    const insights = localInsights([
      ...inventory,
      {
        id: 'item-3',
        name: 'Out',
        sku: 'SKU-3',
        departmentId: 'dept-a',
        warehouseId: 'wh-1',
        quantity: 5,
        available: 0,
        status: 'AVAILABLE',
        lastUpdated: 1,
      },
    ]);

    expect(insights.some((insight) => insight.level === 'CRITICAL')).toBe(true);
    expect(insights.some((insight) => insight.level === 'WARN')).toBe(true);
    expect(insights.some((insight) => insight.message.includes('repair'))).toBe(true);
  });
});
