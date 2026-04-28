import React, { useMemo, useState } from 'react';
import {
  Search, Plus, Filter, Download, Upload, MoreVertical, Package, X, Edit3,
  Trash2, Save, AlertCircle, CheckCircle2, Box, MapPin,
} from 'lucide-react';
import type { DepartmentDef, InventoryItem, ItemStatus, Rack, AppSettings } from '../types';
import { getDepartmentMeta, getIcon } from '../constants';
import { shortId, downloadFile, toCSV } from '../utils/storage';

interface InventoryManagerProps {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  departments: DepartmentDef[];
  racks: Rack[];
  warehouseId: string;
  settings: AppSettings;
  onNotify: (n: { type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'; title: string; message: string }) => void;
}

const STATUS_OPTIONS: ItemStatus[] = ['AVAILABLE', 'IN_USE', 'REPAIR', 'RETIRED'];

const InventoryManager: React.FC<InventoryManagerProps> = ({
  inventory, setInventory, departments, racks, warehouseId, settings, onNotify,
}) => {
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<ItemStatus | 'ALL'>('ALL');
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const filtered = useMemo(() => {
    return inventory.filter(i => {
      if (filterDept !== 'ALL' && i.departmentId !== filterDept) return false;
      if (filterStatus !== 'ALL' && i.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !i.name.toLowerCase().includes(q) &&
          !i.sku.toLowerCase().includes(q) &&
          !(i.barcode || '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [inventory, search, filterDept, filterStatus]);

  const handleSave = (item: InventoryItem) => {
    if (!item.name.trim() || !item.sku.trim()) {
      onNotify({ type: 'ERROR', title: 'Missing fields', message: 'Name and SKU are required.' });
      return;
    }
    setInventory(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => (i.id === item.id ? { ...item, lastUpdated: Date.now() } : i));
      return [...prev, { ...item, lastUpdated: Date.now() }];
    });
    onNotify({ type: 'SUCCESS', title: 'Saved', message: `"${item.name}" updated.` });
    setEditing(null);
    setCreatingNew(false);
  };

  const handleDelete = (id: string) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setInventory(prev => prev.filter(i => i.id !== id));
    onNotify({ type: 'INFO', title: 'Deleted', message: `Removed "${item.name}".` });
    if (editing?.id === id) setEditing(null);
  };

  const startCreate = () => {
    setCreatingNew(true);
    setEditing({
      id: shortId('item'),
      name: '',
      sku: '',
      barcode: '',
      rfid: '',
      departmentId: departments[0]?.id || 'unknown',
      warehouseId,
      rackId: undefined,
      shelf: 1,
      position: 'FRONT',
      quantity: 1,
      available: 1,
      status: 'AVAILABLE',
      notes: '',
      lastUpdated: Date.now(),
    });
  };

  const handleExport = () => {
    if (inventory.length === 0) {
      onNotify({ type: 'INFO', title: 'No data', message: 'Inventory is empty — nothing to export.' });
      return;
    }
    const rows = inventory.map(i => ({
      sku: i.sku,
      name: i.name,
      barcode: i.barcode || '',
      department: getDepartmentMeta(i.departmentId, departments).label,
      rack: i.rackId || '',
      shelf: i.shelf || '',
      position: i.position || '',
      quantity: i.quantity,
      available: i.available,
      status: i.status,
    }));
    const csv = toCSV(rows);
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(`inventory-${warehouseId}-${date}.csv`, csv, 'text/csv');
    onNotify({ type: 'SUCCESS', title: 'Exported', message: `Saved ${rows.length} rows to CSV.` });
  };

  const handleImport = () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.csv,text/csv';
    inp.onchange = async () => {
      const file = inp.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) throw new Error('CSV is empty');
        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        const idx = (k: string) => header.indexOf(k);
        const imported: InventoryItem[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i]);
          const sku = cols[idx('sku')] || '';
          const name = cols[idx('name')] || '';
          if (!sku || !name) continue;
          const deptLabel = cols[idx('department')] || '';
          const dept = departments.find(d => d.label.toLowerCase() === deptLabel.toLowerCase()) || departments[0];
          imported.push({
            id: shortId('item'),
            sku,
            name,
            barcode: cols[idx('barcode')] || '',
            rfid: '',
            departmentId: dept.id,
            warehouseId,
            rackId: cols[idx('rack')] || undefined,
            shelf: parseInt(cols[idx('shelf')] || '1') || 1,
            position: (cols[idx('position')] === 'BACK' ? 'BACK' : 'FRONT'),
            quantity: parseInt(cols[idx('quantity')] || '0') || 0,
            available: parseInt(cols[idx('available')] || '0') || 0,
            status: (STATUS_OPTIONS as string[]).includes(cols[idx('status')]) ? (cols[idx('status')] as ItemStatus) : 'AVAILABLE',
            lastUpdated: Date.now(),
          });
        }
        setInventory(prev => [...prev, ...imported]);
        onNotify({ type: 'SUCCESS', title: 'Imported', message: `Added ${imported.length} items.` });
      } catch (err) {
        onNotify({ type: 'ERROR', title: 'Import failed', message: String(err) });
      }
    };
    inp.click();
  };

  return (
    <div className="app-page app-page-wide space-y-4">
      <header className="flex flex-col gap-3 border-b border-[#b6aa9b] pb-4 min-[769px]:flex-row min-[769px]:items-end min-[769px]:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#232321] tracking-tighter uppercase leading-none">
            {settings.itemLabel}s
          </h2>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.3em] text-[#7d7569] sm:text-[10px]">
            {filtered.length} of {inventory.length} {settings.itemLabel.toLowerCase()}{inventory.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 max-[480px]:grid max-[480px]:grid-cols-1">
          <button
            onClick={handleImport}
            className="flex items-center gap-2 rounded border border-[#b6aa9b] bg-[#ede6dc] px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-[#5d564d] transition-all hover:border-[#5d7f81] hover:bg-[#f1ebe2] hover:text-[#232321]"
          >
            <Upload size={12} /> Import
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded border border-[#c7bcae] bg-[#f4f0e8] px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-[#5d564d] transition-all hover:border-[#5d7f81] hover:bg-[#fbf8f2] hover:text-[#232321]"
          >
            <Download size={12} /> Export
          </button>
          <button
            onClick={startCreate}
            className="flex items-center gap-2 rounded bg-[#5d7f81] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-[#4f7172] active:scale-95"
          >
            <Plus size={12} /> Add {settings.itemLabel.toLowerCase()}
          </button>
        </div>
      </header>

      <div className="flex flex-col overflow-hidden rounded-lg border border-[#b6aa9b] bg-[#ede6dc] shadow-xl">
        {/* Filter bar */}
        <div className="grid grid-cols-1 items-center gap-2 border-b border-[#b6aa9b] bg-[#ddd5c8] px-4 py-3 min-[481px]:grid-cols-2 min-[1025px]:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:px-6">
          <div className="group relative min-w-0 min-[481px]:col-span-2 min-[1025px]:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#948b7d] transition-colors group-focus-within:text-[#5d7f81]" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, SKU, barcode…"
              className="w-full rounded border border-[#b6aa9b] bg-[#f1ebe2] py-1.5 pl-9 pr-3 text-[11px] font-medium text-[#232321] transition-all placeholder:text-[#8b8378] focus:border-[#5d7f81] focus:outline-none"
            />
          </div>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="cursor-pointer rounded border border-[#b6aa9b] bg-[#f1ebe2] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#232321] focus:border-[#5d7f81] focus:outline-none"
          >
            <option value="ALL">All categories</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="cursor-pointer rounded border border-[#c7bcae] bg-[#fbf8f2] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#232321] focus:border-[#5d7f81] focus:outline-none"
          >
            <option value="ALL">All status</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          {(search || filterDept !== 'ALL' || filterStatus !== 'ALL') && (
            <button
              onClick={() => { setSearch(''); setFilterDept('ALL'); setFilterStatus('ALL'); }}
              className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest text-[#7d7569] transition-colors hover:text-[#232321]"
            >
              Clear
            </button>
          )}
        </div>

        {/* Table — scrolls horizontally on mobile */}
        <div className="app-scroll-x">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={32} className="mx-auto mb-4 text-[#8a8174]" />
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#8a8174]">
                {inventory.length === 0 ? 'No inventory yet' : 'No matches'}
              </p>
              <p className="mb-4 text-[10px] text-[#5d564d]">
                {inventory.length === 0
                  ? `Add your first ${settings.itemLabel.toLowerCase()} or import a CSV.`
                  : 'Try changing your filters.'}
              </p>
              {inventory.length === 0 && (
                <button
                  onClick={startCreate}
                  className="inline-flex items-center gap-2 rounded bg-[#5d7f81] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-[#4f7172]"
                >
                  <Plus size={12} /> Add first item
                </button>
              )}
            </div>
          ) : (
            <table className="w-full min-w-[44rem] border-collapse">
              <thead>
                <tr className="border-b border-[#b6aa9b] bg-[#ddd5c8]">
                  <Th>Item</Th>
                  <Th>Category</Th>
                  <Th>Location</Th>
                  <Th align="center">Qty</Th>
                  <Th align="center">Available</Th>
                  <Th align="right">Status</Th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cfc4b6]">
                {filtered.map(item => {
                  const dept = getDepartmentMeta(item.departmentId, departments);
                  const Icon = getIcon(dept.icon);
                  const lowStock = item.available > 0 && item.available <= Math.max(2, Math.floor(item.quantity * 0.15));
                  const oos = item.available === 0;
                  return (
                    <tr
                      key={item.id}
                      className="group cursor-pointer transition-colors hover:bg-[#e1d9cd]"
                      onClick={() => setEditing(item)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${dept.color}20`, border: `1px solid ${dept.color}40` }}>
                            <Icon size={13} style={{ color: dept.color }} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-black uppercase tracking-tight text-[#232321]">{item.name}</p>
                            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-[#7d7569]">{item.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: dept.color }}>
                          {dept.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.rackId ? (
                          <div className="flex items-center gap-1.5 text-[#6e665c]">
                            <MapPin size={11} className="text-[#5d7f81]" />
                            <span className="text-[10px] font-black uppercase">{item.rackId}</span>
                            {item.shelf && <span className="text-[9px] text-[#948b7d]">· s{item.shelf}{item.position ? '·' + item.position[0] : ''}</span>}
                          </div>
                        ) : (
                          <span className="text-[9px] italic text-[#8b8378]">unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <p className="text-sm font-black tabular-nums text-[#232321]">{item.quantity}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <p className={`text-sm font-black tabular-nums ${oos ? 'text-red-500' : lowStock ? 'text-orange-500' : 'text-[#232321]'}`}>
                          {item.available}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                          item.status === 'AVAILABLE' ? 'bg-green-500/10 text-green-500 border border-green-500/30' :
                          item.status === 'IN_USE' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30' :
                          item.status === 'REPAIR' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/30' :
                          'bg-slate-500/10 text-slate-500 border border-slate-500/30'
                        }`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditing(item); }}
                          className="p-1.5 text-[#8a8174] transition-colors hover:text-[#232321]"
                          title="Edit"
                        >
                          <Edit3 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit drawer */}
      {editing && (
        <ItemEditor
          item={editing}
          departments={departments}
          racks={racks}
          isNew={creatingNew}
          onSave={handleSave}
          onCancel={() => { setEditing(null); setCreatingNew(false); }}
          onDelete={() => handleDelete(editing.id)}
        />
      )}
    </div>
  );
};

const Th: React.FC<{ children: React.ReactNode; align?: 'left' | 'center' | 'right' }> = ({ children, align = 'left' }) => (
  <th className={`px-4 py-3 text-${align} text-[8px] font-black uppercase tracking-[0.2em] text-[#7d7569]`}>
    {children}
  </th>
);

// ---------------------------------------------------------------------------
// Item editor drawer
// ---------------------------------------------------------------------------
const ItemEditor: React.FC<{
  item: InventoryItem;
  departments: DepartmentDef[];
  racks: Rack[];
  isNew: boolean;
  onSave: (item: InventoryItem) => void;
  onCancel: () => void;
  onDelete: () => void;
}> = ({ item, departments, racks, isNew, onSave, onCancel, onDelete }) => {
  const [draft, setDraft] = useState<InventoryItem>(item);

  const upd = <K extends keyof InventoryItem>(k: K, v: InventoryItem[K]) =>
    setDraft(d => ({ ...d, [k]: v }));

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-[#b8afa3]/35 backdrop-blur-sm" onClick={onCancel} />
      <aside className="fixed inset-y-0 right-0 z-[101] flex w-full max-w-[100vw] animate-in slide-in-from-right flex-col border-l border-[#c7bcae] bg-[#f4f0e8] shadow-2xl duration-200 min-[481px]:w-[min(32rem,100vw)]">
        <div className="flex items-center justify-between border-b border-[#c7bcae] bg-[#ece6dd] p-4 min-[481px]:p-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#5d7f81] text-white">
              <Box size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black uppercase leading-none tracking-tight text-[#232321]">
                {isNew ? 'New item' : draft.name || 'Edit item'}
              </h3>
              <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-[#8a8174]">{draft.sku || '—'}</p>
            </div>
          </div>
          <button onClick={onCancel} className="rounded p-1.5 text-[#8a8174] transition-all hover:bg-[#e7e0d6]">
            <X size={18} />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4 min-[481px]:p-5">
          <Field label="Name *">
            <input
              type="text" value={draft.name}
              onChange={(e) => upd('name', e.target.value)}
              className="w-full rounded border border-[#c7bcae] bg-[#fbf8f2] px-3 py-2 text-sm text-[#232321] focus:border-[#5d7f81] focus:outline-none"
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 min-[481px]:grid-cols-2">
            <Field label="SKU *">
              <input
                type="text" value={draft.sku}
                onChange={(e) => upd('sku', e.target.value)}
                className="w-full rounded border border-[#c7bcae] bg-[#fbf8f2] px-3 py-2 font-mono text-sm text-[#232321] focus:border-[#5d7f81] focus:outline-none"
              />
            </Field>
            <Field label="Barcode">
              <input
                type="text" value={draft.barcode || ''}
                onChange={(e) => upd('barcode', e.target.value)}
                className="w-full rounded border border-[#c7bcae] bg-[#fbf8f2] px-3 py-2 font-mono text-sm text-[#232321] focus:border-[#5d7f81] focus:outline-none"
              />
            </Field>
          </div>
          <Field label="Category">
            <select
              value={draft.departmentId}
              onChange={(e) => upd('departmentId', e.target.value)}
              className="w-full cursor-pointer rounded border border-[#c7bcae] bg-[#fbf8f2] px-3 py-2 text-sm text-[#232321] focus:border-[#5d7f81] focus:outline-none"
            >
              {departments.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </Field>

          <Field label="Location (rack)">
            <select
              value={draft.rackId || ''}
              onChange={(e) => upd('rackId', e.target.value || undefined)}
              className="w-full cursor-pointer rounded border border-[#c7bcae] bg-[#fbf8f2] px-3 py-2 text-sm text-[#232321] focus:border-[#5d7f81] focus:outline-none"
            >
              <option value="">— unassigned —</option>
              {racks.map(r => <option key={r.id} value={r.id}>{r.id}{r.name ? ` · ${r.name}` : ''}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-3 min-[481px]:grid-cols-2">
            <Field label="Shelf">
              <input
                type="number" min={1}
                value={draft.shelf || 1}
                onChange={(e) => upd('shelf', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded border border-[#c7bcae] bg-[#fbf8f2] px-3 py-2 text-sm text-[#232321] focus:border-[#5d7f81] focus:outline-none"
              />
            </Field>
            <Field label="Position">
              <select
                value={draft.position || 'FRONT'}
                onChange={(e) => upd('position', e.target.value as any)}
                className="w-full cursor-pointer rounded border border-[#c7bcae] bg-[#fbf8f2] px-3 py-2 text-sm text-[#232321] focus:border-[#5d7f81] focus:outline-none"
              >
                <option value="FRONT">Front</option>
                <option value="BACK">Back</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 min-[481px]:grid-cols-2">
            <Field label="Quantity">
              <input
                type="number" min={0}
                value={draft.quantity}
                onChange={(e) => upd('quantity', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded border border-[#c7bcae] bg-[#fbf8f2] px-3 py-2 text-sm text-[#232321] focus:border-[#5d7f81] focus:outline-none"
              />
            </Field>
            <Field label="Available">
              <input
                type="number" min={0} max={draft.quantity}
                value={draft.available}
                onChange={(e) => upd('available', Math.max(0, Math.min(draft.quantity, parseInt(e.target.value) || 0)))}
                className="w-full rounded border border-[#46382f] bg-[#2a211c] px-3 py-2 text-sm text-white focus:border-cyan-700 focus:outline-none"
              />
            </Field>
          </div>

          <Field label="Status">
            <select
              value={draft.status}
              onChange={(e) => upd('status', e.target.value as ItemStatus)}
              className="w-full cursor-pointer rounded border border-[#c7bcae] bg-[#fbf8f2] px-3 py-2 text-sm text-[#232321] focus:border-[#5d7f81] focus:outline-none"
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </Field>

          <Field label="Notes">
            <textarea
              value={draft.notes || ''}
              onChange={(e) => upd('notes', e.target.value)}
              rows={3}
              className="w-full resize-none rounded border border-[#c7bcae] bg-[#fbf8f2] px-3 py-2 text-sm text-[#232321] focus:border-[#5d7f81] focus:outline-none"
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-[#c7bcae] bg-[#ece6dd] p-4">
          {!isNew && (
            <button
              onClick={onDelete}
              className="px-3 py-2 bg-transparent border border-red-600/30 text-red-500 hover:bg-red-600/10 rounded text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
            >
              <Trash2 size={12} /> Delete
            </button>
          )}
          <button
            onClick={onCancel}
            className="ml-auto bg-transparent px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#8a8174] transition-colors hover:text-[#232321]"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(draft)}
            className="flex items-center gap-1.5 rounded bg-[#5d7f81] px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-[#4f7172] active:scale-95"
          >
            <Save size={12} /> Save
          </button>
        </div>
      </aside>
    </>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-[#8a8174]">{label}</label>
    {children}
  </div>
);

// Tiny CSV line parser supporting quoted fields with commas/escaped quotes.
function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur += ch; }
    } else {
      if (ch === ',') { out.push(cur); cur = ''; }
      else if (ch === '"' && cur === '') { inQuotes = true; }
      else { cur += ch; }
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

export default InventoryManager;
