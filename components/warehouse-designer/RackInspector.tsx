import React from 'react';
import { Copy, Crosshair, Trash2, Wand2 } from 'lucide-react';
import type { DepartmentDef, RackStatus, RfidSystemMode, WarehouseAutomationState } from '../../types';
import type { CollisionIssue, WarehouseFloorObject } from './warehouseTypes';
import { getObjectLabel } from './warehouseGeometry';

interface RackInspectorProps {
  object: WarehouseFloorObject | null;
  departments: DepartmentDef[];
  conflicts: CollisionIssue[];
  onChange: (patch: Partial<WarehouseFloorObject>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringIntoView: () => void;
  onFixSpacing: () => void;
}

const STATUS_OPTIONS: RackStatus[] = ['OPERATIONAL', 'MAINTENANCE', 'OFFLINE'];
const AUTOMATION_STATES: WarehouseAutomationState[] = ['ACTIVE', 'IDLE', 'CHARGING', 'FAULT'];
const RFID_MODES: RfidSystemMode[] = ['AUTO', 'INTAKE', 'OUTTAKE', 'CYCLE_COUNT', 'MAINTENANCE'];

const RackInspector: React.FC<RackInspectorProps> = ({
  object,
  departments,
  conflicts,
  onChange,
  onDelete,
  onDuplicate,
  onBringIntoView,
  onFixSpacing,
}) => {
  if (!object) {
    return (
      <div className="rounded-lg border border-dashed border-[#b6aa9b] bg-[#f7f3ec] p-4 text-sm leading-6 text-[#7d7569]">
        Select a rack, pallet, robot, zone, aisle, or support area to edit its placement and operating details.
      </div>
    );
  }

  const isRfidEndpoint = ['RFID_ANTENNA', 'RFID_PORTAL', 'RFID_READER'].includes(object.type);

  return (
    <div className="space-y-4 rounded-lg border border-[#c7bcae] bg-[#f7f3ec] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7d7569]">Selection Inspector</div>
          <div className="mt-2 text-lg font-black tracking-tight text-[#2b2925]">{object.name}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8a8174]">{getObjectLabel(object.type)}</div>
        </div>
        {conflicts.length > 0 && (
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300">
            {conflicts.length} conflict{conflicts.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 min-[481px]:grid-cols-2">
        <Field label="Name">
          <input
            value={object.name}
            onChange={(event) => onChange({ name: event.target.value })}
            className="input-field"
          />
        </Field>
        <Field label="Type">
          <div className="input-field flex items-center bg-[#e6ded2]">{getObjectLabel(object.type)}</div>
        </Field>
        <Field label="Department / Zone">
          <select
            value={object.departmentId || ''}
            onChange={(event) => onChange({ departmentId: event.target.value || undefined })}
            className="input-field"
          >
            <option value="">Unassigned</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            value={object.status || 'OPERATIONAL'}
            onChange={(event) => onChange({ status: event.target.value as RackStatus })}
            className="input-field"
            disabled={object.type !== 'RACK'}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Automation">
          <select
            value={object.automationState || 'IDLE'}
            onChange={(event) => onChange({ automationState: event.target.value as WarehouseAutomationState })}
            className="input-field"
            disabled={!object.automationState && !['CONVEYOR', 'PACK_STATION', 'FORKLIFT', 'AMR', 'CHARGING_STATION', 'IOT_SENSOR', 'CAMERA', 'RFID_ANTENNA', 'RFID_PORTAL', 'RFID_READER'].includes(object.type)}
          >
            {AUTOMATION_STATES.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </Field>
        <Field label="Position Lock">
          <select
            value={object.locked ? 'LOCKED' : 'EDITABLE'}
            onChange={(event) => onChange({ locked: event.target.value === 'LOCKED' })}
            className="input-field"
          >
            <option value="EDITABLE">Editable</option>
            <option value="LOCKED">Locked</option>
          </select>
        </Field>
        <Field label="Width">
          <NumberInput value={object.width} onChange={(value) => onChange({ width: value })} />
        </Field>
        <Field label="Depth">
          <NumberInput value={object.depth} onChange={(value) => onChange({ depth: value })} />
        </Field>
        <Field label="Height">
          <NumberInput value={object.height || 1} onChange={(value) => onChange({ height: value })} />
        </Field>
        <Field label="Rotation">
          <NumberInput value={object.rotation || 0} onChange={(value) => onChange({ rotation: value })} />
        </Field>
        <Field label="X">
          <NumberInput value={object.x} onChange={(value) => onChange({ x: value })} />
        </Field>
        <Field label="Y">
          <NumberInput value={object.y} onChange={(value) => onChange({ y: value })} />
        </Field>
        <Field label="Capacity">
          <NumberInput value={object.capacity || 0} onChange={(value) => onChange({ capacity: value })} />
        </Field>
        <Field label="Occupied">
          <NumberInput value={object.occupied || 0} onChange={(value) => onChange({ occupied: value })} />
        </Field>
        {object.type === 'RACK' && (
          <>
            <Field label="Shelf Levels">
              <NumberInput value={object.shelfLevels || 1} min={1} step={1} onChange={(value) => onChange({ shelfLevels: Math.round(value) })} />
            </Field>
            <Field label="Rack Bays">
              <NumberInput value={object.bayCount || 1} min={1} step={1} onChange={(value) => onChange({ bayCount: Math.round(value) })} />
            </Field>
          </>
        )}
        {object.type === 'PALLET' && (
          <Field label="Load Units">
            <NumberInput value={object.loadCount || 0} min={0} step={1} onChange={(value) => onChange({ loadCount: Math.round(value) })} />
          </Field>
        )}
        {['IOT_SENSOR', 'CAMERA', 'RFID_ANTENNA', 'RFID_PORTAL'].includes(object.type) && (
          <Field label="Sensor Range">
            <NumberInput value={object.sensorRange || 0} min={0} onChange={(value) => onChange({ sensorRange: value })} />
          </Field>
        )}
        {isRfidEndpoint && (
          <>
            <Field label="Endpoint Power">
              <button
                type="button"
                aria-pressed={object.rfidEnabled !== false}
                onClick={() => onChange({ rfidEnabled: object.rfidEnabled === false })}
                className={`input-field flex items-center justify-between text-left font-semibold ${object.rfidEnabled !== false ? 'text-emerald-800' : 'text-[#71695f]'}`}
              >
                <span>{object.rfidEnabled !== false ? 'Enabled' : 'Disabled'}</span>
                <span className={`relative h-6 w-11 rounded-full transition ${object.rfidEnabled !== false ? 'bg-[#2f6f5e]' : 'bg-[#b6aa9b]'}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${object.rfidEnabled !== false ? 'left-[1.35rem]' : 'left-0.5'}`} />
                </span>
              </button>
            </Field>
            <Field label="Reader ID">
              <input
                value={object.rfidReaderId || ''}
                onChange={(event) => onChange({ rfidReaderId: event.target.value })}
                className="input-field font-mono"
                placeholder="RFID-READER-01"
              />
            </Field>
            <Field label="RFID Mode">
              <select
                value={object.rfidMode || 'AUTO'}
                onChange={(event) => onChange({ rfidMode: event.target.value as RfidSystemMode })}
                className="input-field"
              >
                {RFID_MODES.map((mode) => <option key={mode} value={mode}>{mode.replace('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="TX Power dBm">
              <NumberInput value={object.rfidPower || 24} min={10} step={0.5} onChange={(value) => onChange({ rfidPower: Math.min(31.5, value) })} />
            </Field>
            <Field label="Reads / Minute">
              <div className="input-field flex items-center bg-[#e6ded2] font-mono">{object.rfidReadRate || 0}</div>
            </Field>
          </>
        )}
      </div>

      <Field label="Notes">
        <textarea
          value={object.notes || ''}
          onChange={(event) => onChange({ notes: event.target.value })}
          className="input-field min-h-24 resize-y"
        />
      </Field>

      {conflicts.length > 0 && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-100">
          <div className="mb-2 font-semibold">Conflict list</div>
          <ul className="space-y-1 text-xs leading-5 text-red-200">
            {conflicts.map((conflict) => (
              <li key={`${conflict.sourceId}-${conflict.targetId}`}>{conflict.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 min-[481px]:grid-cols-2">
        <ActionButton icon={<Copy size={14} />} label="Duplicate" onClick={onDuplicate} />
        <ActionButton icon={<Crosshair size={14} />} label="Bring Into View" onClick={onBringIntoView} />
        <ActionButton icon={<Wand2 size={14} />} label="Fix Spacing" onClick={onFixSpacing} />
        <ActionButton
          icon={<Trash2 size={14} />}
          label="Delete"
          onClick={onDelete}
          danger
        />
      </div>
    </div>
  );
};

const Field: React.FC<React.PropsWithChildren<{ label: string }>> = ({ label, children }) => (
  <label className="block">
    <div className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#7d7569]">{label}</div>
    {children}
  </label>
);

const NumberInput: React.FC<{ value: number; onChange: (next: number) => void; min?: number; step?: number }> = ({ value, onChange, min, step }) => (
  <input
    type="number"
    min={min}
    step={step}
    value={Number.isFinite(value) ? value : 0}
    onChange={(event) => onChange(Number(event.target.value))}
    className="input-field"
  />
);

const ActionButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }> = ({
  icon,
  label,
  onClick,
  danger = false,
}) => (
  <button type="button"
    onClick={onClick}
    className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
      danger
        ? 'border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20'
        : 'border border-[#c7bcae] bg-[#ede6dc] text-[#5f5950] hover:border-[#5d7f81] hover:bg-white'
    }`}
  >
    {icon}
    {label}
  </button>
);

export default RackInspector;
