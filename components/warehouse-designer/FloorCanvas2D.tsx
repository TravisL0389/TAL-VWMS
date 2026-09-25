import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { DepartmentDef } from '../../types';
import {
  applyGridToObject,
  clampObjectToFloor,
  getConflictsForObject,
  getObjectColor,
} from './warehouseGeometry';
import FloorGrid from './FloorGrid';
import RackCard from './RackCard';
import type { CollisionIssue, WarehouseFloorDimensions, WarehouseFloorObject } from './warehouseTypes';

export interface FloorCanvasHandle {
  fitToView: () => void;
  resetView: () => void;
  focusObject: (objectId: string) => void;
}

interface FloorCanvas2DProps {
  dimensions: WarehouseFloorDimensions;
  objects: WarehouseFloorObject[];
  departments: DepartmentDef[];
  selectedObjectId: string | null;
  conflicts: CollisionIssue[];
  showLabels: boolean;
  showGrid: boolean;
  snapToGridEnabled: boolean;
  rfidSystemEnabled: boolean;
  onSelectObject: (objectId: string | null) => void;
  onMoveObject: (objectId: string, updater: (current: WarehouseFloorObject) => WarehouseFloorObject) => void;
}

const BASE_SCALE = 12;

const FloorCanvas2D = forwardRef<FloorCanvasHandle, FloorCanvas2DProps>(({
  dimensions,
  objects,
  departments,
  selectedObjectId,
  conflicts,
  showLabels,
  showGrid,
  snapToGridEnabled,
  rfidSystemEnabled,
  onSelectObject,
  onMoveObject,
}, ref) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    objectId: string;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const panStateRef = useRef<{
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 48, y: 48 });

  const contentWidth = dimensions.width * BASE_SCALE;
  const contentDepth = dimensions.depth * BASE_SCALE;

  const fitToView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const padding = 48;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const nextZoom = Math.max(
      0.35,
      Math.min(
        1.6,
        Math.min((width - padding * 2) / contentWidth, (height - padding * 2) / contentDepth),
      ),
    );

    setZoom(nextZoom);
    setPan({
      x: (width - contentWidth * nextZoom) / 2,
      y: (height - contentDepth * nextZoom) / 2,
    });
  }, [contentDepth, contentWidth]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 48, y: 48 });
  }, []);

  const focusObject = useCallback((objectId: string) => {
    const canvas = canvasRef.current;
    const object = objects.find((item) => item.id === objectId);
    if (!canvas || !object) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    setPan({
      x: width / 2 - (object.x * BASE_SCALE + (object.width * BASE_SCALE) / 2) * zoom,
      y: height / 2 - (object.y * BASE_SCALE + (object.depth * BASE_SCALE) / 2) * zoom,
    });
  }, [objects, zoom]);

  useImperativeHandle(ref, () => ({ fitToView, resetView, focusObject }), [fitToView, resetView, focusObject]);

  useEffect(() => {
    fitToView();
  }, [dimensions.width, dimensions.depth, fitToView]);

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (panStateRef.current) {
      const dx = clientX - panStateRef.current.startClientX;
      const dy = clientY - panStateRef.current.startClientY;
      setPan({
        x: panStateRef.current.originX + dx,
        y: panStateRef.current.originY + dy,
      });
    }

    if (dragStateRef.current) {
      const currentObject = objects.find((item) => item.id === dragStateRef.current?.objectId);
      if (!currentObject) return;

      const dx = (clientX - dragStateRef.current.startClientX) / zoom / BASE_SCALE;
      const dy = (clientY - dragStateRef.current.startClientY) / zoom / BASE_SCALE;

      onMoveObject(currentObject.id, (existing) => {
        const moved = {
          ...existing,
          x: dragStateRef.current!.originX + dx,
          y: dragStateRef.current!.originY + dy,
          isNew: existing.isNew ?? false,
        };
        const withGrid = snapToGridEnabled ? applyGridToObject(moved, dimensions, true) : clampObjectToFloor(moved, dimensions);
        return { ...withGrid, isNew: existing.isNew };
      });
    }
  }, [dimensions, objects, onMoveObject, snapToGridEnabled, zoom]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => handlePointerMove(event.clientX, event.clientY);
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches[0]) {
        event.preventDefault();
        handlePointerMove(event.touches[0].clientX, event.touches[0].clientY);
      }
    };
    const clearState = () => {
      dragStateRef.current = null;
      panStateRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', clearState);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', clearState);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', clearState);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', clearState);
    };
  }, [handlePointerMove]);

  const sortedObjects = useMemo(
    () => [...objects].sort((a, b) => {
      const layerA = getObjectLayer(a);
      const layerB = getObjectLayer(b);
      if (layerA !== layerB) return layerA - layerB;
      return a.y - b.y;
    }),
    [objects],
  );

  return (
    <div className="relative flex-1 overflow-hidden rounded-lg border border-[#b6aa9b] bg-[linear-gradient(180deg,#d9d2c7,#cfc7ba)] shadow-inner">
      <div
        ref={canvasRef}
        className="relative h-full min-h-[28rem] overflow-hidden touch-none"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onSelectObject(null);
            panStateRef.current = {
              startClientX: event.clientX,
              startClientY: event.clientY,
              originX: pan.x,
              originY: pan.y,
            };
          }
        }}
        onTouchStart={(event) => {
          if (event.target === event.currentTarget && event.touches[0]) {
            onSelectObject(null);
            panStateRef.current = {
              startClientX: event.touches[0].clientX,
              startClientY: event.touches[0].clientY,
              originX: pan.x,
              originY: pan.y,
            };
          }
        }}
        onWheel={(event) => {
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          const nextZoom = Math.max(0.3, Math.min(2.2, zoom * (event.deltaY < 0 ? 1.08 : 0.92)));
          const anchorX = event.clientX - rect.left;
          const anchorY = event.clientY - rect.top;
          const scale = nextZoom / zoom;
          setPan({
            x: anchorX - (anchorX - pan.x) * scale,
            y: anchorY - (anchorY - pan.y) * scale,
          });
          setZoom(nextZoom);
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          {showGrid && <FloorGrid dimensions={dimensions} scale={BASE_SCALE} />}
          {!showGrid && (
            <div
              className="absolute left-0 top-0 rounded-lg border border-[#9bafa9] bg-[#f7f3ec]"
              style={{ width: contentWidth, height: contentDepth }}
            />
          )}

          {sortedObjects.map((object) => {
            const objectConflicts = getConflictsForObject(object.id, conflicts);
            return (
              <RackCard
                key={object.id}
                object={object}
                color={getObjectColor(object, departments)}
                selected={selectedObjectId === object.id}
                showLabels={showLabels}
                conflictCount={objectConflicts.length}
                occupancyPercent={
                  object.type === 'RACK' && (object.capacity || 0) > 0
                    ? Math.round(((object.occupied || 0) / (object.capacity || 1)) * 100)
                    : 0
                }
                rfidSystemEnabled={rfidSystemEnabled}
                onSelect={() => onSelectObject(object.id)}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  const point = 'touches' in event ? event.touches[0] : event;
                  onSelectObject(object.id);
                  if (object.locked) return;
                  dragStateRef.current = {
                    objectId: object.id,
                    startClientX: point.clientX,
                    startClientY: point.clientY,
                    originX: object.x,
                    originY: object.y,
                  };
                }}
              />
            );
          }).map((card, index) => {
            const object = sortedObjects[index];
            return (
              <div
                key={object.id}
                className="absolute"
                style={{
                  left: object.x * BASE_SCALE,
                  top: object.y * BASE_SCALE,
                  width: object.width * BASE_SCALE,
                  height: object.depth * BASE_SCALE,
                }}
              >
                {card}
              </div>
            );
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-[#b6aa9b] bg-[#f7f3ec]/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f675d] shadow-sm">
        Drag objects to move · scroll to zoom · drag canvas to pan
      </div>
    </div>
  );
});

FloorCanvas2D.displayName = 'FloorCanvas2D';

function getObjectLayer(object: WarehouseFloorObject): number {
  if (object.type === 'ZONE') return 0;
  if (['AISLE', 'STAGING', 'RECEIVING', 'SHIPPING', 'OFFICE', 'RESTRICTED'].includes(object.type)) return 1;
  if (['IOT_SENSOR', 'CAMERA', 'RFID_ANTENNA', 'RFID_READER'].includes(object.type)) return 3;
  return 2;
}

export default FloorCanvas2D;
