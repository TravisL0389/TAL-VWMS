import React, { useState, useMemo, useEffect } from 'react';
import {
  Package, ChevronRight, Navigation, ArrowRight, Zap, ClipboardList,
  Plus, X, Check, Sparkles, Loader2, AlertTriangle, CheckCircle2,
  MapPin, Clock, Hash, RefreshCw, Trash2, Edit3, Box,
} from 'lucide-react';
import type {
  DepartmentDef, InventoryItem, Order, OrderLine, OrderStatus, PullPlan, Rack, AppSettings,
} from '../types';
import { getDepartmentMeta, getIcon } from '../constants';
import { shortId } from '../utils/storage';
import { buildAIPlan, buildHeuristicPlan, isAIConfigured } from '../utils/aiService';

interface SmartPullSystemProps {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  racks: Rack[];
  departments: DepartmentDef[];
  warehouseId: string;
  settings: AppSettings;
  onNotify: (n: { type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'AI'; title: string; message: string }) => void;
}

const SmartPullSystem: React.FC<SmartPullSystemProps> = ({
  inventory, setInventory, orders, setOrders, racks, departments, warehouseId, settings, onNotify,
}) => {
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [plan, setPlan] = useState<PullPlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pulledIds, setPulledIds] = useState<Set<string>>(new Set());

  const activeOrder = useMemo(() => orders.find(o => o.id === activeOrderId) || null, [orders, activeOrderId]);

  const aiAvailable = isAIConfigured() && settings.enableAI;

  // Reset state when active order changes
  useEffect(() => {
    setPlan(null);
    setPulledIds(new Set());
    setPulling(false);
  }, [activeOrderId]);

  const generatePlan = async () => {
    if (!activeOrder) return;
    setPlanning(true);
    try {
      const result = aiAvailable
        ? await buildAIPlan({ order: activeOrder, inventory, racks })
        : buildHeuristicPlan({ order: activeOrder, inventory, racks });
      setPlan(result);
      onNotify({
        type: result.generatedBy === 'AI' ? 'AI' : 'INFO',
        title: result.generatedBy === 'AI' ? 'AI plan ready' : 'Plan ready',
        message: `${result.steps.length} stops · ~${formatTime(result.totalEstimatedSeconds)}`,
      });
    } catch (err) {
      onNotify({ type: 'ERROR', title: 'Planning failed', message: String(err) });
    } finally {
      setPlanning(false);
    }
  };

  const startPull = () => {
    if (!plan || !activeOrder) return;
    setPulling(true);
    setOrders(prev => prev.map(o => o.id === activeOrder.id ? { ...o, status: 'PULLING' } : o));
  };

  const togglePulled = (itemId: string) => {
    setPulledIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const completePull = () => {
    if (!plan || !activeOrder) return;
    // Decrement available counts on inventory for items we marked pulled
    setInventory(prev => prev.map(i => {
      if (pulledIds.has(i.id)) {
        const line = activeOrder.lines.find(l => l.itemId === i.id || l.sku === i.sku);
        if (line) return { ...i, available: Math.max(0, i.available - line.quantity) };
      }
      return i;
    }));
    // Update order status & pull counts
    setOrders(prev => prev.map(o => {
      if (o.id !== activeOrder.id) return o;
      return {
        ...o,
        status: 'PACKED',
        lines: o.lines.map(l => pulledIds.has(l.itemId) ? { ...l, pulled: l.quantity } : l),
      };
    }));
    onNotify({ type: 'SUCCESS', title: 'Pull complete', message: `${activeOrder.reference} packed successfully.` });
    setPulling(false);
    setPulledIds(new Set());
    setPlan(null);
  };

  const handleSaveOrder = (order: Order) => {
    if (order.lines.length === 0) {
      onNotify({ type: 'ERROR', title: 'Empty order', message: 'Add at least one line item.' });
      return;
    }
    const exists = orders.find(o => o.id === order.id);
    setOrders(prev => exists ? prev.map(o => o.id === order.id ? order : o) : [order, ...prev]);
    onNotify({ type: 'SUCCESS', title: 'Saved', message: `Order ${order.reference} saved.` });
    setEditingOrder(null);
    setCreatingOrder(false);
    setActiveOrderId(order.id);
  };

  const handleDeleteOrder = (id: string) => {
    const o = orders.find(x => x.id === id);
    if (!o) return;
    if (!confirm(`Delete ${o.reference}?`)) return;
    setOrders(prev => prev.filter(x => x.id !== id));
    if (activeOrderId === id) setActiveOrderId(null);
    onNotify({ type: 'INFO', title: 'Deleted', message: `Order ${o.reference} removed.` });
  };

  const startCreate = () => {
    if (inventory.length === 0) {
      onNotify({ type: 'WARNING', title: 'No inventory', message: 'Add inventory before creating orders.' });
      return;
    }
    setCreatingOrder(true);
    setEditingOrder({
      id: shortId('order'),
      reference: `ORD-${1000 + orders.length + 1}`,
      client: '',
      project: '',
      warehouseId,
      status: 'PENDING',
      priority: 'NORMAL',
      lines: [],
      createdAt: Date.now(),
    });
  };

  return (
    <div className="flex h-full min-w-0 flex-col gap-4 px-4 pb-6 pt-4 sm:px-6 sm:pt-5 lg:px-7">
      <header className="flex flex-col gap-3 border-b border-[#c7bcae] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#232321] tracking-tighter uppercase leading-none">
            Smart Pull
          </h2>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.3em] text-[#8a8174] sm:text-[10px]">
            AI-optimised order picking
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className={`flex items-center gap-2 rounded px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border ${
            aiAvailable
              ? 'bg-cyan-700/10 border-cyan-700/30 text-cyan-300'
              : 'bg-[#ece6dd] border-[#c7bcae] text-[#8a8174]'
          }`}>
            <Sparkles size={11} className={aiAvailable ? 'animate-pulse' : ''} /> {aiAvailable ? 'AI Ready' : 'Heuristic Mode'}
          </span>
          <button
            onClick={startCreate}
            className="flex items-center gap-2 rounded bg-cyan-700 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-cyan-600 active:scale-95"
          >
            <Plus size={11} /> New Order
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* Order queue */}
        <div className="flex min-w-0 flex-col gap-2 xl:overflow-y-auto xl:pr-1 xl:max-h-full custom-scrollbar">
          <h3 className="px-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#8a8174]">
            Queue ({orders.length})
          </h3>
          {orders.length === 0 ? (
            <div className="rounded border border-[#c7bcae] bg-[#f4f0e8] p-6 text-center">
              <ClipboardList size={24} className="text-slate-700 mx-auto mb-3" />
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#8a8174]">No orders</p>
              <button
                onClick={startCreate}
                className="text-[9px] font-bold text-cyan-300 hover:text-cyan-200 uppercase tracking-widest transition-colors"
              >
                Create one →
              </button>
            </div>
          ) : (
            orders.map(order => (
              <button
                key={order.id}
                onClick={() => setActiveOrderId(order.id)}
                className={`text-left p-4 rounded border transition-all group ${
                  activeOrderId === order.id
                    ? 'border-cyan-700 bg-cyan-700 text-white shadow-lg'
                    : 'bg-[#f4f0e8] border-[#c7bcae] text-[#5d564d] hover:border-[#9f9487]'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest ${
                    activeOrderId === order.id ? 'bg-white/20 text-white' : 'bg-[#ebe4da] text-[#8a8174]'
                  }`}>
                    {order.status}
                  </span>
                  <span className={`text-[8px] font-bold ${activeOrderId === order.id ? 'text-white/60' : 'text-[#9d9387]'}`}>
                    {order.reference}
                  </span>
                </div>
                <h4 className="font-black text-sm leading-tight tracking-tight uppercase truncate">
                  {order.project || 'Untitled order'}
                </h4>
                <p className={`text-[8px] font-bold uppercase tracking-widest mt-1 truncate ${
                  activeOrderId === order.id ? 'text-white/70' : 'text-[#8a8174]'
                }`}>
                  {order.client || '—'} · {order.lines.length} line{order.lines.length === 1 ? '' : 's'}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Workflow */}
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-[#c7bcae] bg-[#f4f0e8] shadow-xl">
          {!activeOrder ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <Package size={32} className="text-slate-800 mb-3" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8174]">
                {orders.length === 0 ? 'Create an order to get started' : 'Select an order from the queue'}
              </p>
            </div>
          ) : (
            <>
              {/* Order header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#c7bcae] bg-[#ece6dd] p-4 sm:p-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-[#cec3b5] bg-[#fbf8f2] text-cyan-700">
                    <Navigation size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-[#232321] text-base sm:text-lg tracking-tight leading-none truncate">
                      {activeOrder.project || activeOrder.reference}
                    </h3>
                    <div className="mt-1.5 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-[#8a8174]">
                      <span>{activeOrder.reference}</span>
                      <span>·</span>
                      <span>{activeOrder.client || '—'}</span>
                      <span>·</span>
                      <span className={`px-1.5 py-0.5 rounded ${
                        activeOrder.priority === 'URGENT' ? 'bg-red-600 text-white' :
                        activeOrder.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-500' :
                        'bg-[#ebe4da] border border-[#c7bcae]'
                      }`}>{activeOrder.priority}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditingOrder(activeOrder)}
                    className="rounded p-2 text-[#8a8174] transition-all hover:bg-[#e5ddd1] hover:text-[#232321]"
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteOrder(activeOrder.id)}
                    className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/5 rounded transition-all"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5">
                {!plan ? (
                  <div className="space-y-4">
                    {/* Order lines preview */}
                    <div>
                      <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-[#8a8174]">
                        Lines ({activeOrder.lines.length})
                      </p>
                      <div className="space-y-2">
                        {activeOrder.lines.map(line => {
                          const item = inventory.find(i => i.id === line.itemId);
                          const dept = item ? getDepartmentMeta(item.departmentId, departments) : null;
                          const Icon = dept ? getIcon(dept.icon) : Box;
                          const lowStock = item && item.available < line.quantity;
                          return (
                            <div key={line.itemId} className="flex items-center gap-3 rounded border border-[#c7bcae] bg-[#fbf8f2] p-3 transition-all hover:border-cyan-700/30">
                              <div className="w-9 h-9 rounded flex items-center justify-center shrink-0" style={{
                                backgroundColor: dept ? `${dept.color}18` : '#ece6dd',
                                border: `1px solid ${dept ? dept.color + '35' : '#c7bcae'}`
                              }}>
                                <Icon size={14} style={{ color: dept?.color || '#64748b' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="font-black text-xs text-[#232321] uppercase tracking-tight leading-none truncate">{line.name}</h5>
                                <p className="mt-1.5 text-[8px] font-bold uppercase tracking-widest text-[#8a8174]">
                                  {line.sku}{item?.rackId ? ` · ${item.rackId}` : ''}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-base font-black text-[#232321] tabular-nums leading-none">{line.quantity}</p>
                                {lowStock && (
                                  <p className="text-[8px] font-bold text-orange-500 uppercase tracking-widest mt-1">
                                    only {item.available} avail
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Generate plan button */}
                    <button
                      onClick={generatePlan}
                      disabled={planning || activeOrder.lines.length === 0}
                      className="flex w-full items-center justify-center gap-2 rounded bg-cyan-700 py-3.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-cyan-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {planning ? (
                        <><Loader2 size={14} className="animate-spin" /> Generating plan…</>
                      ) : (
                        <><Sparkles size={14} /> {aiAvailable ? 'Generate AI plan' : 'Generate route plan'}</>
                      )}
                    </button>
                    {!aiAvailable && (
                      <p className="text-center text-[9px] leading-relaxed text-[#8a8174]">
                        Set <code className="rounded bg-[#ebe4da] px-1 py-0.5 text-[#5d564d]">GEMINI_API_KEY</code> in your env to enable AI optimisation.
                      </p>
                    )}
                  </div>
                ) : (
                  <PlanView
                    plan={plan}
                    pulling={pulling}
                    pulledIds={pulledIds}
                    onTogglePulled={togglePulled}
                    onStartPull={startPull}
                    onComplete={completePull}
                    onRegenerate={generatePlan}
                    aiAvailable={aiAvailable}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Order editor */}
      {editingOrder && (
        <OrderEditor
          order={editingOrder}
          inventory={inventory}
          departments={departments}
          isNew={creatingOrder}
          onSave={handleSaveOrder}
          onCancel={() => { setEditingOrder(null); setCreatingOrder(false); }}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Plan view — shows steps, allows checking off, completing
// ---------------------------------------------------------------------------
const PlanView: React.FC<{
  plan: PullPlan;
  pulling: boolean;
  pulledIds: Set<string>;
  onTogglePulled: (id: string) => void;
  onStartPull: () => void;
  onComplete: () => void;
  onRegenerate: () => void;
  aiAvailable: boolean;
}> = ({ plan, pulling, pulledIds, onTogglePulled, onStartPull, onComplete, onRegenerate, aiAvailable }) => {
  const allPulled = plan.steps.length > 0 && plan.steps.every(s => pulledIds.has(s.itemId));
  return (
    <div className="space-y-4">
      <div className="rounded border border-[#c7bcae] bg-[#fbf8f2] p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-2 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${
              plan.generatedBy === 'AI'
                ? 'bg-cyan-700/10 border-cyan-700/30 text-cyan-300'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
            }`}>
              <Sparkles size={10} /> {plan.generatedBy === 'AI' ? 'AI Optimised' : 'Heuristic Route'}
            </span>
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-[#8a8174] transition-colors hover:text-[#232321]"
            >
              <RefreshCw size={10} /> Regenerate
            </button>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-[#8a8174]">
            <span className="flex items-center gap-1.5"><Hash size={10} /> {plan.steps.length} stops</span>
            <span className="flex items-center gap-1.5"><Clock size={10} /> ~{formatTime(plan.totalEstimatedSeconds)}</span>
          </div>
        </div>
        {plan.notes && (
          <p className="text-[10px] leading-relaxed text-[#5d564d]">{plan.notes}</p>
        )}
        {plan.warnings.length > 0 && (
          <div className="mt-3 space-y-1">
            {plan.warnings.map((w, i) => (
              <p key={i} className="flex items-start gap-2 text-[9px] text-orange-400 leading-relaxed">
                <AlertTriangle size={10} className="mt-0.5 shrink-0" /> {w}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Steps */}
      <ol className="space-y-2">
        {plan.steps.map((step, idx) => {
          const done = pulledIds.has(step.itemId);
          return (
            <li
              key={`${step.itemId}-${idx}`}
              className={`p-3 rounded border flex items-center gap-3 transition-all ${
                done
                  ? 'bg-green-500/5 border-green-500/30 opacity-60'
                  : 'border-[#c7bcae] bg-[#fbf8f2] hover:border-cyan-700/30'
              }`}
            >
              <button
                onClick={() => pulling && onTogglePulled(step.itemId)}
                disabled={!pulling}
                className={`w-9 h-9 rounded flex items-center justify-center font-black text-xs shrink-0 transition-all ${
                  done
                    ? 'bg-green-600 text-white'
                    : pulling
                      ? 'cursor-pointer border-2 border-[#b0a395] bg-[#ece6dd] text-[#8a8174] hover:border-cyan-700'
                      : 'border border-[#c7bcae] bg-[#ece6dd] text-[#232321]'
                }`}
              >
                {done ? <Check size={14} /> : idx + 1}
              </button>
              <div className="flex-1 min-w-0">
                <h5 className={`font-black text-xs uppercase tracking-tight leading-none truncate ${done ? 'text-[#9d9387] line-through' : 'text-[#232321]'}`}>
                  {step.itemName}
                </h5>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-[#8a8174]">
                  {step.sku}
                </p>
                {step.reasoning && !done && (
                  <p className="mt-1 text-[9px] italic leading-snug text-[#8a8174]">
                    {step.reasoning}
                  </p>
                )}
                {step.warning && (
                  <p className="text-[9px] text-orange-400 mt-1 leading-snug flex items-center gap-1">
                    <AlertTriangle size={9} /> {step.warning}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-center hidden sm:block">
                  <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Loc</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] font-black text-[#232321]">
                    <MapPin size={9} className="text-cyan-400" /> {step.rackName}
                  </p>
                  {step.shelf && (
                    <p className="mt-0.5 text-[8px] text-[#8a8174]">s{step.shelf}{step.position ? '·' + step.position[0] : ''}</p>
                  )}
                </div>
                <div className="border-l border-[#4d3d33] pl-3 text-center">
                  <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Qty</p>
                  <p className="mt-0.5 text-base font-black leading-none tabular-nums text-[#232321]">{step.quantity}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap gap-2">
        {!pulling ? (
          <button
            onClick={onStartPull}
            className="flex flex-1 items-center justify-center gap-2 rounded bg-white py-3 text-[10px] font-black uppercase tracking-widest text-black shadow-lg transition-all hover:bg-cyan-700 hover:text-white active:scale-95"
          >
            Start picking <ArrowRight size={12} />
          </button>
        ) : (
          <>
            <p className="flex flex-1 items-center justify-center text-[9px] font-bold uppercase tracking-widest text-[#8a8174]">
              {pulledIds.size} of {plan.steps.length} pulled
            </p>
            <button
              onClick={onComplete}
              disabled={!allPulled}
              className="px-5 py-3 bg-green-600 text-white rounded font-black text-[10px] uppercase tracking-widest hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={12} /> Complete pull
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Order editor modal
// ---------------------------------------------------------------------------
const OrderEditor: React.FC<{
  order: Order;
  inventory: InventoryItem[];
  departments: DepartmentDef[];
  isNew: boolean;
  onSave: (o: Order) => void;
  onCancel: () => void;
}> = ({ order, inventory, departments, isNew, onSave, onCancel }) => {
  const [draft, setDraft] = useState<Order>(order);
  const [search, setSearch] = useState('');

  const upd = <K extends keyof Order>(k: K, v: Order[K]) => setDraft(d => ({ ...d, [k]: v }));

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    return inventory.filter(i =>
      !draft.lines.find(l => l.itemId === i.id) &&
      (!q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
    ).slice(0, 30);
  }, [inventory, draft.lines, search]);

  const addLine = (item: InventoryItem) => {
    setDraft(d => ({
      ...d,
      lines: [...d.lines, { itemId: item.id, sku: item.sku, name: item.name, quantity: 1, pulled: 0 }],
    }));
    setSearch('');
  };

  const updateLine = (idx: number, qty: number) => {
    setDraft(d => ({
      ...d,
      lines: d.lines.map((l, i) => i === idx ? { ...l, quantity: Math.max(1, qty) } : l),
    }));
  };

  const removeLine = (idx: number) => {
    setDraft(d => ({ ...d, lines: d.lines.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-2xl bg-[#0f1113] border border-[#2a2d31] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        <div className="px-5 py-4 border-b border-[#1a1c1e] bg-[#111315] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList size={16} className="text-red-600" />
            <h3 className="text-sm font-black text-white uppercase tracking-tight">{isNew ? 'New order' : 'Edit order'}</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-white/5 rounded text-slate-500 transition-all"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Reference *">
              <input type="text" value={draft.reference} onChange={(e) => upd('reference', e.target.value)} className="input-field" />
            </Field>
            <Field label="Priority">
              <select value={draft.priority} onChange={(e) => upd('priority', e.target.value as any)} className="input-field cursor-pointer">
                <option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
              </select>
            </Field>
            <Field label="Project">
              <input type="text" value={draft.project || ''} onChange={(e) => upd('project', e.target.value)} placeholder="Optional" className="input-field" />
            </Field>
            <Field label="Client">
              <input type="text" value={draft.client || ''} onChange={(e) => upd('client', e.target.value)} placeholder="Optional" className="input-field" />
            </Field>
          </div>

          {/* Lines */}
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Lines ({draft.lines.length})</p>
            {draft.lines.length === 0 ? (
              <p className="text-[10px] text-slate-700 italic mb-3">No lines yet. Add items below.</p>
            ) : (
              <div className="space-y-1.5 mb-3">
                {draft.lines.map((line, idx) => (
                  <div key={`${line.itemId}-${idx}`} className="flex items-center gap-2 bg-[#16181a] border border-[#2a2d31] rounded p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-white truncate">{line.name}</p>
                      <p className="text-[9px] text-slate-600 font-mono">{line.sku}</p>
                    </div>
                    <input
                      type="number" min={1} value={line.quantity}
                      onChange={(e) => updateLine(idx, parseInt(e.target.value) || 1)}
                      className="w-16 bg-[#0a0b0c] border border-[#2a2d31] rounded text-white text-xs px-2 py-1.5 text-center focus:outline-none focus:border-red-600"
                    />
                    <button onClick={() => removeLine(idx)} className="p-1.5 text-slate-600 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add picker */}
            <div className="bg-[#0a0b0c] border border-[#2a2d31] rounded">
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${inventory.length} items to add…`}
                className="w-full bg-transparent border-0 px-3 py-2 text-xs text-white focus:outline-none placeholder:text-slate-700"
              />
              {search && (
                <div className="border-t border-[#2a2d31] max-h-48 overflow-y-auto custom-scrollbar">
                  {filteredItems.length === 0 ? (
                    <p className="text-[10px] text-slate-700 italic p-3 text-center">No matches.</p>
                  ) : filteredItems.map(item => {
                    const dept = getDepartmentMeta(item.departmentId, departments);
                    const Icon = getIcon(dept.icon);
                    return (
                      <button
                        key={item.id}
                        onClick={() => addLine(item)}
                        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-white/5 transition-colors border-b border-[#1a1c1e] last:border-0 text-left"
                      >
                        <Icon size={11} style={{ color: dept.color }} className="shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-white truncate">{item.name}</p>
                          <p className="text-[9px] text-slate-600 font-mono">{item.sku} · {item.available} avail</p>
                        </div>
                        <Plus size={12} className="text-red-500 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#2d2f31] bg-[#111315] flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-slate-500 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors">Cancel</button>
          <button
            onClick={() => onSave(draft)}
            className="px-5 py-2 bg-red-600 text-white rounded text-[10px] font-black uppercase tracking-widest hover:bg-red-700 active:scale-95 transition-all flex items-center gap-1.5 shadow-lg"
          >
            <Check size={12} /> Save order
          </button>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
    {children}
  </div>
);

// Helper used by Field children — define as part of CSS / className shortcut.
// We can't actually @apply since we use Tailwind CDN, so the class name is duplicated as needed.
// Instead, define a class directly via the tailwind theme.
// (A small inline style helper is fine here.)

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s ? s + 's' : ''}`.trim();
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default SmartPullSystem;
