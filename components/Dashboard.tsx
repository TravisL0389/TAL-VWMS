import React, { useEffect, useMemo, useState } from 'react';
import {
  Package, Activity, Truck, AlertTriangle, ArrowUpRight, ArrowDownRight,
  ChevronRight, Sparkles, RefreshCw, MapPin, Boxes, ClipboardList, Loader2,
} from 'lucide-react';
import type { DepartmentDef, InventoryItem, Order, Rack, AppSettings } from '../types';
import { getDepartmentMeta, getIcon } from '../constants';
import { localInsights, aiInsights, isAIConfigured, type InventoryInsight } from '../utils/aiService';

interface DashboardProps {
  warehouseName: string;
  inventory: InventoryItem[];
  racks: Rack[];
  orders: Order[];
  departments: DepartmentDef[];
  settings: AppSettings;
  onNavigate: (tab: 'map' | 'inventory' | 'pull' | 'analytics') => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  warehouseName, inventory, racks, orders, departments, settings, onNavigate,
}) => {
  const [insights, setInsights] = useState<InventoryInsight[]>(() => localInsights(inventory));
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightSource, setInsightSource] = useState<'AI' | 'LOCAL'>('LOCAL');

  // High-level metrics — all derived from real data
  const stats = useMemo(() => {
    const totalUnits = inventory.reduce((s, i) => s + i.quantity, 0);
    const availableUnits = inventory.reduce((s, i) => s + i.available, 0);
    const activeOrders = orders.filter(o => o.status === 'PULLING' || o.status === 'PENDING').length;
    const repairItems = inventory.filter(i => i.status === 'REPAIR').length;
    const utilisationPct = totalUnits > 0 ? Math.round(((totalUnits - availableUnits) / totalUnits) * 100) : 0;
    const rackUtilisation = racks.length > 0
      ? Math.round((racks.reduce((s, r) => s + (r.capacity > 0 ? (r.occupied / r.capacity) * 100 : 0), 0) / racks.length))
      : 0;

    return {
      totalUnits, availableUnits, activeOrders, repairItems, utilisationPct, rackUtilisation,
      itemCount: inventory.length, rackCount: racks.length, orderCount: orders.length,
    };
  }, [inventory, racks, orders]);

  const byDept = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of departments) map[d.id] = 0;
    for (const i of inventory) map[i.departmentId] = (map[i.departmentId] || 0) + i.quantity;
    const max = Math.max(1, ...Object.values(map));
    return departments.map(d => ({ dept: d, count: map[d.id] || 0, pct: ((map[d.id] || 0) / max) * 100 }));
  }, [inventory, departments]);

  const refreshInsights = async () => {
    if (!isAIConfigured() || !settings.enableAI) {
      setInsights(localInsights(inventory));
      setInsightSource('LOCAL');
      return;
    }
    setInsightsLoading(true);
    try {
      const out = await aiInsights(inventory);
      setInsights(out);
      setInsightSource('AI');
    } finally {
      setInsightsLoading(false);
    }
  };

  // Generate insights once on mount (and whenever inventory size changes meaningfully)
  useEffect(() => {
    refreshInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory.length]);

  const isEmpty = inventory.length === 0 && racks.length === 0 && orders.length === 0;

  return (
    <div className="space-y-6 px-4 pb-8 pt-4 sm:px-6 sm:pt-5 lg:px-7">
      <header className="flex flex-col gap-4 border-b border-[#c7bcae] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#232321] tracking-tighter uppercase leading-none">
            {warehouseName}
          </h2>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.3em] text-[#8a8174] sm:text-[10px]">
            Operational overview & live status
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[9px] font-bold text-[#8a8174] uppercase tracking-widest">Live</span>
          <div className="flex items-center gap-2 rounded border border-[#bfc8bf] bg-[#eef1eb] px-2.5 py-1">
            <span className="h-1 w-1 rounded-full bg-[#6f8b78] animate-pulse" />
            <span className="text-[9px] font-bold uppercase tracking-widest leading-none text-[#6f8b78]">Synced</span>
          </div>
        </div>
      </header>

      {/* Empty state — gentle nudge to fill it in */}
      {isEmpty && (
        <div className="rounded-lg border border-[#c7bcae] bg-gradient-to-br from-[#f5f1eb] to-[#e8e2d8] p-6 sm:p-10">
          <div className="max-w-xl mx-auto text-center">
            <div className="inline-flex w-12 h-12 rounded-lg border border-cyan-700/30 bg-cyan-700/10 items-center justify-center mb-4">
              <Sparkles size={20} className="text-cyan-300" />
            </div>
            <h3 className="text-lg font-black text-[#232321] uppercase tracking-tight mb-2">
              Your warehouse is ready
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-[#6c655c]">
              Start by laying out your floor plan, adding inventory, or jumping straight into Smart Pull.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <PrimaryAction onClick={() => onNavigate('map')} icon={<MapPin size={14} />} label="Build floor plan" />
              <PrimaryAction onClick={() => onNavigate('inventory')} icon={<Boxes size={14} />} label="Add inventory" />
              <PrimaryAction onClick={() => onNavigate('pull')} icon={<ClipboardList size={14} />} label="Try smart pull" />
            </div>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Units"
          value={stats.totalUnits.toLocaleString()}
          icon={<Package size={14} />}
          subtitle={`${stats.itemCount} SKU${stats.itemCount === 1 ? '' : 's'}`}
        />
        <StatCard
          title="Available"
          value={stats.availableUnits.toLocaleString()}
          icon={<Activity size={14} />}
          subtitle={`${stats.utilisationPct}% in use`}
          trend={stats.utilisationPct > 75 ? 'up' : 'flat'}
        />
        <StatCard
          title="Active Orders"
          value={stats.activeOrders.toString()}
          icon={<Truck size={14} />}
          subtitle={`${stats.orderCount} total`}
          onClick={() => onNavigate('pull')}
        />
        <StatCard
          title="In Repair"
          value={stats.repairItems.toString()}
          icon={<AlertTriangle size={14} />}
          subtitle={stats.repairItems > 0 ? 'needs attention' : 'all healthy'}
          trend={stats.repairItems > 0 ? 'down' : 'flat'}
          onClick={() => onNavigate('inventory')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Saturation by department */}
        <div className="rounded-lg border border-[#c7bcae] bg-[#f4f0e8] p-5 sm:p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-[10px] font-black text-[#2b2925] uppercase tracking-widest">Inventory by category</h3>
              <p className="mt-0.5 text-[9px] uppercase tracking-widest text-[#8a8174]">Live unit counts</p>
            </div>
            <button
              onClick={() => onNavigate('analytics')}
              className="text-[9px] font-bold text-cyan-300 hover:text-cyan-200 uppercase tracking-widest transition-colors flex items-center gap-1.5"
            >
              Full analytics <ChevronRight size={12} />
            </button>
          </div>

          {byDept.every(d => d.count === 0) ? (
            <p className="py-8 text-center text-[10px] font-bold uppercase tracking-widest text-[#8a8174]">
              No inventory yet — head to {settings.itemLabel}s to start adding.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              {byDept.map(({ dept, count, pct }) => {
                const Icon = getIcon(dept.icon);
                return (
                  <div key={dept.id} className="space-y-1.5">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon size={11} style={{ color: dept.color }} className="shrink-0" />
                        <span className="text-[9px] font-bold text-[#6c655c] uppercase tracking-widest truncate">{dept.label}</span>
                      </div>
                      <span className="text-sm font-black text-[#232321] tracking-tighter leading-none tabular-nums shrink-0">{count}</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-[#ded8cf]">
                      <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: dept.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Utilisation gauge */}
        <div className="flex flex-col rounded-lg border border-[#c7bcae] bg-[#f4f0e8] p-5 sm:p-6">
          <h3 className="text-[10px] font-black text-[#2b2925] uppercase tracking-widest mb-4">Rack utilisation</h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#ded8cf" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="44" fill="none"
                  stroke="#45a3b8" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 44}
                  strokeDashoffset={2 * Math.PI * 44 * (1 - stats.rackUtilisation / 100)}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-[#232321] tracking-tighter leading-none">{stats.rackUtilisation}%</span>
                <span className="mt-1 text-[8px] font-black uppercase tracking-widest text-[#8a8174]">{stats.rackCount} racks</span>
              </div>
            </div>
            <p className="mt-4 text-center text-[9px] font-bold uppercase tracking-widest leading-relaxed text-[#8a8174]">
              {stats.rackUtilisation > 80 ? 'Near capacity — review layout' :
               stats.rackUtilisation > 50 ? 'Healthy occupancy' :
               'Lots of room to grow'}
            </p>
          </div>
        </div>
      </div>

      {/* AI / heuristic insights */}
      <div className="rounded-lg border border-[#c7bcae] bg-[#f4f0e8] p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-cyan-300" />
            <h3 className="text-[10px] font-black text-[#2b2925] uppercase tracking-widest">
              {insightSource === 'AI' ? 'AI Insights' : 'Auto Insights'}
            </h3>
            {insightSource === 'AI' && (
              <span className="text-[8px] font-black text-cyan-300 uppercase tracking-widest bg-cyan-700/10 border border-cyan-700/30 px-2 py-0.5 rounded">
                Powered by Gemini
              </span>
            )}
          </div>
          <button
            onClick={refreshInsights}
            disabled={insightsLoading}
            className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#8a8174] transition-colors hover:text-[#2b2925] disabled:opacity-50"
          >
            {insightsLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Refresh
          </button>
        </div>
        <div className="space-y-2">
          {insights.map((ins, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded border ${
              ins.level === 'CRITICAL' ? 'bg-red-500/5 border-red-500/30' :
              ins.level === 'WARN' ? 'bg-orange-500/5 border-orange-500/30' :
              'bg-blue-500/5 border-blue-500/20'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                ins.level === 'CRITICAL' ? 'bg-red-500' :
                ins.level === 'WARN' ? 'bg-orange-500' : 'bg-blue-500'
              }`} />
              <p className="text-[11px] leading-relaxed text-[#4e4a44]">{ins.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: 'up' | 'down' | 'flat';
  onClick?: () => void;
}> = ({ title, value, icon, subtitle, trend, onClick }) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    className={`group rounded border border-[#c7bcae] bg-[#f4f0e8] p-4 text-left transition-all ${
      onClick ? 'hover:border-cyan-700/40 cursor-pointer' : 'cursor-default'
    }`}
  >
    <div className="flex justify-between items-start mb-3">
      <div className="rounded border border-[#cfc5b8] bg-[#fbf8f2] p-1.5 text-cyan-700 transition-all group-hover:bg-cyan-700 group-hover:text-white">{icon}</div>
      {trend === 'up' && <ArrowUpRight size={12} className="text-green-500" />}
      {trend === 'down' && <ArrowDownRight size={12} className="text-red-500" />}
    </div>
    <h4 className="text-[8px] font-black uppercase tracking-widest text-stone-500">{title}</h4>
    <p className="mt-1.5 text-xl font-black leading-none tracking-tighter text-[#232321]">{value}</p>
    {subtitle && <p className="mt-1.5 text-[8px] font-bold uppercase tracking-widest text-stone-600">{subtitle}</p>}
  </button>
);

const PrimaryAction: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string }> = ({ onClick, icon, label }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 rounded bg-cyan-700 px-4 py-2.5 font-black text-[10px] uppercase tracking-widest text-white shadow-lg transition-all hover:bg-cyan-600 active:scale-95"
  >
    {icon} {label}
  </button>
);

export default Dashboard;
