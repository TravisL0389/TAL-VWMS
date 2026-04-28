import React, { useState } from 'react';
import {
  Warehouse as WarehouseIcon, ArrowRight, ArrowLeft, Check, Plus, X, Trash2,
  Sparkles, Building2,
} from 'lucide-react';
import {
  INDUSTRY_PRESETS, ICON_OPTIONS, getIcon,
} from '../constants';
import { shortId } from '../utils/storage';
import type { DepartmentDef, Warehouse, IconKey } from '../types';

interface SetupWizardProps {
  onComplete: (data: {
    warehouse: Warehouse;
    departments: DepartmentDef[];
    brandName: string;
  }) => void;
  onSkip: () => void;
}

const PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#a855f7', '#ec4899',
  '#64748b', '#0ea5e9',
];

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(0);
  const [brandName, setBrandName] = useState('');
  const [warehouseName, setWarehouseName] = useState('Main Warehouse');
  const [warehouseLocation, setWarehouseLocation] = useState('');
  const [presetId, setPresetId] = useState<string>('general');
  const [departments, setDepartments] = useState<DepartmentDef[]>(
    INDUSTRY_PRESETS[0].departments
  );

  const choosePreset = (id: string) => {
    setPresetId(id);
    const preset = INDUSTRY_PRESETS.find(p => p.id === id);
    if (preset) setDepartments(preset.departments.map(d => ({ ...d })));
  };

  const updateDept = (idx: number, patch: Partial<DepartmentDef>) => {
    setDepartments(prev => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const addDept = () => {
    setDepartments(prev => [
      ...prev,
      {
        id: shortId('dept'),
        label: 'New Category',
        prefix: 'NEW',
        color: PALETTE[prev.length % PALETTE.length],
        icon: 'box',
      },
    ]);
  };

  const removeDept = (idx: number) => {
    setDepartments(prev => prev.filter((_, i) => i !== idx));
  };

  const finish = () => {
    const wh: Warehouse = {
      id: shortId('wh'),
      name: warehouseName.trim() || 'Main Warehouse',
      location: warehouseLocation.trim(),
      createdAt: Date.now(),
    };
    onComplete({
      warehouse: wh,
      departments: departments.length > 0 ? departments : INDUSTRY_PRESETS[0].departments,
      brandName: brandName.trim() || 'VWMS',
    });
  };

  const stepNames = ['Welcome', 'Warehouse', 'Categories', 'Review'];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-auto bg-[#ddd7cc] p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(93,127,129,0.12)_0%,transparent_50%)]" />
      <div className="relative my-8 w-full max-w-3xl overflow-hidden rounded-xl border border-[#b6aa9b] bg-[#ede6dc] shadow-2xl">
        {/* Header / progress */}
        <div className="flex items-center justify-between gap-4 border-b border-[#b6aa9b] px-6 py-4 sm:px-8 sm:py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#5d7f81] text-white shadow-lg sm:h-10 sm:w-10">
              <WarehouseIcon size={20} />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tight text-[#232321] sm:text-base">VWMS Setup</h1>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-[#7d7569] sm:text-[10px]">
                {stepNames[step]} • Step {step + 1} of {stepNames.length}
              </p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="rounded border border-transparent px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-[#7d7569] transition-colors hover:border-[#b6aa9b] hover:text-[#232321]"
          >
            Skip
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#cfc4b6]">
          <div
            className="h-full bg-[#5d7f81] transition-all duration-500"
            style={{ width: `${((step + 1) / stepNames.length) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="p-6 sm:p-10 min-h-[420px]">
          {step === 0 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="text-center space-y-3">
                <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[#8aa5a7] bg-[#dbe8e8]">
                  <Sparkles size={28} className="text-[#5d7f81]" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-[#232321] sm:text-3xl">
                  Welcome
                </h2>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-[#544c43]">
                  VWMS adapts to any warehouse — entertainment, retail, manufacturing, tools, food. We&apos;ll set
                  yours up in under a minute. You can change anything later.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-[9px] font-black uppercase tracking-widest text-[#7d7569]">
                  Company / Brand name <span className="font-normal lowercase text-[#9a9083]">(optional)</span>
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. ACME Logistics"
                  className="w-full rounded border border-[#b6aa9b] bg-[#f1ebe2] px-4 py-3 text-sm text-[#232321] transition-colors focus:border-[#5d7f81] focus:outline-none"
                />
                <p className="mt-2 text-[9px] leading-relaxed text-[#8b8378]">
                  Shown in the top bar. Leave blank to keep the default branding.
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="mb-1 text-xl font-black uppercase tracking-tighter text-[#232321] sm:text-2xl">
                  Your first warehouse
                </h2>
                <p className="text-xs text-[#7d7569]">Add more later from the warehouse picker.</p>
              </div>

              <div>
                <label className="mb-2 block text-[9px] font-black uppercase tracking-widest text-[#7d7569]">
                  Warehouse name
                </label>
                <input
                  type="text"
                  value={warehouseName}
                  onChange={(e) => setWarehouseName(e.target.value)}
                  className="w-full rounded border border-[#b6aa9b] bg-[#f1ebe2] px-4 py-3 text-sm text-[#232321] transition-colors focus:border-[#5d7f81] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-[9px] font-black uppercase tracking-widest text-[#7d7569]">
                  Location <span className="font-normal lowercase text-[#9a9083]">(optional)</span>
                </label>
                <input
                  type="text"
                  value={warehouseLocation}
                  onChange={(e) => setWarehouseLocation(e.target.value)}
                  placeholder="City, region, or building code"
                  className="w-full rounded border border-[#b6aa9b] bg-[#f1ebe2] px-4 py-3 text-sm text-[#232321] transition-colors focus:border-[#5d7f81] focus:outline-none"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="mb-1 text-xl font-black uppercase tracking-tighter text-[#232321] sm:text-2xl">
                  How do you organise inventory?
                </h2>
                <p className="text-xs text-[#7d7569]">
                  Pick a starting template — every name, colour, and icon is editable below.
                </p>
              </div>

              {/* Industry presets */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {INDUSTRY_PRESETS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => choosePreset(p.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      presetId === p.id
                        ? 'border-[#5d7f81] bg-[#5d7f81] text-white shadow-lg'
                        : 'border-[#b6aa9b] bg-[#f1ebe2] text-[#625a50] hover:border-[#8f8679]'
                    }`}
                  >
                    <Building2 size={14} className={presetId === p.id ? 'mb-1.5 text-white' : 'mb-1.5 text-[#5d7f81]'} />
                    <p className="text-[10px] font-black uppercase tracking-tight leading-tight">{p.name}</p>
                    <p className={`mt-1 text-[9px] leading-snug ${presetId === p.id ? 'text-white/75' : 'text-[#8b8378]'}`}>
                      {p.description}
                    </p>
                  </button>
                ))}
              </div>

              {/* Department editor */}
              <div className="rounded-lg border border-[#b6aa9b] bg-[#e1d9cd] p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#7d7569]">
                    Categories ({departments.length})
                  </p>
                  <button
                    onClick={addDept}
                    className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#5d7f81] transition-colors hover:text-[#4f7172]"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                  {departments.map((d, idx) => {
                    const Icon = getIcon(d.icon);
                    return (
                      <div key={idx} className="flex items-center gap-2 rounded border border-[#b6aa9b] bg-[#f1ebe2] p-2">
                        {/* Color swatch */}
                        <input
                          type="color"
                          value={d.color}
                          onChange={(e) => updateDept(idx, { color: e.target.value })}
                          className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 shrink-0"
                          title="Pick color"
                        />
                        {/* Icon */}
                        <select
                          value={d.icon}
                          onChange={(e) => updateDept(idx, { icon: e.target.value as IconKey })}
                          className="w-16 cursor-pointer rounded border border-[#b6aa9b] bg-[#ede6dc] px-2 py-1.5 text-[10px] font-bold text-[#232321] focus:border-[#5d7f81] focus:outline-none"
                          title="Pick icon"
                        >
                          {ICON_OPTIONS.map(k => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                        {/* Label */}
                        <input
                          type="text"
                          value={d.label}
                          onChange={(e) => updateDept(idx, { label: e.target.value })}
                          placeholder="Name"
                          className="min-w-0 flex-1 rounded border border-[#b6aa9b] bg-[#ede6dc] px-2 py-1.5 text-xs text-[#232321] focus:border-[#5d7f81] focus:outline-none"
                        />
                        {/* Prefix */}
                        <input
                          type="text"
                          value={d.prefix}
                          onChange={(e) => updateDept(idx, { prefix: e.target.value.toUpperCase().slice(0, 4) })}
                          placeholder="ABC"
                          maxLength={4}
                          className="w-14 rounded border border-[#b6aa9b] bg-[#ede6dc] px-2 py-1.5 text-[10px] font-black uppercase tracking-wider tabular-nums text-[#232321] focus:border-[#5d7f81] focus:outline-none"
                          title="3-letter prefix"
                        />
                        {/* Remove */}
                        <button
                          onClick={() => removeDept(idx)}
                          disabled={departments.length <= 1}
                          className="shrink-0 p-1.5 text-[#9a9083] transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="mb-1 text-xl font-black uppercase tracking-tighter text-[#232321] sm:text-2xl">
                  Ready to go
                </h2>
                <p className="text-xs text-[#7d7569]">Review your setup. You can edit everything later in Settings.</p>
              </div>

              <div className="space-y-3">
                <ReviewRow label="Brand" value={brandName.trim() || 'VWMS (default)'} />
                <ReviewRow label="Warehouse" value={`${warehouseName}${warehouseLocation ? ' — ' + warehouseLocation : ''}`} />
                <div className="rounded-lg border border-[#b6aa9b] bg-[#f1ebe2] p-4">
                  <p className="mb-3 text-[9px] font-black uppercase tracking-widest text-[#7d7569]">
                    {departments.length} {departments.length === 1 ? 'Category' : 'Categories'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {departments.map(d => {
                      const Icon = getIcon(d.icon);
                      return (
                        <div key={d.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded border" style={{ borderColor: d.color, backgroundColor: `${d.color}15` }}>
                          <Icon size={12} style={{ color: d.color }} />
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#232321]">{d.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer / nav */}
        <div className="flex items-center justify-between gap-3 border-t border-[#b6aa9b] bg-[#ddd5c8] px-6 py-4 sm:px-8 sm:py-5">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-[#7d7569] transition-colors hover:text-[#232321] disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowLeft size={14} /> Back
          </button>
          {step < stepNames.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-2 rounded bg-[#5d7f81] px-5 py-2.5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-[#4f7172] active:scale-95"
            >
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={finish}
              className="flex items-center gap-2 rounded bg-[#5d7f81] px-5 py-2.5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-[#4f7172] active:scale-95"
            >
              <Check size={14} /> Finish setup
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ReviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 rounded-lg border border-[#b6aa9b] bg-[#f1ebe2] px-4 py-3">
    <span className="text-[9px] font-black uppercase tracking-widest text-[#7d7569]">{label}</span>
    <span className="truncate text-xs font-bold text-[#232321]">{value}</span>
  </div>
);

export default SetupWizard;
