import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Html, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture';
import '@babylonjs/core/Materials/Textures/Loaders/envTextureLoader';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { FxaaPostProcess } from '@babylonjs/core/PostProcesses/fxaaPostProcess';
import { ImageProcessingPostProcess } from '@babylonjs/core/PostProcesses/imageProcessingPostProcess';
import { Scene as BabylonScene } from '@babylonjs/core/scene';
import { ACESFilmicToneMapping, Plane, SRGBColorSpace, Vector3 as ThreeVector3 } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { Camera, Download, Layers3, Library, X } from 'lucide-react';
import type { DepartmentDef } from '../../types';
import { downloadFile } from '../../utils/storage';
import {
  buildWarehouseRenderScene,
  type RenderableWarehouseObject,
  type WarehouseRenderScene,
  type WarehouseRendererMode,
} from './renderSceneAdapter';
import type {
  RackTemplateDefinition,
  WarehouseAreaDefinition,
  WarehouseAssetDefinition,
  WarehouseFloorObject,
  WarehouseFloorPlan,
} from './warehouseTypes';
import { createBabylonWarehouseObject } from './WarehouseBabylonObjectModel';
import WarehouseR3FObjectModel from './WarehouseR3FObjectModel';
import Warehouse3DPlacementPanel from './Warehouse3DPlacementPanel';

interface Warehouse3DPreviewProps {
  open: boolean;
  plan: WarehouseFloorPlan;
  departments: DepartmentDef[];
  rackTemplates: RackTemplateDefinition[];
  assetDefinitions: WarehouseAssetDefinition[];
  areaDefinitions: WarehouseAreaDefinition[];
  selectedObjectId: string | null;
  dirty: boolean;
  snapToGridEnabled: boolean;
  onSelectObject: (objectId: string | null) => void;
  onMoveObject: (objectId: string, x: number, y: number) => void;
  onUpdateSelected: (patch: Partial<WarehouseFloorObject>) => void;
  onAddRack: (templateId: string) => void;
  onAddAsset: (assetId: string) => void;
  onAddArea: (type: WarehouseAreaDefinition['type']) => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onSave: () => void;
  onClose: () => void;
}

type CameraPreset = 'focus' | 'iso' | 'top' | 'walk';

const Warehouse3DPreview: React.FC<Warehouse3DPreviewProps> = ({
  open,
  plan,
  departments,
  rackTemplates,
  assetDefinitions,
  areaDefinitions,
  selectedObjectId,
  dirty,
  snapToGridEnabled,
  onSelectObject,
  onMoveObject,
  onUpdateSelected,
  onAddRack,
  onAddAsset,
  onAddArea,
  onDuplicateSelected,
  onDeleteSelected,
  onSave,
  onClose,
}) => {
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('focus');
  const [rendererMode, setRendererMode] = useState<WarehouseRendererMode>('r3f');
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [isDragging3D, setIsDragging3D] = useState(false);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const renderScene = useMemo(() => buildWarehouseRenderScene(plan, departments), [departments, plan]);
  const r3fCameraTarget = useMemo(() => getR3fCameraTarget(renderScene, cameraPreset), [cameraPreset, renderScene]);
  const selectedObject = useMemo(
    () => plan.objects.find((object) => object.id === selectedObjectId) || null,
    [plan.objects, selectedObjectId],
  );

  useEffect(() => {
    if (!open) setMobileToolsOpen(false);
  }, [open]);

  const webglAvailable = useMemo(() => {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  }, []);

  const exportScreenshot = () => {
    const canvas = canvasHostRef.current?.querySelector('canvas');
    if (!canvas) return;
    const href = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = href;
    link.download = `warehouse-3d-${plan.warehouseId}-${rendererMode}.png`;
    link.click();
  };

  const exportPlan = () => {
    downloadFile(`warehouse-3d-${plan.warehouseId}.json`, JSON.stringify(plan, null, 2), 'application/json');
  };

  const exportNativeScene = () => {
    downloadFile(
      `warehouse-babylon-native-${plan.warehouseId}.json`,
      JSON.stringify(renderScene, null, 2),
      'application/json',
    );
  };

  const placementPanel = (
    <Warehouse3DPlacementPanel
      dimensions={plan.dimensions}
      rackTemplates={rackTemplates}
      assets={assetDefinitions}
      areas={areaDefinitions}
      selectedObject={selectedObject}
      dirty={dirty}
      onAddRack={onAddRack}
      onAddAsset={onAddAsset}
      onAddArea={onAddArea}
      onUpdateSelected={onUpdateSelected}
      onDuplicateSelected={onDuplicateSelected}
      onDeleteSelected={onDeleteSelected}
      onSave={onSave}
    />
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[260] bg-[#091014]/88 backdrop-blur-sm">
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#b6aa9b] bg-[#ede6dc] px-4 py-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#7d7569]">3D Layout Studio</div>
            <div className="mt-1 text-lg font-black tracking-tight text-[#2b2925]">Warehouse Digital Twin Editor</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8174]">
              {rendererMode === 'babylon' ? 'Babylon.js PBR · HDR IBL · Post FX' : 'React Three Fiber placement mode'} · {plan.objects.length} objects · Grid snap {snapToGridEnabled ? 'on' : 'off'}
            </div>
          </div>
          <div className="app-scroll-x">
            <div className="flex min-w-max items-center gap-2">
              <PresetButton active={rendererMode === 'babylon'} onClick={() => setRendererMode('babylon')} label="Babylon.js PBR" />
              <PresetButton active={rendererMode === 'r3f'} onClick={() => setRendererMode('r3f')} label="R3F" />
              <PresetButton active={cameraPreset === 'focus'} onClick={() => setCameraPreset('focus')} label="Focus Assets" />
              <PresetButton active={cameraPreset === 'iso'} onClick={() => setCameraPreset('iso')} label="Isometric" />
              <PresetButton active={cameraPreset === 'top'} onClick={() => setCameraPreset('top')} label="Top Down" />
              <PresetButton active={cameraPreset === 'walk'} onClick={() => setCameraPreset('walk')} label="Walkthrough" />
              <PresetButton onClick={exportScreenshot} label="Export Screenshot" icon={<Download size={14} />} />
              <PresetButton onClick={exportPlan} label="Export Floor Plan" icon={<Layers3 size={14} />} />
              <PresetButton onClick={exportNativeScene} label="Export Babylon Native Scene" icon={<Layers3 size={14} />} />
              <PresetButton onClick={() => setMobileToolsOpen(true)} label="Objects" icon={<Library size={14} />} className="lg:hidden" />
              <button type="button"
                onClick={onClose}
                aria-label="Close 3D preview"
                className="flex min-h-10 items-center gap-2 rounded-lg border border-[#c7bcae] bg-[#f7f3ec] px-4 py-2.5 text-sm font-semibold text-[#5f5950] transition hover:border-[#5d7f81] hover:bg-white"
              >
                <X size={14} />
                Close
              </button>
            </div>
          </div>
        </div>

        <div ref={canvasHostRef} className="relative flex min-h-0 flex-1 overflow-hidden">
          <div className="hidden w-[21rem] min-h-0 shrink-0 flex-col lg:flex">{placementPanel}</div>

          <div className="relative min-w-0 flex-1">
            {!webglAvailable ? (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <div className="max-w-lg rounded-lg border border-[#233039] bg-[#10171b] p-8 text-[#e5ecec] shadow-2xl">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-[#13252b] text-[#8bd2df]">
                    <Camera size={24} />
                  </div>
                  <div className="text-xl font-black tracking-tight">WebGL is unavailable on this device</div>
                  <p className="mt-3 text-sm leading-6 text-[#9fb1b8]">
                    The 2D designer is still fully usable. You can continue editing the warehouse layout and export the floor plan JSON without 3D rendering.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {rendererMode === 'babylon' && (
                  <div className="absolute inset-0">
                    <BabylonRenderer renderScene={renderScene} cameraPreset={cameraPreset} active={rendererMode === 'babylon'} />
                  </div>
                )}
                {rendererMode === 'r3f' && (
                  <div className="absolute inset-0">
                    <Canvas
                      dpr={[1, 1.75]}
                      shadows="basic"
                      gl={{ antialias: true, preserveDrawingBuffer: true }}
                      onPointerMissed={() => onSelectObject(null)}
                      onCreated={({ gl }) => {
                        gl.toneMapping = ACESFilmicToneMapping;
                        gl.toneMappingExposure = 1.05;
                        gl.outputColorSpace = SRGBColorSpace;
                      }}
                    >
                      <color attach="background" args={['#0c1216']} />
                      <ambientLight intensity={0.35} />
                      <directionalLight castShadow position={[60, 80, 30]} intensity={1.35} shadow-mapSize={[2048, 2048]} />
                      <Environment preset="warehouse" />
                      <PerspectiveCamera makeDefault position={[70, 60, 70]} fov={45} />
                      <R3FScene
                        renderScene={renderScene}
                        cameraPreset={cameraPreset}
                        selectedObjectId={selectedObjectId}
                        onSelectObject={onSelectObject}
                        onMoveObject={onMoveObject}
                        onDraggingChange={setIsDragging3D}
                      />
                      <OrbitControls
                        target={r3fCameraTarget}
                        enabled={!isDragging3D}
                        enableDamping
                        dampingFactor={0.08}
                        maxPolarAngle={Math.PI / 2.05}
                      />
                      <WarehousePostProcessing />
                    </Canvas>
                  </div>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => setMobileToolsOpen(true)}
              className="absolute bottom-5 right-5 z-10 flex min-h-11 items-center gap-2 rounded-full bg-[#45a3b8] px-4 py-2.5 text-sm font-bold text-white shadow-xl lg:hidden"
            >
              <Library size={16} />
              Objects
            </button>
          </div>

          {mobileToolsOpen && (
            <div className="absolute inset-0 z-20 bg-[#091014]/55 backdrop-blur-sm lg:hidden" onClick={() => setMobileToolsOpen(false)}>
              <div
                className="absolute inset-x-0 bottom-0 flex max-h-[78dvh] flex-col overflow-hidden rounded-t-2xl border-t border-[#b6aa9b] bg-[#ede6dc]"
                role="dialog"
                aria-modal="true"
                aria-label="3D placement tools"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-[#b6aa9b] px-4 py-3 text-[#2b2925]">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7d7569]">3D Layout</div>
                    <div className="text-sm font-bold">Placement Tools</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileToolsOpen(false)}
                    aria-label="Close 3D placement tools"
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-[#6f675d] hover:bg-[#ddd5c8]"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">{placementPanel}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BabylonRenderer: React.FC<{ renderScene: WarehouseRenderScene; cameraPreset: CameraPreset; active: boolean }> = ({
  renderScene,
  cameraPreset,
  active,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let engine: Engine | null = null;
    let scene: BabylonScene | null = null;
    let camera: ArcRotateCamera | null = null;
    let environmentTexture: CubeTexture | null = null;
    let renderFrame: (() => void) | null = null;
    let disposed = false;
    const onResize = () => engine?.resize();

    const setupTimer = window.setTimeout(() => {
      if (disposed) return;

      engine = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: true,
      });
      scene = new BabylonScene(engine);
      scene.clearColor = new Color4(0.035, 0.06, 0.075, 1);
      scene.environmentIntensity = 0.92;
      environmentTexture = CubeTexture.CreateFromPrefilteredData(renderScene.environment.iblUrl, scene);
      scene.environmentTexture = environmentTexture;
      scene.imageProcessingConfiguration.exposure = renderScene.environment.exposure;
      scene.imageProcessingConfiguration.contrast = renderScene.environment.contrast;

      const center = new Vector3(renderScene.dimensions.width / 2, 0, renderScene.dimensions.depth / 2);
      camera = new ArcRotateCamera(
        'warehouse-camera',
        -Math.PI / 4,
        Math.PI / 3.1,
        Math.max(renderScene.dimensions.width, renderScene.dimensions.depth) * 1.35,
        center,
        scene,
      );
      camera.attachControl(canvas, true);
      camera.wheelPrecision = 42;
      camera.lowerRadiusLimit = 18;
      camera.upperRadiusLimit = Math.max(renderScene.dimensions.width, renderScene.dimensions.depth) * 2.4;

      new HemisphericLight('warehouse-ambient', new Vector3(0, 1, 0), scene).intensity = 0.35;
      const keyLight = new DirectionalLight('warehouse-key', new Vector3(-0.45, -1, -0.2), scene);
      keyLight.position = new Vector3(60, 95, 30);
      keyLight.intensity = 1.9;

      const imagePostProcess = new ImageProcessingPostProcess('warehouse-image-processing', 1, camera);
      imagePostProcess.exposure = renderScene.environment.exposure;
      imagePostProcess.contrast = renderScene.environment.contrast;
      imagePostProcess.toneMappingEnabled = true;
      imagePostProcess.vignetteEnabled = true;
      imagePostProcess.vignetteWeight = 1.35;
      imagePostProcess.vignetteColor = new Color4(0.02, 0.035, 0.045, 1);
      new FxaaPostProcess('warehouse-fxaa', 1, camera);

      const floor = MeshBuilder.CreateGround('warehouse-floor', {
        width: renderScene.dimensions.width,
        height: renderScene.dimensions.depth,
        subdivisions: 2,
      }, scene);
      floor.position = center;
      const floorMaterial = new PBRMaterial('floor-pbr', scene);
      floorMaterial.albedoColor = Color3.FromHexString('#b8b0a3');
      floorMaterial.metallic = 0.03;
      floorMaterial.roughness = 0.86;
      floor.material = floorMaterial;

      renderScene.objects.forEach((object) => createBabylonWarehouseObject(scene!, object));

      createBabylonBoundaryWalls(scene, renderScene);
      applyBabylonCameraPreset(camera, renderScene, cameraPreset);

      renderFrame = () => {
        if (activeRef.current) scene?.render();
      };
      window.addEventListener('resize', onResize);
      engine.runRenderLoop(renderFrame);
    }, 0);

    return () => {
      disposed = true;
      window.clearTimeout(setupTimer);
      window.removeEventListener('resize', onResize);
      if (engine && renderFrame) engine.stopRenderLoop(renderFrame);
      camera?.detachControl();
      let babylonDisposed = false;
      const disposeBabylon = () => {
        if (babylonDisposed) return;
        babylonDisposed = true;
        scene?.dispose();
        engine?.dispose();
        scene = null;
        engine = null;
      };
      const scheduleDispose = () => window.setTimeout(disposeBabylon, 0);
      if (environmentTexture && !environmentTexture.isReady()) {
        const deferredDisposeTimer = window.setTimeout(disposeBabylon, 10000);
        environmentTexture.onLoadObservable.addOnce(() => {
          window.clearTimeout(deferredDisposeTimer);
          scheduleDispose();
        });
        return;
      }
      scheduleDispose();
    };
  }, [cameraPreset, renderScene]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full"
      aria-label="Babylon.js PBR warehouse preview"
    />
  );
};

function applyBabylonCameraPreset(camera: ArcRotateCamera, renderScene: WarehouseRenderScene, preset: CameraPreset) {
  if (preset === 'focus') {
    const bounds = getAssetBounds(renderScene);
    camera.setTarget(new Vector3(bounds.centerX, Math.max(0, bounds.maxHeight * 0.3), bounds.centerZ));
    camera.alpha = -Math.PI / 4;
    camera.beta = Math.PI / 3.05;
    camera.radius = Math.max(18, bounds.span * 1.45);
    return;
  }
  camera.setTarget(new Vector3(renderScene.dimensions.width / 2, 0, renderScene.dimensions.depth / 2));
  if (preset === 'top') {
    camera.alpha = -Math.PI / 2;
    camera.beta = 0.08;
    camera.radius = Math.max(renderScene.dimensions.width, renderScene.dimensions.depth) * 1.08;
    return;
  }
  if (preset === 'walk') {
    camera.alpha = -Math.PI / 2;
    camera.beta = Math.PI / 2.25;
    camera.radius = Math.max(renderScene.dimensions.depth * 0.7, 35);
    return;
  }
  camera.alpha = -Math.PI / 4;
  camera.beta = Math.PI / 3.1;
  camera.radius = Math.max(renderScene.dimensions.width, renderScene.dimensions.depth) * 1.35;
}

function createBabylonBoundaryWalls(scene: BabylonScene, renderScene: WarehouseRenderScene) {
  const material = new PBRMaterial('boundary-wall-pbr', scene);
  material.albedoColor = Color3.FromHexString('#62717a');
  material.metallic = 0.08;
  material.roughness = 0.72;

  [
    { name: 'north-wall', width: renderScene.dimensions.width, height: 6, depth: 0.5, position: new Vector3(renderScene.dimensions.width / 2, 3, 0) },
    { name: 'south-wall', width: renderScene.dimensions.width, height: 6, depth: 0.5, position: new Vector3(renderScene.dimensions.width / 2, 3, renderScene.dimensions.depth) },
    { name: 'west-wall', width: 0.5, height: 6, depth: renderScene.dimensions.depth, position: new Vector3(0, 3, renderScene.dimensions.depth / 2) },
    { name: 'east-wall', width: 0.5, height: 6, depth: renderScene.dimensions.depth, position: new Vector3(renderScene.dimensions.width, 3, renderScene.dimensions.depth / 2) },
  ].forEach((wall) => {
    const mesh = MeshBuilder.CreateBox(wall.name, {
      width: wall.width,
      height: wall.height,
      depth: wall.depth,
    }, scene);
    mesh.position = wall.position;
    mesh.material = material;
  });
}

const R3FScene: React.FC<{
  renderScene: WarehouseRenderScene;
  cameraPreset: CameraPreset;
  selectedObjectId: string | null;
  onSelectObject: (objectId: string | null) => void;
  onMoveObject: (objectId: string, x: number, y: number) => void;
  onDraggingChange: (dragging: boolean) => void;
}> = ({
  renderScene,
  cameraPreset,
  selectedObjectId,
  onSelectObject,
  onMoveObject,
  onDraggingChange,
}) => (
  <>
    <CameraRig preset={cameraPreset} renderScene={renderScene} />
    <group position={[-renderScene.dimensions.width / 2, 0, -renderScene.dimensions.depth / 2]}>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[renderScene.dimensions.width / 2, 0, renderScene.dimensions.depth / 2]}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelectObject(null);
        }}
      >
        <planeGeometry args={[renderScene.dimensions.width, renderScene.dimensions.depth]} />
        <meshStandardMaterial color="#b8b0a3" roughness={0.96} metalness={0.05} />
      </mesh>

      <gridHelper
        args={[
          Math.max(renderScene.dimensions.width, renderScene.dimensions.depth),
          Math.round(Math.max(renderScene.dimensions.width, renderScene.dimensions.depth) / Math.max(renderScene.dimensions.gridSize, 1)),
          '#56727c',
          '#29414a',
        ]}
        position={[renderScene.dimensions.width / 2, 0.02, renderScene.dimensions.depth / 2]}
      />

      <ContactShadows
        position={[renderScene.dimensions.width / 2, 0.03, renderScene.dimensions.depth / 2]}
        scale={Math.max(renderScene.dimensions.width, renderScene.dimensions.depth) * 1.15}
        opacity={0.38}
        blur={2.4}
        far={45}
        frames={1}
      />

      {renderScene.objects.map((object) => (
        <WarehouseObjectMesh
          key={object.id}
          object={object}
          dimensions={renderScene.dimensions}
          selected={object.id === selectedObjectId}
          onSelect={onSelectObject}
          onMove={onMoveObject}
          onDraggingChange={onDraggingChange}
        />
      ))}

      <BoundaryWalls width={renderScene.dimensions.width} depth={renderScene.dimensions.depth} />
    </group>
  </>
);

const CameraRig: React.FC<{ preset: CameraPreset; renderScene: WarehouseRenderScene }> = ({ preset, renderScene }) => {
  const { camera, size } = useThree();
  const latestRenderScene = useRef(renderScene);

  useEffect(() => {
    latestRenderScene.current = renderScene;
  }, [renderScene]);

  useEffect(() => {
    const currentScene = latestRenderScene.current;
    const dimensions = currentScene.dimensions;
    const maxDimension = Math.max(dimensions.width, dimensions.depth);
    const portraitScale = Math.max(1, Math.min(1.8, size.height / Math.max(size.width, 1)));
    const target = getR3fCameraTarget(currentScene, preset);
    if (preset === 'focus') {
      const bounds = getAssetBounds(currentScene);
      camera.position.set(
        target[0] + bounds.span * portraitScale,
        target[1] + Math.max(12, bounds.span * 0.82) * portraitScale,
        target[2] + bounds.span * portraitScale,
      );
    } else if (preset === 'top') {
      camera.position.set(0, maxDimension * 1.05 * portraitScale, 0.1);
    } else if (preset === 'walk') {
      camera.position.set(0, 12, dimensions.depth / 2 + 14);
    } else {
      camera.position.set(
        maxDimension * 0.7 * portraitScale,
        maxDimension * 0.58 * portraitScale,
        maxDimension * 0.7 * portraitScale,
      );
    }
    camera.lookAt(target[0], target[1], target[2]);
  }, [camera, preset, renderScene.dimensions.depth, renderScene.dimensions.width, renderScene.objects.length, size.height, size.width]);
  return null;
};

function getR3fCameraTarget(renderScene: WarehouseRenderScene, preset: CameraPreset): [number, number, number] {
  if (preset !== 'focus') return [0, 0, 0];
  const bounds = getAssetBounds(renderScene);
  return [
    bounds.centerX - renderScene.dimensions.width / 2,
    Math.max(0, bounds.maxHeight * 0.3),
    bounds.centerZ - renderScene.dimensions.depth / 2,
  ];
}

function getAssetBounds(renderScene: WarehouseRenderScene) {
  const floorAreaTypes = new Set(['ZONE', 'AISLE', 'STAGING', 'RECEIVING', 'SHIPPING', 'OFFICE', 'RESTRICTED']);
  const assets = renderScene.objects.filter((object) => !floorAreaTypes.has(object.type));
  if (!assets.length) {
    return {
      centerX: renderScene.dimensions.width / 2,
      centerZ: renderScene.dimensions.depth / 2,
      maxHeight: 1,
      span: Math.max(renderScene.dimensions.width, renderScene.dimensions.depth),
    };
  }

  const minX = Math.min(...assets.map((object) => object.x));
  const maxX = Math.max(...assets.map((object) => object.x + object.width));
  const minZ = Math.min(...assets.map((object) => object.y));
  const maxZ = Math.max(...assets.map((object) => object.y + object.depth));
  return {
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    maxHeight: Math.max(...assets.map((object) => object.height || 1)),
    span: Math.max(14, maxX - minX, maxZ - minZ),
  };
}

const WarehousePostProcessing: React.FC = () => {
  const { gl, scene, camera, size } = useThree();
  const composer = useMemo(() => {
    const next = new EffectComposer(gl);
    next.addPass(new RenderPass(scene, camera));
    next.addPass(new SMAAPass());
    next.addPass(new OutputPass());
    return next;
  }, [camera, gl, scene]);

  useEffect(() => {
    composer.setSize(size.width, size.height);
    return () => composer.dispose();
  }, [composer, size.height, size.width]);

  useFrame(() => composer.render(), 1);
  return null;
};

interface WarehouseObjectMeshProps {
  object: RenderableWarehouseObject;
  dimensions: WarehouseRenderScene['dimensions'];
  selected: boolean;
  onSelect: (objectId: string | null) => void;
  onMove: (objectId: string, x: number, y: number) => void;
  onDraggingChange: (dragging: boolean) => void;
}

type PointerCaptureTarget = EventTarget & {
  setPointerCapture?: (pointerId: number) => void;
  releasePointerCapture?: (pointerId: number) => void;
};

const WarehouseObjectMesh: React.FC<WarehouseObjectMeshProps> = ({
  object,
  dimensions,
  selected,
  onSelect,
  onMove,
  onDraggingChange,
}) => {
  const width = object.width;
  const depth = object.depth;
  const height = object.type === 'RACK' ? object.height || 16 : Math.max(0.4, object.height || 1);
  const selectionHeight = ['ZONE', 'AISLE', 'STAGING', 'RECEIVING', 'SHIPPING', 'OFFICE', 'RESTRICTED'].includes(object.type)
    ? 0.18
    : height;
  const dragPlane = useMemo(() => new Plane(new ThreeVector3(0, 1, 0), 0), []);
  const dragOffset = useRef<{ x: number; y: number } | null>(null);

  const getFloorPoint = (event: ThreeEvent<PointerEvent>) => {
    const hit = new ThreeVector3();
    if (!event.ray.intersectPlane(dragPlane, hit)) return null;
    return {
      x: hit.x + dimensions.width / 2,
      y: hit.z + dimensions.depth / 2,
    };
  };

  const finishDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!dragOffset.current) return;
    event.stopPropagation();
    const target = event.target as PointerCaptureTarget;
    target.releasePointerCapture?.(event.pointerId);
    dragOffset.current = null;
    onDraggingChange(false);
  };

  return (
    <group
      position={[object.x + width / 2, 0, object.y + depth / 2]}
      rotation={[0, ((object.rotation || 0) * Math.PI) / 180, 0]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect(object.id);
        if (object.locked) return;
        const point = getFloorPoint(event);
        if (!point) return;
        dragOffset.current = { x: point.x - object.x, y: point.y - object.y };
        const target = event.target as PointerCaptureTarget;
        target.setPointerCapture?.(event.pointerId);
        onDraggingChange(true);
      }}
      onPointerMove={(event) => {
        if (!dragOffset.current || object.locked) return;
        event.stopPropagation();
        const point = getFloorPoint(event);
        if (!point) return;
        onMove(object.id, point.x - dragOffset.current.x, point.y - dragOffset.current.y);
      }}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      <mesh position={[0, selectionHeight / 2, 0]}>
        <boxGeometry args={[width, Math.max(0.5, selectionHeight), depth]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <WarehouseR3FObjectModel object={object} />

      {selected && (
        <mesh position={[0, selectionHeight / 2, 0]}>
          <boxGeometry args={[width + 0.5, selectionHeight + 0.5, depth + 0.5]} />
          <meshBasicMaterial color="#72d8ea" transparent opacity={0.3} wireframe depthTest={false} />
        </mesh>
      )}

      {object.status && (
        <Html position={[0, Math.max(1.5, height + 1.8), 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div className="pointer-events-none rounded-full border border-white/10 bg-[#10171b]/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-lg">
            {object.status}
          </div>
        </Html>
      )}

      <Html position={[0, Math.max(0.8, height + 0.7), 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
        <div className="pointer-events-none rounded-full border border-white/10 bg-[#10171b]/85 px-2 py-1 text-[10px] font-semibold text-white shadow-lg">
          {object.name}
        </div>
      </Html>
    </group>
  );
};

const BoundaryWalls: React.FC<{ width: number; depth: number }> = ({ width, depth }) => (
  <group>
    <mesh position={[width / 2, 3, 0]}>
      <boxGeometry args={[width, 6, 0.5]} />
      <meshStandardMaterial color="#62717a" roughness={0.8} metalness={0.1} />
    </mesh>
    <mesh position={[width / 2, 3, depth]}>
      <boxGeometry args={[width, 6, 0.5]} />
      <meshStandardMaterial color="#62717a" roughness={0.8} metalness={0.1} />
    </mesh>
    <mesh position={[0, 3, depth / 2]}>
      <boxGeometry args={[0.5, 6, depth]} />
      <meshStandardMaterial color="#62717a" roughness={0.8} metalness={0.1} />
    </mesh>
    <mesh position={[width, 3, depth / 2]}>
      <boxGeometry args={[0.5, 6, depth]} />
      <meshStandardMaterial color="#62717a" roughness={0.8} metalness={0.1} />
    </mesh>
  </group>
);

const PresetButton: React.FC<{
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  active?: boolean;
  className?: string;
}> = ({
  label,
  onClick,
  icon,
  active = false,
  className = '',
}) => (
  <button type="button"
    onClick={onClick}
    className={`flex min-h-10 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${className} ${
      active
        ? 'bg-[#5d7f81] text-white'
        : 'border border-[#c7bcae] bg-[#f7f3ec] text-[#5f5950] hover:border-[#5d7f81] hover:bg-white'
    }`}
  >
    {icon}
    {label}
  </button>
);

export default Warehouse3DPreview;
