import React, { useState } from 'react';
import {
  Settings as SettingsIcon, X, Save, RefreshCw, Trash2, AlertTriangle,
  PanelLeft, PanelRight, Sparkles, Bell, Tag, Palette, RotateCw, Plus, Edit3, Check,
} from 'lucide-react';
import type { AppSettings, DepartmentDef, IconKey, Warehouse } from '../types';
import { ICON_OPTIONS, getIcon } from '../constants';
import { isAIConfigured } from '../utils/aiService';
import { shortId } from '../utils/storage';

// =============================================================================
// SettingsPanel — slide-out for app-wide configuration.
// All changes apply immediately and persist via dataStore.
// =============================================================================

interface SettingsPanelProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  departments: DepartmentDef[];
  setDepartments: React.Dispatch<React.SetStateAction<DepartmentDef[]>>;
  warehouses: Warehouse[];
  setWarehouses: React.Dispatch<React.SetStateAction<Warehouse[]>>;
  onResetSetup: () => void;
  onResetAll: () => void;
  onClose: () => void;
}

const PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#a855f7', '#ec4899',
  '#64748b', '#0ea5e9',
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings, setSettings, departments, setDepartments, warehouses, setWarehouses,
  onResetSetup, onResetAll, onClose,
}) => {
  const [confirmReset, setConfirmReset] = useState<'setup' | 'all' | null>(null);
  const [editingDept, setEditingDept] = useState<string | null>(null);
  const aiOn = isAIConfigured() && settings.enableAI;

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(s => ({ ...s, [key]: value }));
  };

  const addWarehouse = () => {
    const newId = shortId('wh');
    setWarehouses(prev => [...prev, {
      id: newId,
      name: `Warehouse ${prev.length + 1}`,
      location: '',
      createdAt: Date.now(),
    }]);
    updateSetting('warehouseId', newId);
  };

  const renameWarehouse = (id: string, name: string) => {
    setWarehouses(prev => prev.map(w => w.id === id ? { ...w, name } : w));
  };

  const deleteWarehouse = (id: string) => {
    if (warehouses.length <= 1) return;
    setWarehouses(prev => prev.filter(w => w.id !== id));
    if (settings.warehouseId === id) {
      const next = warehouses.find(w => w.id !== id);
      if (next) updateSetting('warehouseId', next.id);
    }
  };

  const addDepartment = () => {
    setDepartments(prev => [...prev, {
      id: shortId('d'),
      label: 'New Category',
      prefix: 'NEW',
      color: PALETTE[prev.length % PALETTE.length],
      icon: 'box',
    }]);
  };

  const updateDept = (id: string, patch: Partial<DepartmentDef>) => {
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
  };

  const removeDept = (id: string) => {
    if (departments.length <= 1) return;
    setDepartments(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehaviorY: 'auto' }}
    >
      <div className="absolute inset-0 bg-[#8f8679]/45" />
      <div
        className="relative flex h-full w-full max-w-[100vw] flex-col border-l border-[#b6aa9b] bg-[#ede6dc] min-[481px]:max-w-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#b6aa9b] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dbe8e8] text-[#5d7f81]">
              <SettingsIcon size={18} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-[#7d7569]">Configuration</div>
              <h2 className="text-lg font-bold text-[#232321]">Settings</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-2 text-[#7d7569] hover:bg-[#d8cfc2] hover:text-[#232321]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehaviorY: 'auto' }}
        >
          {/* Branding */}
          <Section title="Branding" icon={<Tag size={14} />}>
            <Field label="Brand Name">
              <input
                type="text"
                value={settings.brandName}
                onChange={e => updateSetting('brandName', e.target.value)}
                placeholder="VWMS"
                className="input-field"
              />
              <Hint>Shown in the top bar across the app.</Hint>
            </Field>
          </Section>

          {/* Terminology */}
          <Section title="Terminology" icon={<Edit3 size={14} />}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Department Label">
                <input
                  type="text"
                  value={settings.departmentLabel}
                  onChange={e => updateSetting('departmentLabel', e.target.value)}
                  className="input-field"
                />
              </Field>
              <Field label="Item Label">
                <input
                  type="text"
                  value={settings.itemLabel}
                  onChange={e => updateSetting('itemLabel', e.target.value)}
                  className="input-field"
                />
              </Field>
              <Field label="Rack Label">
                <input
                  type="text"
                  value={settings.rackLabel}
                  onChange={e => updateSetting('rackLabel', e.target.value)}
                  className="input-field"
                />
              </Field>
            </div>
            <Hint>Customize wording to match your business — "Asset", "Bay", "Zone", etc.</Hint>
          </Section>

          {/* Warehouses */}
          <Section title="Warehouses" icon={<RefreshCw size={14} />}>
            <div className="space-y-2">
              {warehouses.map(wh => (
                <div key={wh.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-[#b6aa9b] bg-[#f1ebe2] p-2">
                  <input
                    type="text"
                    value={wh.name}
                    onChange={e => renameWarehouse(wh.id, e.target.value)}
                    className="flex-1 rounded bg-transparent px-2 py-1 text-sm text-[#232321] focus:outline-none"
                  />
                  <button
                    onClick={() => updateSetting('warehouseId', wh.id)}
                    className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${
                      settings.warehouseId === wh.id
                        ? 'bg-[#dbe8e8] text-[#5d7f81]'
                        : 'text-[#625a50] hover:bg-[#d8cfc2] hover:text-[#232321]'
                    }`}
                  >
                    {settings.warehouseId === wh.id ? <><Check size={10} /> Active</> : 'Activate'}
                  </button>
                  {warehouses.length > 1 && (
                    <button
                      onClick={() => deleteWarehouse(wh.id)}
                      className="rounded p-1 text-[#8b8378] hover:bg-red-600/10 hover:text-red-400"
                      aria-label="Delete warehouse"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addWarehouse}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#b6aa9b] py-2 text-xs font-semibold text-[#625a50] transition hover:border-[#5d7f81] hover:text-[#5d7f81]"
              >
                <Plus size={12} /> Add Warehouse
              </button>
            </div>
          </Section>

          {/* Departments */}
          <Section title={`${settings.departmentLabel}s`} icon={<Palette size={14} />}>
            <div className="space-y-2">
              {departments.map(d => {
                const Icon = getIcon(d.icon);
                const isEditing = editingDept === d.id;
                return (
                  <div key={d.id} className="rounded-lg border border-[#b6aa9b] bg-[#f1ebe2] p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-white"
                        style={{ backgroundColor: d.color }}
                      >
                        <Icon size={16} />
                      </span>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={d.label}
                          onChange={e => updateDept(d.id, { label: e.target.value })}
                          className="w-full rounded bg-transparent px-1 py-0.5 text-sm font-semibold text-[#232321] focus:bg-[#ede6dc] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={d.prefix}
                          onChange={e => updateDept(d.id, { prefix: e.target.value.toUpperCase().slice(0, 4) })}
                          className="w-full rounded bg-transparent px-1 py-0.5 font-mono text-[11px] text-[#8b8378] focus:bg-[#ede6dc] focus:outline-none"
                          placeholder="PFX"
                        />
                      </div>
                      <button
                        onClick={() => setEditingDept(isEditing ? null : d.id)}
                        className="rounded p-1.5 text-[#7d7569] hover:bg-[#d8cfc2] hover:text-[#232321]"
                      >
                        <Palette size={12} />
                      </button>
                      {departments.length > 1 && (
                        <button
                          onClick={() => removeDept(d.id)}
                          className="rounded p-1.5 text-[#8b8378] hover:bg-red-600/10 hover:text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    {isEditing && (
                      <div className="mt-3 space-y-3">
                        <div>
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#7d7569]">Color</div>
                          <div className="flex flex-wrap gap-1.5">
                            {PALETTE.map(c => (
                              <button
                                key={c}
                                onClick={() => updateDept(d.id, { color: c })}
                                className={`h-6 w-6 rounded transition ${d.color === c ? 'ring-2 ring-[#232321] ring-offset-2 ring-offset-[#f1ebe2]' : ''}`}
                                style={{ backgroundColor: c }}
                                aria-label={`Color ${c}`}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#7d7569]">Icon</div>
                          <div className="grid grid-cols-6 gap-1 min-[481px]:grid-cols-8">
                            {ICON_OPTIONS.map(key => {
                              const I = getIcon(key);
                              return (
                                <button
                                  key={key}
                                  onClick={() => updateDept(d.id, { icon: key as IconKey })}
                                  className={`flex h-7 w-7 items-center justify-center rounded transition ${
                                    d.icon === key ? 'bg-[#5d7f81] text-white' : 'bg-[#ede6dc] text-[#7d7569] hover:text-[#232321]'
                                  }`}
                                >
                                  <I size={12} />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                onClick={addDepartment}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#b6aa9b] py-2 text-xs font-semibold text-[#625a50] transition hover:border-[#5d7f81] hover:text-[#5d7f81]"
              >
                <Plus size={12} /> Add {settings.departmentLabel}
              </button>
            </div>
          </Section>

          {/* Layout */}
          <Section title="Layout & Display" icon={<PanelLeft size={14} />}>
            <Field label="Sidebar Position">
              <div className="grid grid-cols-1 gap-2 min-[481px]:grid-cols-2">
                <button
                  onClick={() => updateSetting('sidebarPosition', 'LEFT')}
                  className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition ${
                    settings.sidebarPosition === 'LEFT'
                      ? 'border-[#5d7f81] bg-[#dbe8e8] text-[#232321]'
                      : 'border-[#b6aa9b] text-[#625a50] hover:border-[#8f8679]'
                  }`}
                >
                  <PanelLeft size={14} /> Left
                </button>
                <button
                  onClick={() => updateSetting('sidebarPosition', 'RIGHT')}
                  className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition ${
                    settings.sidebarPosition === 'RIGHT'
                      ? 'border-[#5d7f81] bg-[#dbe8e8] text-[#232321]'
                      : 'border-[#b6aa9b] text-[#625a50] hover:border-[#8f8679]'
                  }`}
                >
                  <PanelRight size={14} /> Right
                </button>
              </div>
              <Hint>Switches the dock side of the main nav and the warehouse builder panel.</Hint>
            </Field>

            <Field label="Density">
              <div className="grid grid-cols-1 gap-2 min-[481px]:grid-cols-2">
                <button
                  onClick={() => updateSetting('density', 'COMFORTABLE')}
                  className={`rounded-lg border py-2 text-sm font-semibold transition ${
                    settings.density === 'COMFORTABLE'
                      ? 'border-[#5d7f81] bg-[#dbe8e8] text-[#232321]'
                      : 'border-[#b6aa9b] text-[#625a50] hover:border-[#8f8679]'
                  }`}
                >
                  Comfortable
                </button>
                <button
                  onClick={() => updateSetting('density', 'COMPACT')}
                  className={`rounded-lg border py-2 text-sm font-semibold transition ${
                    settings.density === 'COMPACT'
                      ? 'border-[#5d7f81] bg-[#dbe8e8] text-[#232321]'
                      : 'border-[#b6aa9b] text-[#625a50] hover:border-[#8f8679]'
                  }`}
                >
                  Compact
                </button>
              </div>
            </Field>
          </Section>

          {/* Features */}
          <Section title="Features" icon={<Sparkles size={14} />}>
            <Toggle
              icon={<Sparkles size={14} />}
              label="AI-Powered Insights"
              description={aiOn ? 'Connected to Gemini.' : isAIConfigured() ? 'Disabled — toggle to re-enable.' : 'No API key configured. Heuristic fallback in use.'}
              checked={settings.enableAI}
              onChange={v => updateSetting('enableAI', v)}
              warning={settings.enableAI && !isAIConfigured()}
            />
            <Toggle
              icon={<Bell size={14} />}
              label="Notifications"
              description="Show in-app activity notifications."
              checked={settings.enableNotifications}
              onChange={v => updateSetting('enableNotifications', v)}
            />
            <Toggle
              icon={<Save size={14} />}
              label="Auto-Save"
              description="Persist changes to local storage automatically."
              checked={settings.enableAutosave}
              onChange={v => updateSetting('enableAutosave', v)}
            />
          </Section>

          {/* Danger zone */}
          <Section title="Danger Zone" icon={<AlertTriangle size={14} />} danger>
            <div className="space-y-2">
              <button
                onClick={() => setConfirmReset('setup')}
                className="flex w-full items-center justify-between rounded-lg border border-yellow-600/30 bg-yellow-600/5 p-3 text-left transition hover:bg-yellow-600/10"
              >
                <div>
                  <div className="text-sm font-semibold text-yellow-400">Re-run Setup</div>
                  <div className="text-[11px] text-[#8b8378]">Restart the welcome wizard. Existing data is preserved.</div>
                </div>
                <RotateCw size={14} className="text-yellow-400" />
              </button>
              <button
                onClick={() => setConfirmReset('all')}
                className="flex w-full items-center justify-between rounded-lg border border-red-600/30 bg-red-600/5 p-3 text-left transition hover:bg-red-600/10"
              >
                <div>
                  <div className="text-sm font-semibold text-red-400">Reset All Data</div>
                  <div className="text-[11px] text-[#8b8378]">Erase warehouses, inventory, orders, layouts, and settings.</div>
                </div>
                <Trash2 size={14} className="text-red-400" />
              </button>
            </div>
          </Section>

          <div className="px-4 py-6 text-center text-[10px] text-[#8b8378]">
            Settings auto-save · Data lives in your browser
          </div>
        </div>

        {/* Confirm dialog */}
        {confirmReset && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-[#8f8679]/55 p-4"
            onClick={() => setConfirmReset(null)}
          >
            <div
              className="w-full max-w-sm rounded-xl border border-[#b6aa9b] bg-[#ede6dc] p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-red-600/12 text-red-500">
                <AlertTriangle size={18} />
              </div>
              <h3 className="mb-1 text-base font-bold text-[#232321]">
                {confirmReset === 'setup' ? 'Re-run setup?' : 'Erase everything?'}
              </h3>
              <p className="mb-5 text-sm text-[#625a50]">
                {confirmReset === 'setup'
                  ? 'You\'ll be taken back to the welcome wizard. Your data will not be touched.'
                  : 'All warehouses, inventory, orders, racks, and settings will be permanently deleted. This cannot be undone.'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmReset(null)}
                  className="flex-1 rounded border border-[#b6aa9b] py-2 text-sm text-[#625a50] hover:bg-[#d8cfc2]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmReset === 'setup') onResetSetup();
                    else onResetAll();
                    setConfirmReset(null);
                    onClose();
                  }}
                  className="flex-1 rounded bg-red-600 py-2 text-sm font-bold text-white hover:bg-red-500"
                >
                  {confirmReset === 'setup' ? 'Re-run' : 'Erase All'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// Helpers
// =============================================================================
const Section: React.FC<{ title: string; icon: React.ReactNode; danger?: boolean; children: React.ReactNode }> = ({ title, icon, danger, children }) => (
  <div className={`border-b border-[#b6aa9b] p-4 sm:p-5 ${danger ? 'bg-red-600/[0.03]' : ''}`}>
    <div className="mb-3 flex items-center gap-2">
      <span className={danger ? 'text-red-400' : 'text-[#7d7569]'}>{icon}</span>
      <span className={`text-[10px] font-black uppercase tracking-widest ${danger ? 'text-red-400' : 'text-[#7d7569]'}`}>{title}</span>
    </div>
    {children}
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-3 last:mb-0">
    <label className="mb-1.5 block text-xs font-semibold text-[#3d3832]">{label}</label>
    {children}
  </div>
);

const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mt-1.5 text-[11px] text-[#8b8378]">{children}</div>
);

const Toggle: React.FC<{
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  warning?: boolean;
}> = ({ icon, label, description, checked, onChange, warning }) => (
  <div className="mb-2 flex items-start gap-3 rounded-lg border border-[#b6aa9b] bg-[#f1ebe2] p-3 last:mb-0">
    <span className="mt-0.5 text-[#7d7569]">{icon}</span>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-[#232321]">{label}</span>
        {warning && <span className="rounded bg-yellow-600/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-yellow-400">No key</span>}
      </div>
      <div className="mt-0.5 text-[11px] text-[#8b8378]">{description}</div>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-[#5d7f81]' : 'bg-[#b6aa9b]'}`}
      role="switch"
      aria-checked={checked}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  </div>
);

// Inline style for input fields used throughout
const styleTag = (
  <style>{`
    .input-field {
      width: 100%;
      background-color: #f1ebe2;
      border: 1px solid #b6aa9b;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 14px;
      color: #232321;
      outline: none;
    }
    .input-field:focus {
      border-color: #5d7f81;
    }
  `}</style>
);

const SettingsPanelWithStyles: React.FC<SettingsPanelProps> = (props) => (
  <>
    {styleTag}
    <SettingsPanel {...props} />
  </>
);

export default SettingsPanelWithStyles;
