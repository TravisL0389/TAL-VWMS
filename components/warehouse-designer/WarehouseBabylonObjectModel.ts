import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import { getWarehouse3DModelKind, type RenderableWarehouseObject } from './renderSceneAdapter';

const MATERIAL_CACHE = new WeakMap<Scene, Map<string, PBRMaterial>>();

export function createBabylonWarehouseObject(scene: Scene, object: RenderableWarehouseObject): TransformNode {
  const root = new TransformNode(`${object.id}-root`, scene);
  root.position = new Vector3(object.x + object.width / 2, 0, object.y + object.depth / 2);
  root.rotation.y = ((object.rotation || 0) * Math.PI) / 180;

  switch (getWarehouse3DModelKind(object.type)) {
    case 'rack':
      createRack(scene, root, object);
      break;
    case 'pallet':
      createPallet(scene, root, object);
      break;
    case 'conveyor':
      createConveyor(scene, root, object);
      break;
    case 'pack-station':
      createPackStation(scene, root, object);
      break;
    case 'forklift':
      createForklift(scene, root, object);
      break;
    case 'amr':
      createAmr(scene, root, object);
      break;
    case 'charging-station':
      createCharger(scene, root, object);
      break;
    case 'safety-barrier':
      createBarrier(scene, root, object);
      break;
    case 'iot-sensor':
      createSensor(scene, root, object);
      break;
    case 'camera':
      createCamera(scene, root, object);
      break;
    case 'rfid-antenna':
      createRfidAntenna(scene, root, object);
      break;
    case 'rfid-portal':
      createRfidPortal(scene, root, object);
      break;
    case 'rfid-reader':
      createRfidReader(scene, root, object);
      break;
    case 'area':
      createArea(scene, root, object);
  }

  return root;
}

function createRack(scene: Scene, root: TransformNode, object: RenderableWarehouseObject) {
  const height = object.height || 16;
  const levels = Math.min(8, Math.max(1, object.shelfLevels || 4));
  const bays = Math.min(8, Math.max(1, object.bayCount || 3));
  const post = Math.max(0.12, Math.min(0.28, object.width / 28));
  const beam = Math.max(0.12, height / 90);
  const isAvRack = ['AUDIO_CASE_RACK', 'LIGHTING_RACK', 'VIDEO_EQUIPMENT_RACK'].includes(object.assetModel || '');
  const isCartonFlow = object.assetModel === 'CARTON_FLOW_RACK' || object.assetModel === 'SMALL_PARTS_SHELF';
  const postColor = object.assetModel === 'COLD_STORAGE_RACK'
    ? '#7da4b2'
    : isAvRack
      ? '#343b3e'
      : isCartonFlow
        ? '#365c70'
        : '#5f7d72';
  const beamColor = object.assetModel === 'SECURE_CAGE'
    ? '#9a9184'
    : isAvRack
      ? '#b73b35'
      : isCartonFlow
        ? '#3f5964'
        : '#df7728';
  const shelfColor = isAvRack ? '#646c6d' : isCartonFlow ? '#8b7b68' : '#a9ada6';
  const loadRatio = Math.min(1, (object.occupied || 0) / Math.max(1, object.capacity || 1));
  const loadedSlots = Math.round(levels * bays * loadRatio);

  for (let bay = 0; bay <= bays; bay += 1) {
    const x = -object.width / 2 + (object.width * bay) / bays;
    [-object.depth / 2, object.depth / 2].forEach((z, side) => {
      addBox(scene, root, `post-${bay}-${side}`, [post, height, post], [x, height / 2, z], postColor, 0.52, 0.4);
      if (!isAvRack && !isCartonFlow) {
        addBox(scene, root, `protector-${bay}-${side}`, [post * 2.5, 1.1, post * 2.5], [x, 0.55, z], '#e2b328', 0.22, 0.5);
      }
    });
  }

  for (let level = 0; level < levels; level += 1) {
    const y = ((level + 1) * height) / (levels + 0.35);
    addBox(scene, root, `shelf-${level}`, [object.width, beam, object.depth], [0, y, 0], shelfColor, 0.34, 0.58);
    [-object.depth / 2, object.depth / 2].forEach((z, side) => {
      addBox(scene, root, `beam-${level}-${side}`, [object.width, beam * 1.8, post * 1.25], [0, y + beam, z], beamColor, 0.38, 0.46);
    });
    for (let bay = 0; bay < bays; bay += 1) {
      const slotIndex = level * bays + bay;
      if (slotIndex >= loadedSlots) continue;
      const bayWidth = object.width / bays;
      const x = -object.width / 2 + bayWidth * (bay + 0.5);
      if (isCartonFlow) {
        addBox(scene, root, `bin-${slotIndex}`, [bayWidth * 0.72, Math.max(0.48, height / levels / 3.5), object.depth * 0.5], [x, y + Math.max(0.32, height / levels / 6), -object.depth * 0.18], slotIndex % 3 === 0 ? '#c5a879' : '#aa8d63', 0.02, 0.78);
      } else if (isAvRack) {
        addBox(scene, root, `case-${slotIndex}`, [bayWidth * 0.78, Math.max(0.9, height / levels / 2.6), object.depth * 0.76], [x, y + Math.max(0.48, height / levels / 5), 0], '#1f2425', 0.28, 0.48);
        addBox(scene, root, `case-trim-${slotIndex}`, [bayWidth * 0.82, 0.08, object.depth * 0.8], [x, y + Math.max(0.48, height / levels / 5), 0], '#889091', 0.72, 0.3);
      } else {
        addBox(scene, root, `load-${slotIndex}`, [bayWidth * 0.72, Math.max(0.75, height / levels / 2.8), object.depth * 0.7], [x, y + Math.max(0.45, height / levels / 5), 0], '#b88752', 0.02, 0.82);
      }
    }
  }
}

function createPallet(scene: Scene, root: TransformNode, object: RenderableWarehouseObject) {
  const palletHeight = Math.min(0.55, (object.height || 4) * 0.16);
  for (let index = 0; index < 5; index += 1) {
    addBox(
      scene,
      root,
      `slat-${index}`,
      [object.width, palletHeight * 0.28, object.depth * 0.12],
      [0, palletHeight, -object.depth * 0.4 + (object.depth * 0.8 * index) / 4],
      '#9a683b',
      0.02,
      0.9,
    );
  }
  [-0.35, 0, 0.35].forEach((ratio, index) => {
    addBox(scene, root, `runner-${index}`, [object.width * 0.12, palletHeight, object.depth * 0.86], [object.width * ratio, palletHeight / 2, 0], '#7e522f', 0.02, 0.92);
  });

  const loadCount = Math.min(12, Math.max(0, object.loadCount || 0));
  const columns = Math.max(1, Math.ceil(Math.sqrt(loadCount)));
  const rows = Math.max(1, Math.ceil(loadCount / columns));
  for (let index = 0; index < loadCount; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    addBox(
      scene,
      root,
      `case-${index}`,
      [object.width * 0.7 / columns, Math.max(0.8, (object.height || 4) * 0.42), object.depth * 0.7 / rows],
      [
        -object.width * 0.35 + (object.width * 0.7 * (column + 0.5)) / columns,
        palletHeight + Math.max(0.45, (object.height || 4) * 0.22),
        -object.depth * 0.35 + (object.depth * 0.7 * (row + 0.5)) / rows,
      ],
      index % 3 === 0 ? '#c99a67' : '#b88752',
      0.02,
      0.86,
    );
  }
}

function createConveyor(scene: Scene, root: TransformNode, object: RenderableWarehouseObject) {
  const height = object.height || 3;
  [-object.depth / 2, object.depth / 2].forEach((z, index) => {
    addBox(scene, root, `rail-${index}`, [object.width, 0.22, 0.24], [0, height, z], object.color, 0.54, 0.38);
  });
  const rollerCount = Math.min(36, Math.max(4, Math.round(object.width / 1.2)));
  for (let index = 0; index < rollerCount; index += 1) {
    const roller = MeshBuilder.CreateCylinder(`${object.id}-roller-${index}`, {
      diameter: 0.32,
      height: object.depth * 0.92,
      tessellation: 10,
    }, scene);
    roller.parent = root;
    roller.position = new Vector3(-object.width / 2 + (object.width * (index + 0.5)) / rollerCount, height, 0);
    roller.rotation.x = Math.PI / 2;
    roller.material = createMaterial(scene, `${object.id}-roller-material-${index}`, '#9da8a7', 0.7, 0.28);
  }
}

function createPackStation(scene: Scene, root: TransformNode, object: RenderableWarehouseObject) {
  const topY = Math.max(2.6, (object.height || 7) * 0.45);
  addBox(scene, root, 'worktop', [object.width, 0.35, object.depth], [0, topY, 0], object.color, 0.22, 0.52);
  [-0.42, 0.42].forEach((x) => [-0.38, 0.38].forEach((z) => {
    addBox(scene, root, `leg-${x}-${z}`, [0.24, topY, 0.24], [object.width * x, topY / 2, object.depth * z], '#596666', 0.48, 0.42);
  }));
  addBox(scene, root, 'display', [object.width * 0.34, 1.7, 0.18], [0, topY + 1.55, -object.depth * 0.28], '#203238', 0.28, 0.25, '#45a3b8');
}

function createForklift(scene: Scene, root: TransformNode, object: RenderableWarehouseObject) {
  const height = object.height || 8;
  addBox(scene, root, 'body', [object.width * 0.9, height * 0.48, object.depth * 0.46], [0, height * 0.28, object.depth * 0.12], object.color, 0.24, 0.5);
  addBox(scene, root, 'cab', [object.width * 0.7, height * 0.38, object.depth * 0.28], [0, height * 0.66, object.depth * 0.16], '#38484b', 0.36, 0.36);
  [-object.width * 0.43, object.width * 0.43].forEach((x, index) => {
    addBox(scene, root, `mast-${index}`, [0.18, height, 0.22], [x, height * 0.52, -object.depth * 0.35], '#424d4e', 0.62, 0.34);
  });
  [-object.width * 0.28, object.width * 0.28].forEach((x, index) => {
    addBox(scene, root, `fork-${index}`, [0.16, 0.18, object.depth * 0.62], [x, 0.28, -object.depth * 0.55], '#525b5b', 0.68, 0.3);
  });
}

function createAmr(scene: Scene, root: TransformNode, object: RenderableWarehouseObject) {
  const height = object.height || 2;
  const base = MeshBuilder.CreateCylinder(`${object.id}-base`, {
    diameter: Math.min(object.width, object.depth) * 0.94,
    height: height * 0.72,
    tessellation: 24,
  }, scene);
  base.parent = root;
  base.position.y = height * 0.42;
  base.material = createMaterial(scene, `${object.id}-base-material`, object.color, 0.42, 0.34);
  const beacon = MeshBuilder.CreateSphere(`${object.id}-beacon`, { diameter: 0.4, segments: 14 }, scene);
  beacon.parent = root;
  beacon.position.y = height * 1.02;
  beacon.material = createMaterial(scene, `${object.id}-beacon-material`, '#dff7fb', 0.12, 0.22, '#45a3b8');
}

function createCharger(scene: Scene, root: TransformNode, object: RenderableWarehouseObject) {
  addBox(scene, root, 'pad', [object.width, 0.32, object.depth], [0, 0.16, 0], '#4a5557', 0.38, 0.5);
  addBox(scene, root, 'back', [object.width * 0.8, object.height || 4, object.depth * 0.18], [0, (object.height || 4) / 2, object.depth * 0.36], object.color, 0.46, 0.36);
  addBox(scene, root, 'screen', [object.width * 0.42, (object.height || 4) * 0.24, 0.08], [0, (object.height || 4) * 0.62, object.depth * 0.25], '#dff7fb', 0.1, 0.24, '#45a3b8');
}

function createBarrier(scene: Scene, root: TransformNode, object: RenderableWarehouseObject) {
  const height = object.height || 4;
  const posts = Math.min(8, Math.max(2, Math.round(object.width / 5) + 1));
  for (let index = 0; index < posts; index += 1) {
    addBox(scene, root, `post-${index}`, [0.28, height, Math.max(0.28, object.depth * 0.7)], [-object.width / 2 + (object.width * index) / (posts - 1), height / 2, 0], object.color, 0.36, 0.48);
  }
  [height * 0.35, height * 0.72].forEach((y, index) => {
    addBox(scene, root, `rail-${index}`, [object.width, 0.28, Math.max(0.22, object.depth * 0.48)], [0, y, 0], object.color, 0.36, 0.48);
  });
}

function createSensor(scene: Scene, root: TransformNode, object: RenderableWarehouseObject) {
  const height = object.height || 10;
  const pole = MeshBuilder.CreateCylinder(`${object.id}-pole`, { diameterTop: 0.18, diameterBottom: 0.26, height, tessellation: 10 }, scene);
  pole.parent = root;
  pole.position.y = height / 2;
  pole.material = createMaterial(scene, `${object.id}-pole-material`, '#677476', 0.58, 0.34);
  const sensor = MeshBuilder.CreateSphere(`${object.id}-sensor`, { diameter: Math.min(object.width, object.depth) * 0.64, segments: 18 }, scene);
  sensor.parent = root;
  sensor.position.y = height;
  sensor.material = createMaterial(scene, `${object.id}-sensor-material`, object.color, 0.32, 0.28, object.color);
}

function createCamera(scene: Scene, root: TransformNode, object: RenderableWarehouseObject) {
  const height = object.height || 14;
  const pole = MeshBuilder.CreateCylinder(`${object.id}-pole`, { diameterTop: 0.2, diameterBottom: 0.28, height, tessellation: 10 }, scene);
  pole.parent = root;
  pole.position.y = height / 2;
  pole.material = createMaterial(scene, `${object.id}-pole-material`, '#5b6262', 0.54, 0.36);
  addBox(scene, root, 'camera', [object.width * 0.72, object.width * 0.42, object.depth * 0.52], [0, height, 0], '#d4d8d5', 0.32, 0.34);
}

function createRfidAntenna(scene: Scene, root: TransformNode, object: RenderableWarehouseObject) {
  const height = object.height || 14;
  const active = object.rfidEnabled !== false && object.automationState !== 'FAULT';
  const signal = active ? '#36b98a' : '#8b8378';
  const pole = MeshBuilder.CreateCylinder(`${object.id}-rfid-pole`, { diameterTop: 0.2, diameterBottom: 0.32, height, tessellation: 12 }, scene);
  pole.parent = root;
  pole.position.y = height / 2;
  pole.material = createMaterial(scene, `${object.id}-rfid-pole-material`, '#596665', 0.62, 0.34);
  addBox(scene, root, 'antenna-panel', [object.width * 0.78, 0.25, object.depth * 0.72], [0, height, 0], '#d7dcda', 0.24, 0.42, signal);
  [0.62, 0.86, 1.1].forEach((scale, index) => {
    const ring = MeshBuilder.CreateTorus(`${object.id}-coverage-${index}`, {
      diameter: Math.min(object.width, object.depth) * scale * 2,
      thickness: 0.06,
      tessellation: 40,
    }, scene);
    ring.parent = root;
    ring.position.y = 0.05;
    ring.material = createMaterial(scene, `${object.id}-coverage-material-${index}`, signal, 0.02, 0.5, signal, active ? 0.32 : 0.08);
  });
}

function createRfidPortal(scene: Scene, root: TransformNode, object: RenderableWarehouseObject) {
  const height = object.height || 12;
  const active = object.rfidEnabled !== false && object.automationState !== 'FAULT';
  const signal = active ? '#36b98a' : '#8b8378';
  [-object.width * 0.44, object.width * 0.44].forEach((x, side) => {
    addBox(scene, root, `portal-post-${side}`, [0.42, height, object.depth * 0.8], [x, height / 2, 0], '#394b4d', 0.5, 0.38);
    [0.38, 0.68].forEach((ratio, index) => {
      addBox(scene, root, `portal-panel-${side}-${index}`, [object.width * 0.18, height * 0.2, 0.2], [x, height * ratio, -object.depth * 0.42], '#d7dcda', 0.16, 0.38, signal);
    });
  });
  addBox(scene, root, 'portal-header', [object.width, 0.38, object.depth * 0.5], [0, height, 0], object.color, 0.48, 0.38);
  addBox(scene, root, 'portal-read-zone', [object.width * 0.78, 0.05, object.depth * 2.4], [0, 0.04, 0], signal, 0.02, 0.72, signal, active ? 0.16 : 0.04);
}

function createRfidReader(scene: Scene, root: TransformNode, object: RenderableWarehouseObject) {
  const height = object.height || 6;
  const active = object.rfidEnabled !== false && object.automationState !== 'FAULT';
  const signal = active ? '#36b98a' : '#a55b52';
  addBox(scene, root, 'reader-cabinet', [object.width, height, object.depth], [0, height / 2, 0], '#4b5657', 0.5, 0.4);
  addBox(scene, root, 'reader-screen', [object.width * 0.62, height * 0.22, 0.08], [0, height * 0.66, -object.depth / 2 - 0.03], '#17282b', 0.18, 0.25, signal);
  [0, 1, 2].forEach((index) => {
    const light = MeshBuilder.CreateSphere(`${object.id}-reader-light-${index}`, { diameter: 0.16, segments: 10 }, scene);
    light.parent = root;
    light.position = new Vector3(-object.width * 0.22 + index * object.width * 0.22, height * 0.18, -object.depth / 2 - 0.06);
    const color = index === 0 ? signal : '#d0a95c';
    light.material = createMaterial(scene, `${object.id}-reader-light-material-${index}`, color, 0.1, 0.28, color);
  });
}

function createArea(scene: Scene, root: TransformNode, object: RenderableWarehouseObject) {
  const floorArea = object.type !== 'DOCK_DOOR';
  const height = floorArea ? 0.1 : Math.max(0.4, object.height || 1);
  addBox(scene, root, 'area', [object.width, height, object.depth], [0, height / 2, 0], object.color, object.pbr.metallic, object.pbr.roughness, undefined, object.pbr.alpha);
}

function addBox(
  scene: Scene,
  root: TransformNode,
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  color: string,
  metallic: number,
  roughness: number,
  emissive?: string,
  alpha = 1,
) {
  const mesh = MeshBuilder.CreateBox(`${root.name}-${name}`, { width: size[0], height: size[1], depth: size[2] }, scene);
  mesh.parent = root;
  mesh.position = new Vector3(position[0], position[1], position[2]);
  mesh.material = createMaterial(scene, `${root.name}-${name}-material`, color, metallic, roughness, emissive, alpha);
  return mesh;
}

function createMaterial(
  scene: Scene,
  name: string,
  color: string,
  metallic: number,
  roughness: number,
  emissive?: string,
  alpha = 1,
): PBRMaterial {
  const key = [color, metallic, roughness, emissive || '', alpha].join('|');
  const sceneCache = MATERIAL_CACHE.get(scene) || new Map<string, PBRMaterial>();
  if (!MATERIAL_CACHE.has(scene)) MATERIAL_CACHE.set(scene, sceneCache);
  const cached = sceneCache.get(key);
  if (cached) return cached;

  const material = new PBRMaterial(name, scene);
  material.albedoColor = Color3.FromHexString(color);
  material.metallic = metallic;
  material.roughness = roughness;
  material.alpha = alpha;
  if (emissive) {
    material.emissiveColor = Color3.FromHexString(emissive);
    material.emissiveIntensity = 0.8;
  }
  material.transparencyMode = alpha < 1 ? PBRMaterial.PBRMATERIAL_ALPHABLEND : PBRMaterial.PBRMATERIAL_OPAQUE;
  sceneCache.set(key, material);
  return material;
}
