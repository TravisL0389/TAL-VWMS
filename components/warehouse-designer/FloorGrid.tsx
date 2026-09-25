import React from 'react';
import type { WarehouseFloorDimensions } from './warehouseTypes';

interface FloorGridProps {
  dimensions: WarehouseFloorDimensions;
  scale: number;
}

const FloorGrid: React.FC<FloorGridProps> = ({ dimensions, scale }) => {
  const majorStep = Math.max(dimensions.gridSize * 2, 10);
  const labelsX = Array.from({ length: Math.floor(dimensions.width / majorStep) + 1 }, (_, index) => index * majorStep);
  const labelsY = Array.from({ length: Math.floor(dimensions.depth / majorStep) + 1 }, (_, index) => index * majorStep);

  return (
    <div
      className="absolute left-0 top-0 rounded-lg border border-[#9bafa9] bg-[#f7f3ec] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)]"
      style={{
        width: dimensions.width * scale,
        height: dimensions.depth * scale,
      }}
    >
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          backgroundImage: `
            linear-gradient(rgba(93,127,129,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(93,127,129,0.12) 1px, transparent 1px),
            linear-gradient(rgba(93,127,129,0.26) 1px, transparent 1px),
            linear-gradient(90deg, rgba(93,127,129,0.26) 1px, transparent 1px)
          `,
          backgroundSize: `${dimensions.gridSize * scale}px ${dimensions.gridSize * scale}px, ${dimensions.gridSize * scale}px ${dimensions.gridSize * scale}px, ${majorStep * scale}px ${majorStep * scale}px, ${majorStep * scale}px ${majorStep * scale}px`,
        }}
      />

      {labelsX.map((value) => (
        <div
          key={`x-${value}`}
          className="absolute top-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5d7f81]"
          style={{ left: value * scale + 6 }}
        >
          {value}
        </div>
      ))}

      {labelsY.map((value) => (
        <div
          key={`y-${value}`}
          className="absolute left-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5d7f81]"
          style={{ top: value * scale + 6 }}
        >
          {value}
        </div>
      ))}

      <div className="absolute bottom-3 right-4 rounded-full border border-[#b6aa9b] bg-[#ede6dc]/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5f5950]">
        {dimensions.width} × {dimensions.depth} {dimensions.unit}
      </div>
    </div>
  );
};

export default FloorGrid;
