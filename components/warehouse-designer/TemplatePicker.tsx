import React from 'react';
import { LayoutTemplatePreset, RackTemplateDefinition } from './warehouseTypes';

interface TemplatePickerProps {
  rackTemplates: RackTemplateDefinition[];
  layoutTemplates: LayoutTemplatePreset[];
  activeRackTemplateId: string;
  onSelectRackTemplate: (templateId: string) => void;
  onAddRackTemplate: () => void;
  onApplyLayoutTemplate: (templateId: string) => void;
}

const TemplatePicker: React.FC<TemplatePickerProps> = ({
  rackTemplates,
  layoutTemplates,
  activeRackTemplateId,
  onSelectRackTemplate,
  onAddRackTemplate,
  onApplyLayoutTemplate,
}) => (
  <div className="space-y-4">
    <div className="rounded-lg border border-[#c7bcae] bg-[#f7f3ec] p-4">
      <div className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#7d7569]">Rack Templates</div>
      <div className="space-y-2">
        {rackTemplates.map((template) => (
          <button type="button"
            key={template.id}
            onClick={() => onSelectRackTemplate(template.id)}
            className={`w-full rounded-lg border p-3 text-left transition ${
              template.id === activeRackTemplateId
                ? 'border-[#5d7f81] bg-[#dbe5e2]'
                : 'border-[#c7bcae] bg-[#ede6dc] hover:border-[#5d7f81] hover:bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              {template.referenceImage && (
                <img
                  src={template.referenceImage}
                  alt=""
                  className="h-16 w-20 shrink-0 rounded-md border border-[#c7bcae] bg-white object-cover"
                />
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[#2b2925]">{template.name}</div>
                <div className="mt-1 text-xs text-[#7d7569]">
                  {template.width} x {template.depth} · {template.height}h · {template.shelfLevels} levels
                </div>
                <div className="mt-2 inline-flex rounded-full border border-[#b6aa9b] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[#6f675d]">
                  Select
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs leading-5 text-[#6f675d]">{template.recommendedUse}</div>
          </button>
        ))}
      </div>
      <button type="button"
        onClick={onAddRackTemplate}
        className="mt-3 w-full rounded-xl bg-[#45a3b8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3894a7]"
      >
        Add Selected Rack
      </button>
    </div>

    <div className="rounded-lg border border-[#c7bcae] bg-[#f7f3ec] p-4">
      <div className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#7d7569]">Layout Templates</div>
      <div className="space-y-2">
        {layoutTemplates.map((template) => (
          <button type="button"
            key={template.id}
            onClick={() => onApplyLayoutTemplate(template.id)}
            className="w-full rounded-lg border border-[#c7bcae] bg-[#ede6dc] p-3 text-left transition hover:border-[#5d7f81] hover:bg-white"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[#2b2925]">{template.name}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8a8174]">{template.category}</div>
              </div>
              <span className="rounded-full border border-[#b6aa9b] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[#6f675d]">
                Apply
              </span>
            </div>
            <div className="mt-2 text-xs leading-5 text-[#6f675d]">{template.description}</div>
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default TemplatePicker;
