import React from 'react';
import type { DepartmentDef } from '../../types';

interface ZoneLegendProps {
  departments: DepartmentDef[];
}

const ZoneLegend: React.FC<ZoneLegendProps> = ({ departments }) => (
  <div className="rounded-lg border border-[#c7bcae] bg-[#f7f3ec] p-4">
    <div className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#7d7569]">Zone Legend</div>
    <div className="space-y-2">
      {departments.map((department) => (
        <div key={department.id} className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: department.color }} />
          <span className="min-w-0 flex-1 truncate text-sm text-[#4f4a43]">{department.label}</span>
          <span className="rounded-full border border-[#b6aa9b] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[#6f675d]">
            {department.prefix}
          </span>
        </div>
      ))}
    </div>
    <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-[#6f675d] min-[481px]:grid-cols-3">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        Operational
      </div>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        Maintenance
      </div>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
        Offline
      </div>
    </div>
  </div>
);

export default ZoneLegend;
