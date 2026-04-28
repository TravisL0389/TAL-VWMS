import React, { useState, useEffect, useRef } from 'react';
import {
  X, Camera, Radio, ScanLine, Check, AlertCircle, Package, Loader2,
} from 'lucide-react';
import type { InventoryItem, DepartmentDef } from '../types';
import { getDepartmentMeta, getIcon } from '../constants';

// =============================================================================
// ScannerOverlay — barcode + RFID scanning UI.
//
// Two modes:
//   - CAMERA: simulates a barcode scan (real Capacitor camera could be wired
//             here in the mobile build).
//   - RFID:   simulates an RFID tag read.
//
// Both modes are mocked but intentionally generic — no industry jargon.
// The scan result lookup against the inventory is real.
// =============================================================================

type ScanMode = 'CAMERA' | 'RFID';

interface ScannerOverlayProps {
  inventory: InventoryItem[];
  departments: DepartmentDef[];
  onClose: () => void;
  onItemFound: (item: InventoryItem) => void;
}

const ScannerOverlay: React.FC<ScannerOverlayProps> = ({ inventory, departments, onClose, onItemFound }) => {
  const [mode, setMode] = useState<ScanMode>('CAMERA');
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState<InventoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  // Simulate a successful scan after a short delay (random pick from inventory)
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (!scanning) return;
    if (inventory.length === 0) {
      setError('No inventory available to scan.');
      setScanning(false);
      return;
    }
    timer.current = window.setTimeout(() => {
      const pick = inventory[Math.floor(Math.random() * inventory.length)];
      setResult(pick);
      setScanning(false);
    }, 2200);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [scanning, inventory]);

  const restart = () => {
    setResult(null);
    setError(null);
    setScanning(true);
  };

  const lookupManual = () => {
    if (!manualCode.trim()) return;
    const code = manualCode.trim().toLowerCase();
    const match = inventory.find(i =>
      i.sku.toLowerCase() === code ||
      (i.barcode || '').toLowerCase() === code ||
      (i.rfid || '').toLowerCase() === code,
    );
    if (match) {
      setResult(match);
      setError(null);
      setScanning(false);
    } else {
      setError(`No item found matching "${manualCode}".`);
    }
  };

  const accept = () => {
    if (result) {
      onItemFound(result);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#8f8679]/65 p-3 min-[481px]:p-4">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#b6aa9b] bg-[#ede6dc]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#b6aa9b] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#dbe8e8] text-[#5d7f81]">
              <ScanLine size={16} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-[#7d7569]">Scanner</div>
              <div className="text-sm font-bold text-[#232321]">Find Item</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-2 text-[#7d7569] hover:bg-[#d8cfc2] hover:text-[#232321]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 border-b border-[#b6aa9b] bg-[#ddd5c8] p-1">
          <button
            onClick={() => { setMode('CAMERA'); restart(); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded py-2 text-xs font-semibold transition ${
              mode === 'CAMERA' ? 'bg-[#5d7f81] text-white' : 'text-[#625a50] hover:text-[#232321]'
            }`}
          >
            <Camera size={14} /> Barcode
          </button>
          <button
            onClick={() => { setMode('RFID'); restart(); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded py-2 text-xs font-semibold transition ${
              mode === 'RFID' ? 'bg-[#5d7f81] text-white' : 'text-[#625a50] hover:text-[#232321]'
            }`}
          >
            <Radio size={14} /> RFID
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col items-center gap-4 p-4 min-[481px]:p-6">
          {/* Visual area */}
          <div className="relative flex h-44 w-full items-center justify-center overflow-hidden rounded-lg border border-[#b6aa9b] bg-[#f1ebe2] min-[481px]:h-56">
            {scanning && !error && (
              <>
                {mode === 'CAMERA' ? (
                  <>
                    <Camera size={48} className="text-[#b6aa9b]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative h-32 w-48">
                        <div className="absolute -left-1 -top-1 h-6 w-6 border-l-4 border-t-4 border-[#5d7f81]" />
                        <div className="absolute -right-1 -top-1 h-6 w-6 border-r-4 border-t-4 border-[#5d7f81]" />
                        <div className="absolute -left-1 -bottom-1 h-6 w-6 border-b-4 border-l-4 border-[#5d7f81]" />
                        <div className="absolute -right-1 -bottom-1 h-6 w-6 border-b-4 border-r-4 border-[#5d7f81]" />
                        <div className="absolute left-0 right-0 h-px animate-pulse bg-[#5d7f81]" style={{ top: '50%' }} />
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#ede6dc]/95 px-3 py-1 text-[10px] uppercase tracking-widest text-[#232321] backdrop-blur">
                      Aim at barcode
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <Radio size={48} className="text-red-500" />
                        <div className="absolute inset-0 -m-2 animate-ping rounded-full border-2 border-[#5d7f81]/40" />
                        <div className="absolute inset-0 -m-6 animate-ping rounded-full border-2 border-[#5d7f81]/20" style={{ animationDelay: '0.3s' }} />
                        <div className="absolute inset-0 -m-12 animate-ping rounded-full border-2 border-[#5d7f81]/10" style={{ animationDelay: '0.6s' }} />
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#ede6dc]/95 px-3 py-1 text-[10px] uppercase tracking-widest text-[#232321] backdrop-blur">
                      Listening for tags
                    </div>
                  </>
                )}
                <div className="absolute top-3 right-3 flex items-center gap-2 rounded bg-[#ede6dc]/95 px-2 py-1 text-[10px] backdrop-blur">
                  <Loader2 size={10} className="animate-spin text-[#5d7f81]" />
                  <span className="font-mono uppercase tracking-wider text-[#625a50]">Scanning</span>
                </div>
              </>
            )}

            {!scanning && result && (
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-600/15 text-green-400">
                  <Check size={28} />
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-green-400">Match found</div>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600/15 text-red-400">
                  <AlertCircle size={28} />
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-red-400">No match</div>
              </div>
            )}
          </div>

          {/* Result info */}
          {result && (() => {
            const dept = getDepartmentMeta(result.departmentId, departments);
            const Icon = getIcon(dept.icon);
            return (
              <div className="w-full rounded-lg border border-[#b6aa9b] bg-[#f1ebe2] p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded text-white"
                    style={{ backgroundColor: dept.color }}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-[#232321]">{result.name}</div>
                    <div className="font-mono text-[11px] text-[#8b8378]">{result.sku}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px]">
                      <span className="rounded bg-[#ede6dc] px-2 py-0.5 text-[#625a50]">{dept.label}</span>
                      <span className="rounded bg-[#ede6dc] px-2 py-0.5 text-[#625a50]">
                        {result.available}/{result.quantity} avail
                      </span>
                      {result.rackId && (
                        <span className="rounded bg-[#ede6dc] px-2 py-0.5 font-mono text-[#625a50]">
                          {result.rackId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {error && (
            <div className="w-full rounded-lg border border-red-600/20 bg-red-600/5 p-3 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Manual entry */}
          <div className="w-full">
            <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#7d7569]">Or enter manually</div>
            <div className="flex flex-col gap-2 min-[481px]:flex-row">
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lookupManual()}
                placeholder="SKU, barcode, or RFID…"
                className="flex-1 rounded border border-[#b6aa9b] bg-[#f1ebe2] px-3 py-2 text-sm text-[#232321] focus:border-[#5d7f81] focus:outline-none"
              />
              <button
                onClick={lookupManual}
                disabled={!manualCode.trim()}
                className="rounded bg-[#5d7f81] px-4 py-2 text-sm font-bold text-white hover:bg-[#4f7172] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Find
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex w-full flex-col gap-2 min-[481px]:flex-row">
            {result ? (
              <>
                <button
                  onClick={restart}
                  className="flex-1 rounded-lg border border-[#b6aa9b] py-2.5 text-sm font-semibold text-[#625a50] hover:bg-[#d8cfc2]"
                >
                  Scan Another
                </button>
                <button
                  onClick={accept}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#5d7f81] py-2.5 text-sm font-bold text-white hover:bg-[#4f7172]"
                >
                  <Package size={14} /> Open Item
                </button>
              </>
            ) : (
              <button
                onClick={restart}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#b6aa9b] py-2.5 text-sm font-semibold text-[#625a50] hover:bg-[#d8cfc2]"
              >
                {scanning ? 'Cancel & Restart' : 'Try Again'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScannerOverlay;
