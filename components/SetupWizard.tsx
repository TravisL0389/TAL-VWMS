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
    <div className="fixed inset-0 z-[200] bg-[#0a0b0c] flex items-center justify-center p-4 overflow-auto">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(220,38,38,0.07)_0%,transparent_50%)] pointer-events-none" />
      <div className="relative w-full max-w-3xl bg-[#0f1113] border border-[#2a2d31] rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header / progress */}
        <div className="px-6 py-4 sm:px-8 sm:py-6 border-b border-[#1a1c1e] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-red-600 rounded-md flex items-center justify-center text-white shadow-lg shrink-0">
              <WarehouseIcon size={20} />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-white uppercase tracking-tight">VWMS Setup</h1>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                {stepNames[step]} • Step {step + 1} of {stepNames.length}
              </p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="text-[9px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors px-3 py-1.5 rounded border border-transparent hover:border-[#2a2d31]"
          >
            Skip
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#1a1c1e]">
          <div
            className="h-full bg-red-600 transition-all duration-500"
            style={{ width: `${((step + 1) / stepNames.length) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="p-6 sm:p-10 min-h-[420px]">
          {step === 0 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="text-center space-y-3">
                <div className="inline-flex w-16 h-16 bg-red-600/10 border border-red-600/30 rounded-2xl items-center justify-center mx-auto">
                  <Sparkles size={28} className="text-red-600" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase">
                  Welcome
                </h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                  VWMS adapts to any warehouse — entertainment, retail, manufacturing, tools, food. We&apos;ll set
                  yours up in under a minute. You can change anything later.
                </p>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Company / Brand name <span className="text-slate-700 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. ACME Logistics"
                  className="w-full bg-[#16181a] border border-[#2a2d31] rounded px-4 py-3 text-sm text-white focus:border-red-600 focus:outline-none transition-colors"
                />
                <p className="text-[9px] text-slate-600 mt-2 leading-relaxed">
                  Shown in the top bar. Leave blank to keep the default branding.
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tighter uppercase mb-1">
                  Your first warehouse
                </h2>
                <p className="text-xs text-slate-500">Add more later from the warehouse picker.</p>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Warehouse name
                </label>
                <input
                  type="text"
                  value={warehouseName}
                  onChange={(e) => setWarehouseName(e.target.value)}
                  className="w-full bg-[#16181a] border border-[#2a2d31] rounded px-4 py-3 text-sm text-white focus:border-red-600 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Location <span className="text-slate-700 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  value={warehouseLocation}
                  onChange={(e) => setWarehouseLocation(e.target.value)}
                  placeholder="City, region, or building code"
                  className="w-full bg-[#16181a] border border-[#2a2d31] rounded px-4 py-3 text-sm text-white focus:border-red-600 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tighter uppercase mb-1">
                  How do you organise inventory?
                </h2>
                <p className="text-xs text-slate-500">
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
                        ? 'bg-red-600 border-red-600 text-white shadow-lg'
                        : 'bg-[#16181a] border-[#2a2d31] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Building2 size={14} className={presetId === p.id ? 'text-white mb-1.5' : 'text-red-500 mb-1.5'} />
                    <p className="text-[10px] font-black uppercase tracking-tight leading-tight">{p.name}</p>
                    <p className={`text-[9px] mt-1 leading-snug ${presetId === p.id ? 'text-white/70' : 'text-slate-600'}`}>
                      {p.description}
                    </p>
                  </button>
                ))}
              </div>

              {/* Department editor */}
              <div className="bg-[#0a0b0c] border border-[#1a1c1e] rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    Categories ({departments.length})
                  </p>
                  <button
                    onClick={addDept}
                    className="flex items-center gap-1.5 text-[9px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest transition-colors"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                  {departments.map((d, idx) => {
                    const Icon = getIcon(d.icon);
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded bg-[#16181a] border border-[#2a2d31]">
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
                          className="bg-[#0a0b0c] border border-[#2a2d31] rounded text-white text-[10px] font-bold px-2 py-1.5 focus:border-red-600 focus:outline-none cursor-pointer w-16"
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
                          className="flex-1 min-w-0 bg-[#0a0b0c] border border-[#2a2d31] rounded text-white text-xs px-2 py-1.5 focus:border-red-600 focus:outline-none"
                        />
                        {/* Prefix */}
                        <input
                          type="text"
                          value={d.prefix}
                          onChange={(e) => updateDept(idx, { prefix: e.target.value.toUpperCase().slice(0, 4) })}
                          placeholder="ABC"
                          maxLength={4}
                          className="w-14 bg-[#0a0b0c] border border-[#2a2d31] rounded text-white text-[10px] font-black px-2 py-1.5 focus:border-red-600 focus:outline-none uppercase tracking-wider tabular-nums"
                          title="3-letter prefix"
                        />
                        {/* Remove */}
                        <button
                          onClick={() => removeDept(idx)}
                          disabled={departments.length <= 1}
                          className="p-1.5 text-slate-600 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
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
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tighter uppercase mb-1">
                  Ready to go
                </h2>
                <p className="text-xs text-slate-500">Review your setup. You can edit everything later in Settings.</p>
              </div>

              <div className="space-y-3">
                <ReviewRow label="Brand" value={brandName.trim() || 'VWMS (default)'} />
                <ReviewRow label="Warehouse" value={`${warehouseName}${warehouseLocation ? ' — ' + warehouseLocation : ''}`} />
                <div className="bg-[#16181a] border border-[#2a2d31] rounded-lg p-4">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">
                    {departments.length} {departments.length === 1 ? 'Category' : 'Categories'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {departments.map(d => {
                      const Icon = getIcon(d.icon);
                      return (
                        <div key={d.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded border" style={{ borderColor: d.color, backgroundColor: `${d.color}15` }}>
                          <Icon size={12} style={{ color: d.color }} />
                          <span className="text-[10px] font-black text-white uppercase tracking-wider">{d.label}</span>
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
        <div className="px-6 py-4 sm:px-8 sm:py-5 border-t border-[#1a1c1e] bg-[#0a0b0c] flex items-center justify-between gap-3">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 text-[9px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <ArrowLeft size={14} /> Back
          </button>
          {step < stepNames.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-red-700 active:scale-95 transition-all"
            >
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={finish}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-red-700 active:scale-95 transition-all"
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
  <div className="flex items-center justify-between gap-4 bg-[#16181a] border border-[#2a2d31] rounded-lg px-4 py-3">
    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    <span className="text-xs font-bold text-white truncate">{value}</span>
  </div>
);

export default SetupWizard;
