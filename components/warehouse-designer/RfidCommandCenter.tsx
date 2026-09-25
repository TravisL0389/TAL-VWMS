import React, { useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Play,
  Power,
  RadioTower,
  Router,
  ScanLine,
  X,
} from 'lucide-react';
import type { RfidSystemMode, WarehouseFloorObject, WarehouseRfidSystemState } from './warehouseTypes';
import type { RfidReadEvent, RfidSystemMetrics } from './warehouseTypes';
import { resolveEffectiveRfidMode } from '../../utils/rfidController';

interface RfidCommandCenterProps {
  open: boolean;
  state: WarehouseRfidSystemState;
  metrics: RfidSystemMetrics;
  endpoints: WarehouseFloorObject[];
  events: RfidReadEvent[];
  onClose: () => void;
  onStateChange: (patch: Partial<WarehouseRfidSystemState>) => void;
  onRunDiagnostic: () => void;
  onSelectEndpoint: (objectId: string) => void;
}

const MODES: Array<{ value: RfidSystemMode; label: string }> = [
  { value: 'AUTO', label: 'Auto' },
  { value: 'INTAKE', label: 'Intake' },
  { value: 'OUTTAKE', label: 'Outtake' },
  { value: 'CYCLE_COUNT', label: 'Cycle Count' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
];

const RfidCommandCenter: React.FC<RfidCommandCenterProps> = ({
  open,
  state,
  metrics,
  endpoints,
  events,
  onClose,
  onStateChange,
  onRunDiagnostic,
  onSelectEndpoint,
}) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[270] bg-[#4c4943]/55 backdrop-blur-sm" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="RFID command center"
        className="absolute inset-y-0 right-0 flex w-full max-w-[46rem] flex-col border-l border-[#aaa093] bg-[#ede6dc] text-[#2b2925] shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#c7bcae] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#4d7275]">
              <RadioTower size={15} /> RFID Operations
            </div>
            <h2 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">Hive Control Center</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6f675d]">
              <StatusDot active={state.enabled} />
              <span>{state.enabled ? 'System energized' : 'System shut down'}</span>
              <span>·</span>
              <span>{metrics.onlineEndpoints}/{metrics.configuredEndpoints} endpoints online</span>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close RFID command center"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#c7bcae] bg-[#f7f3ec] text-[#5f5950] transition hover:bg-white"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <section className="border-b border-[#c7bcae] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-black">RFID system power</div>
                <div className="mt-1 text-xs text-[#7d7569]">Master interlock for every configured reader and antenna.</div>
              </div>
              <button
                type="button"
                aria-pressed={state.enabled}
                onClick={() => onStateChange({ enabled: !state.enabled })}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-black transition ${
                  state.enabled
                    ? 'bg-[#2f6f5e] text-white hover:bg-[#285f51]'
                    : 'border border-[#b65d53] bg-[#f7f3ec] text-[#91463f] hover:bg-[#f5e3df]'
                }`}
              >
                <Power size={17} />
                {state.enabled ? 'Shut Down RFID' : 'Energize RFID'}
              </button>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#7d7569]">Operating Mode</div>
              <div className="grid grid-cols-2 gap-1 rounded-md border border-[#c7bcae] bg-[#ddd5c9] p-1 sm:grid-cols-5">
                {MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    aria-pressed={state.mode === mode.value}
                    onClick={() => onStateChange({ mode: mode.value })}
                    className={`min-h-9 rounded px-2 py-2 text-xs font-bold transition ${
                      state.mode === mode.value ? 'bg-[#f7f3ec] text-[#2f6f75] shadow-sm' : 'text-[#71695f] hover:bg-[#e9e2d7]'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Field label={`TX Power ${state.txPower.toFixed(1)} dBm`}>
                <input
                  aria-label="RFID transmit power"
                  type="range"
                  min="10"
                  max="31.5"
                  step="0.5"
                  value={state.txPower}
                  onChange={(event) => onStateChange({ txPower: Number(event.target.value) })}
                  className="h-10 w-full accent-[#2f6f75]"
                />
              </Field>
              <Field label="Read Cadence">
                <select
                  aria-label="RFID read cadence"
                  className="input-field"
                  value={state.readIntervalMs}
                  onChange={(event) => onStateChange({ readIntervalMs: Number(event.target.value) })}
                >
                  <option value={250}>250 ms</option>
                  <option value={500}>500 ms</option>
                  <option value={750}>750 ms</option>
                  <option value={1000}>1 second</option>
                  <option value={2000}>2 seconds</option>
                </select>
              </Field>
              <Field label="Duplicate Window">
                <select
                  aria-label="RFID duplicate read window"
                  className="input-field"
                  value={state.duplicateWindowMs}
                  onChange={(event) => onStateChange({ duplicateWindowMs: Number(event.target.value) })}
                >
                  <option value={0}>Disabled</option>
                  <option value={1000}>1 second</option>
                  <option value={3000}>3 seconds</option>
                  <option value={5000}>5 seconds</option>
                  <option value={10000}>10 seconds</option>
                </select>
              </Field>
            </div>
          </section>

          <section className="grid grid-cols-2 border-b border-[#c7bcae] sm:grid-cols-4">
            <Metric icon={<Router size={16} />} label="Online" value={`${metrics.onlineEndpoints}/${metrics.configuredEndpoints}`} />
            <Metric icon={<ScanLine size={16} />} label="Tracked Tags" value={String(metrics.trackedTags)} />
            <Metric icon={<Activity size={16} />} label="Reads / Min" value={String(metrics.readsPerMinute)} />
            <Metric icon={<RadioTower size={16} />} label="Recent Events" value={String(metrics.eventCount)} />
          </section>

          <section className="border-b border-[#c7bcae] px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black">Endpoint Health</h3>
                <p className="mt-1 text-xs text-[#7d7569]">Reader assignments, effective state, and observed throughput.</p>
              </div>
              <button
                type="button"
                onClick={onRunDiagnostic}
                disabled={!state.enabled || endpoints.length === 0}
                className="flex min-h-10 items-center gap-2 rounded-md bg-[#45a3b8] px-3 py-2 text-xs font-black text-white transition hover:bg-[#3894a7] disabled:cursor-not-allowed disabled:bg-[#aaa093]"
              >
                <Play size={14} /> Run Virtual Signal Test
              </button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-md border border-[#c7bcae] bg-[#f7f3ec]">
              <table className="w-full min-w-[34rem] text-left text-xs">
                <thead className="border-b border-[#c7bcae] bg-[#e3dbcf] text-[10px] uppercase tracking-[0.16em] text-[#71695f]">
                  <tr>
                    <th className="px-3 py-2.5">Endpoint</th>
                    <th className="px-3 py-2.5">Reader ID</th>
                    <th className="px-3 py-2.5">Mode</th>
                    <th className="px-3 py-2.5">Power</th>
                    <th className="px-3 py-2.5">Rate</th>
                    <th className="px-3 py-2.5">State</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoints.map((endpoint) => {
                    const online = state.enabled && endpoint.rfidEnabled !== false && endpoint.automationState !== 'FAULT';
                    return (
                      <tr key={endpoint.id} className="border-b border-[#ded5c9] last:border-b-0">
                        <td className="px-3 py-3">
                          <button type="button" onClick={() => onSelectEndpoint(endpoint.id)} className="font-bold text-[#2f6f75] hover:underline">
                            {endpoint.name}
                          </button>
                        </td>
                        <td className="px-3 py-3 font-mono text-[#6f675d]">{endpoint.rfidReaderId || 'Unassigned'}</td>
                        <td className="px-3 py-3">{resolveEffectiveRfidMode(state.mode, endpoint.rfidMode)}</td>
                        <td className="px-3 py-3">{(endpoint.rfidPower ?? state.txPower).toFixed(1)} dBm</td>
                        <td className="px-3 py-3">{endpoint.rfidReadRate || 0}/min</td>
                        <td className="px-3 py-3"><StateBadge online={online} /></td>
                      </tr>
                    );
                  })}
                  {endpoints.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-[#7d7569]">No RFID endpoints placed in this layout.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black">Read Event Stream</h3>
                <p className="mt-1 text-xs text-[#7d7569]">Newest verified observations from the current session.</p>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-amber-500/35 bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800">
                <AlertTriangle size={13} /> Virtual gateway
              </div>
            </div>

            <div className="mt-4 divide-y divide-[#ded5c9] rounded-md border border-[#c7bcae] bg-[#f7f3ec]">
              {events.slice(0, 20).map((event) => (
                <div key={event.id} className="grid gap-2 px-3 py-3 text-xs sm:grid-cols-[1.2fr_1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-[#2b2925]">{event.itemName}</div>
                    <div className="mt-1 truncate font-mono text-[10px] text-[#7d7569]">{event.epc}</div>
                  </div>
                  <div className="min-w-0 text-[#6f675d]">
                    <div className="truncate">{event.antennaName}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.14em]">{event.direction} · {event.confidence}% confidence</div>
                  </div>
                  <time className="text-[10px] font-semibold text-[#8a8174]">{new Date(event.timestamp).toLocaleTimeString()}</time>
                </div>
              ))}
              {events.length === 0 && (
                <div className="px-3 py-8 text-center text-xs text-[#7d7569]">No read events in this session.</div>
              )}
            </div>
          </section>
        </div>

        <footer className="border-t border-[#c7bcae] bg-[#e3dbcf] px-5 py-3 text-xs leading-5 text-[#6f675d] sm:px-6">
          Hardware bridge status: not connected. System commands and diagnostics remain virtual until a supported reader gateway is configured.
        </footer>
      </aside>
    </div>
  );
};

const Field: React.FC<React.PropsWithChildren<{ label: string }>> = ({ label, children }) => (
  <label className="block">
    <div className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#71695f]">{label}</div>
    {children}
  </label>
);

const Metric: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="border-b border-r border-[#c7bcae] px-4 py-4 last:border-r-0 sm:border-b-0">
    <div className="flex items-center gap-2 text-[#4d7275]">{icon}<span className="text-[10px] font-black uppercase tracking-[0.16em]">{label}</span></div>
    <div className="mt-2 text-xl font-black text-[#2b2925]">{value}</div>
  </div>
);

const StatusDot: React.FC<{ active: boolean }> = ({ active }) => (
  <span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-emerald-600 shadow-[0_0_0_4px_rgba(5,150,105,0.13)]' : 'bg-[#9b9184]'}`} />
);

const StateBadge: React.FC<{ online: boolean }> = ({ online }) => (
  <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${online ? 'border-emerald-600/30 bg-emerald-50 text-emerald-800' : 'border-[#b6aa9b] bg-[#e6ded2] text-[#71695f]'}`}>
    {online ? 'Online' : 'Offline'}
  </span>
);

export default RfidCommandCenter;
