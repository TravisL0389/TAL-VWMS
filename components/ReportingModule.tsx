import React, { useMemo, useState } from 'react';
import {
  BarChart3, Download, Calendar, TrendingUp, TrendingDown, Package,
  Activity, AlertTriangle, CheckCircle2, Clock, Filter,
} from 'lucide-react';
import type { InventoryItem, Order, Rack, DepartmentDef, AppSettings } from '../types';
import { getDepartmentMeta } from '../constants';
import { downloadFile, toCSV } from '../utils/storage';

// =============================================================================
// ReportingModule — real analytics, no random data.
// All metrics derived from current inventory, orders, and rack state.
// CSV export covers the filtered date range.
// =============================================================================

interface ReportingModuleProps {
  inventory: InventoryItem[];
  orders: Order[];
  racks: Rack[];
  departments: DepartmentDef[];
  warehouseId: string;
  warehouseName: string;
  settings: AppSettings;
  onNotify: (n: { type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'; title: string; message: string }) => void;
}

type DateRange = '7d' | '30d' | '90d' | 'all';

const ReportingModule: React.FC<ReportingModuleProps> = ({
  inventory, orders, racks, departments, warehouseId, warehouseName, settings, onNotify,
}) => {
  const [range, setRange] = useState<DateRange>('30d');

  const cutoff = useMemo(() => {
    const now = Date.now();
    if (range === '7d') return now - 7 * 86400000;
    if (range === '30d') return now - 30 * 86400000;
    if (range === '90d') return now - 90 * 86400000;
    return 0;
  }, [range]);

  const filteredOrders = useMemo(() => orders.filter(o => o.createdAt >= cutoff), [orders, cutoff]);

  // Top-level metrics
  const metrics = useMemo(() => {
    const totalUnits = inventory.reduce((s, i) => s + i.quantity, 0);
    const availableUnits = inventory.reduce((s, i) => s + i.available, 0);
    const inUse = totalUnits - availableUnits;
    const utilization = totalUnits > 0 ? (inUse / totalUnits) * 100 : 0;

    const completed = filteredOrders.filter(o => o.status === 'SHIPPED' || o.status === 'PACKED').length;
    const cancelled = filteredOrders.filter(o => o.status === 'CANCELLED').length;
    const active = filteredOrders.filter(o => o.status === 'PENDING' || o.status === 'PULLING').length;
    const fulfillmentRate = filteredOrders.length > 0
      ? (completed / filteredOrders.length) * 100
      : 0;

    const repairItems = inventory.filter(i => i.status === 'REPAIR').length;
    const lowStock = inventory.filter(i => i.available < i.quantity * 0.2).length;

    const rackCapacity = racks.reduce((s, r) => s + r.capacity, 0);
    const rackOccupied = racks.reduce((s, r) => s + r.occupied, 0);
    const rackUtilization = rackCapacity > 0 ? (rackOccupied / rackCapacity) * 100 : 0;

    return {
      totalUnits, availableUnits, inUse, utilization,
      completed, cancelled, active, fulfillmentRate, totalOrders: filteredOrders.length,
      repairItems, lowStock,
      rackCapacity, rackOccupied, rackUtilization,
    };
  }, [inventory, filteredOrders, racks]);

  // By department breakdown
  const byDept = useMemo(() => {
    return departments.map(d => {
      const items = inventory.filter(i => i.departmentId === d.id);
      const units = items.reduce((s, i) => s + i.quantity, 0);
      const available = items.reduce((s, i) => s + i.available, 0);
      const ordersInDept = filteredOrders.filter(o =>
        o.lines.some(l => items.some(i => i.id === l.itemId)),
      ).length;
      return {
        dept: d,
        items: items.length,
        units,
        available,
        utilization: units > 0 ? ((units - available) / units) * 100 : 0,
        orders: ordersInDept,
      };
    });
  }, [departments, inventory, filteredOrders]);

  // Top items (most-ordered in range)
  const topItems = useMemo(() => {
    const counts: Record<string, { item: InventoryItem; count: number }> = {};
    for (const order of filteredOrders) {
      for (const line of order.lines) {
        const item = inventory.find(i => i.id === line.itemId);
        if (!item) continue;
        if (!counts[item.id]) counts[item.id] = { item, count: 0 };
        counts[item.id].count += line.quantity;
      }
    }
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [filteredOrders, inventory]);

  // Order trend by week (real data)
  const orderTrend = useMemo(() => {
    if (filteredOrders.length === 0) return [];
    const buckets: Record<string, number> = {};
    const weeks = range === '7d' ? 7 : range === '30d' ? 4 : range === '90d' ? 12 : 12;
    const bucketSize = range === '7d' ? 86400000 : 7 * 86400000;
    const now = Date.now();
    for (let i = weeks - 1; i >= 0; i--) {
      const start = now - (i + 1) * bucketSize;
      const end = now - i * bucketSize;
      const key = range === '7d'
        ? new Date(start).toLocaleDateString(undefined, { weekday: 'short' })
        : `W${weeks - i}`;
      buckets[key] = filteredOrders.filter(o => o.createdAt >= start && o.createdAt < end).length;
    }
    return Object.entries(buckets).map(([label, count]) => ({ label, count }));
  }, [filteredOrders, range]);

  const maxTrend = Math.max(1, ...orderTrend.map(t => t.count));

  // CSV exports
  const exportInventory = () => {
    const rows = inventory.map(i => ({
      sku: i.sku,
      name: i.name,
      department: getDepartmentMeta(i.departmentId, departments).label,
      barcode: i.barcode || '',
      rfid: i.rfid || '',
      rackId: i.rackId || '',
      shelf: i.shelf ?? '',
      position: i.position || '',
      quantity: i.quantity,
      available: i.available,
      status: i.status,
      lastUpdated: new Date(i.lastUpdated).toISOString(),
    }));
    downloadFile(`vwms-inventory-${warehouseId}-${Date.now()}.csv`, toCSV(rows));
    onNotify({ type: 'SUCCESS', title: 'Inventory exported', message: `${rows.length} items written to CSV.` });
  };

  const exportOrders = () => {
    const rows = filteredOrders.flatMap(o => o.lines.map(l => ({
      orderRef: o.reference,
      orderStatus: o.status,
      priority: o.priority,
      client: o.client || '',
      project: o.project || '',
      itemSku: l.sku,
      itemName: l.name,
      quantity: l.quantity,
      pulled: l.pulled,
      createdAt: new Date(o.createdAt).toISOString(),
    })));
    downloadFile(`vwms-orders-${warehouseId}-${Date.now()}.csv`, toCSV(rows));
    onNotify({ type: 'SUCCESS', title: 'Orders exported', message: `${rows.length} order line(s) written to CSV.` });
  };

  const exportSummary = () => {
    const rows = byDept.map(d => ({
      department: d.dept.label,
      items: d.items,
      totalUnits: d.units,
      available: d.available,
      utilization: `${d.utilization.toFixed(1)}%`,
      ordersInRange: d.orders,
    }));
    downloadFile(`vwms-summary-${warehouseId}-${Date.now()}.csv`, toCSV(rows));
    onNotify({ type: 'SUCCESS', title: 'Summary exported', message: 'Department summary written to CSV.' });
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#0a0c0e]">
      {/* Header */}
      <div className="border-b border-[#2a2d31] bg-[#0f1113] p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Analytics</div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Reports & Insights</h1>
            <div className="text-xs text-zinc-500">{warehouseName}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-[#16181a] p-1">
              {(['7d', '30d', '90d', 'all'] as DateRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
                    range === r ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {r === 'all' ? 'All time' : r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 p-4 sm:p-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi
            icon={<Package size={16} />}
            label="Total Units"
            value={metrics.totalUnits.toLocaleString()}
            sub={`${inventory.length} unique ${settings.itemLabel.toLowerCase()}s`}
            tone="default"
          />
          <Kpi
            icon={<Activity size={16} />}
            label="In Use"
            value={`${metrics.inUse.toLocaleString()}`}
            sub={`${metrics.utilization.toFixed(1)}% utilization`}
            tone={metrics.utilization > 80 ? 'warning' : 'success'}
          />
          <Kpi
            icon={<CheckCircle2 size={16} />}
            label="Fulfillment"
            value={`${metrics.fulfillmentRate.toFixed(0)}%`}
            sub={`${metrics.completed} of ${metrics.totalOrders} orders`}
            tone={metrics.fulfillmentRate > 80 ? 'success' : metrics.fulfillmentRate > 50 ? 'warning' : 'danger'}
          />
          <Kpi
            icon={<AlertTriangle size={16} />}
            label="Needs Attention"
            value={String(metrics.repairItems + metrics.lowStock)}
            sub={`${metrics.repairItems} repair · ${metrics.lowStock} low`}
            tone={metrics.repairItems + metrics.lowStock > 0 ? 'warning' : 'default'}
          />
        </div>

        {/* Order trend */}
        <Card title="Order Volume" right={
          <button
            onClick={exportOrders}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={12} /> Export Orders
          </button>
        }>
          {orderTrend.length === 0 || filteredOrders.length === 0 ? (
            <EmptyMini
              icon={<BarChart3 size={24} />}
              message="No orders in this date range yet."
            />
          ) : (
            <div className="flex h-40 items-end gap-1 px-2">
              {orderTrend.map((t, idx) => (
                <div key={idx} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative w-full flex-1">
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-t bg-red-600 transition-all"
                      style={{ height: `${(t.count / maxTrend) * 100}%`, minHeight: t.count > 0 ? 4 : 0 }}
                    />
                    {t.count > 0 && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 text-[10px] font-mono text-white">
                        {t.count}
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500">{t.label}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* By department */}
          <Card title={`By ${settings.departmentLabel}`} right={
            <button
              onClick={exportSummary}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              <Download size={12} /> Export
            </button>
          }>
            {byDept.length === 0 ? (
              <EmptyMini icon={<Filter size={24} />} message="No departments configured." />
            ) : (
              <div className="space-y-3">
                {byDept.map(d => (
                  <div key={d.dept.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.dept.color }} />
                        <span className="font-semibold text-white">{d.dept.label}</span>
                      </div>
                      <div className="font-mono text-zinc-400">
                        {d.units.toLocaleString()} units · {d.utilization.toFixed(0)}%
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded bg-[#16181a]">
                      <div
                        className="h-full rounded transition-all"
                        style={{ width: `${Math.min(100, d.utilization)}%`, backgroundColor: d.dept.color }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
                      <span>{d.items} {settings.itemLabel.toLowerCase()}s</span>
                      <span>{d.orders} order{d.orders === 1 ? '' : 's'} in range</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Top items */}
          <Card title="Top Items by Volume">
            {topItems.length === 0 ? (
              <EmptyMini icon={<TrendingUp size={24} />} message="No order activity in this date range." />
            ) : (
              <div className="space-y-2">
                {topItems.map((t, i) => {
                  const dept = getDepartmentMeta(t.item.departmentId, departments);
                  return (
                    <div key={t.item.id} className="flex items-center gap-3 rounded-lg border border-[#2a2d31] bg-[#0f1113] p-2.5">
                      <div className="w-6 text-center font-mono text-xs text-zinc-500">#{i + 1}</div>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dept.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">{t.item.name}</div>
                        <div className="font-mono text-[11px] text-zinc-500">{t.item.sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-bold text-white">{t.count}</div>
                        <div className="text-[10px] text-zinc-500">ordered</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Status overview */}
        <Card title="Operational Status">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatusTile
              label="Active Orders"
              value={metrics.active}
              icon={<Clock size={14} />}
              tone={metrics.active > 0 ? 'info' : 'default'}
            />
            <StatusTile
              label="Completed"
              value={metrics.completed}
              icon={<CheckCircle2 size={14} />}
              tone="success"
            />
            <StatusTile
              label="Cancelled"
              value={metrics.cancelled}
              icon={<TrendingDown size={14} />}
              tone={metrics.cancelled > 0 ? 'warning' : 'default'}
            />
            <StatusTile
              label="Rack Use"
              value={`${metrics.rackUtilization.toFixed(0)}%`}
              icon={<Activity size={14} />}
              tone={metrics.rackUtilization > 80 ? 'warning' : 'success'}
            />
          </div>
        </Card>

        {/* Export panel */}
        <Card title="Export Data">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              onClick={exportInventory}
              className="flex items-center justify-center gap-2 rounded-lg border border-[#2a2d31] bg-[#0f1113] py-3 text-sm font-semibold text-white transition hover:border-red-600 hover:bg-[#1a1d20]"
            >
              <Download size={14} /> Inventory CSV
            </button>
            <button
              onClick={exportOrders}
              disabled={filteredOrders.length === 0}
              className="flex items-center justify-center gap-2 rounded-lg border border-[#2a2d31] bg-[#0f1113] py-3 text-sm font-semibold text-white transition hover:border-red-600 hover:bg-[#1a1d20] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download size={14} /> Orders CSV
            </button>
            <button
              onClick={exportSummary}
              className="flex items-center justify-center gap-2 rounded-lg border border-[#2a2d31] bg-[#0f1113] py-3 text-sm font-semibold text-white transition hover:border-red-600 hover:bg-[#1a1d20]"
            >
              <Download size={14} /> Summary CSV
            </button>
          </div>
          <div className="mt-3 text-[11px] text-zinc-500">
            CSVs use UTF-8 with comma delimiters. Orders export respects the active date range.
          </div>
        </Card>
      </div>
    </div>
  );
};

// =============================================================================
// Sub-components
// =============================================================================
const Kpi: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: 'default' | 'success' | 'warning' | 'danger';
}> = ({ icon, label, value, sub, tone }) => {
  const toneClass = {
    default: 'text-zinc-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    danger: 'text-red-400',
  }[tone];
  return (
    <div className="rounded-xl border border-[#2a2d31] bg-[#0f1113] p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</div>
        <span className={toneClass}>{icon}</span>
      </div>
      <div className="font-mono text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-[11px] text-zinc-500">{sub}</div>
    </div>
  );
};

const Card: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode }> = ({ title, right, children }) => (
  <div className="rounded-xl border border-[#2a2d31] bg-[#0f1113] p-4 sm:p-5">
    <div className="mb-4 flex items-center justify-between">
      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{title}</div>
      {right}
    </div>
    {children}
  </div>
);

const EmptyMini: React.FC<{ icon: React.ReactNode; message: string }> = ({ icon, message }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-500">
    <div className="mb-2">{icon}</div>
    <div className="text-xs">{message}</div>
  </div>
);

const StatusTile: React.FC<{ label: string; value: string | number; icon: React.ReactNode; tone: 'default' | 'success' | 'warning' | 'info' }> = ({ label, value, icon, tone }) => {
  const tc = {
    default: 'text-zinc-400 bg-zinc-800/30',
    success: 'text-green-400 bg-green-600/10',
    warning: 'text-yellow-400 bg-yellow-600/10',
    info: 'text-blue-400 bg-blue-600/10',
  }[tone];
  return (
    <div className={`rounded-lg p-3 ${tc}`}>
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
        {icon} <span>{label}</span>
      </div>
      <div className="font-mono text-xl font-black">{value}</div>
    </div>
  );
};

export default ReportingModule;
