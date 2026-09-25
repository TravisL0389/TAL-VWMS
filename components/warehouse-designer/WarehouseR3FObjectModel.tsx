import React from 'react';
import { getWarehouse3DModelKind, type RenderableWarehouseObject } from './renderSceneAdapter';

interface WarehouseR3FObjectModelProps {
  object: RenderableWarehouseObject;
}

const WarehouseR3FObjectModel: React.FC<WarehouseR3FObjectModelProps> = ({ object }) => {
  switch (getWarehouse3DModelKind(object.type)) {
    case 'rack':
      return <RackModel object={object} />;
    case 'pallet':
      return <PalletModel object={object} />;
    case 'conveyor':
      return <ConveyorModel object={object} />;
    case 'pack-station':
      return <PackStationModel object={object} />;
    case 'forklift':
      return <ForkliftModel object={object} />;
    case 'amr':
      return <AmrModel object={object} />;
    case 'charging-station':
      return <ChargingStationModel object={object} />;
    case 'safety-barrier':
      return <SafetyBarrierModel object={object} />;
    case 'iot-sensor':
      return <SensorModel object={object} />;
    case 'camera':
      return <CameraModel object={object} />;
    case 'rfid-antenna':
      return <RfidAntennaModel object={object} />;
    case 'rfid-portal':
      return <RfidPortalModel object={object} />;
    case 'rfid-reader':
      return <RfidReaderModel object={object} />;
    case 'area':
      return <AreaModel object={object} />;
  }
};

const RackModel: React.FC<WarehouseR3FObjectModelProps> = ({ object }) => {
  const width = object.width;
  const depth = object.depth;
  const height = object.height || 16;
  const levels = Math.min(8, Math.max(1, object.shelfLevels || 4));
  const bays = Math.min(8, Math.max(1, object.bayCount || 3));
  const postThickness = Math.max(0.12, Math.min(0.28, width / 28));
  const beamThickness = Math.max(0.12, height / 90);
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

  return (
    <group>
      {Array.from({ length: bays + 1 }, (_, bayIndex) => {
        const x = -width / 2 + (width * bayIndex) / bays;
        return [-depth / 2, depth / 2].map((z) => (
          <mesh key={`post-${bayIndex}-${z}`} position={[x, height / 2, z]} castShadow>
            <boxGeometry args={[postThickness, height, postThickness]} />
            <meshStandardMaterial color={postColor} metalness={0.52} roughness={0.4} />
          </mesh>
        ));
      })}

      {!isAvRack && !isCartonFlow && Array.from({ length: bays + 1 }, (_, bayIndex) => (
        <group key={`protector-${bayIndex}`} position={[-width / 2 + (width * bayIndex) / bays, 0.55, 0]}>
          {[-depth / 2, depth / 2].map((z) => (
            <mesh key={z} position={[0, 0, z]} castShadow>
              <boxGeometry args={[postThickness * 2.5, 1.1, postThickness * 2.5]} />
              <meshStandardMaterial color="#e2b328" metalness={0.22} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}

      {Array.from({ length: levels }, (_, levelIndex) => {
        const y = ((levelIndex + 1) * height) / (levels + 0.35);
        return (
          <group key={`level-${levelIndex}`}>
            <mesh position={[0, y, 0]} castShadow receiveShadow>
              <boxGeometry args={[width, beamThickness, depth]} />
              <meshStandardMaterial color={shelfColor} metalness={0.34} roughness={0.58} />
            </mesh>
            {[-depth / 2, depth / 2].map((z) => (
              <mesh key={`beam-${z}`} position={[0, y + beamThickness, z]} castShadow>
                <boxGeometry args={[width, beamThickness * 1.8, postThickness * 1.25]} />
                <meshStandardMaterial color={beamColor} metalness={0.38} roughness={0.46} />
              </mesh>
            ))}
            {Array.from({ length: bays }, (_, bayIndex) => {
              const slotIndex = levelIndex * bays + bayIndex;
              if (slotIndex >= loadedSlots) return null;
              const bayWidth = width / bays;
              if (isCartonFlow) {
                return (
                  <group key={`bin-${slotIndex}`} position={[-width / 2 + bayWidth * (bayIndex + 0.5), y + Math.max(0.32, height / levels / 6), -depth * 0.18]} rotation-x={-0.08}>
                    <mesh castShadow>
                      <boxGeometry args={[bayWidth * 0.72, Math.max(0.48, height / levels / 3.5), depth * 0.5]} />
                      <meshStandardMaterial color={slotIndex % 3 === 0 ? '#c5a879' : '#aa8d63'} roughness={0.78} />
                    </mesh>
                  </group>
                );
              }
              if (isAvRack) {
                return (
                  <group key={`case-${slotIndex}`} position={[-width / 2 + bayWidth * (bayIndex + 0.5), y + Math.max(0.48, height / levels / 5), 0]}>
                    <mesh castShadow>
                      <boxGeometry args={[bayWidth * 0.78, Math.max(0.9, height / levels / 2.6), depth * 0.76]} />
                      <meshStandardMaterial color="#1f2425" metalness={0.28} roughness={0.48} />
                    </mesh>
                    <mesh position={[0, 0, -depth * 0.385]}>
                      <boxGeometry args={[bayWidth * 0.82, Math.max(0.96, height / levels / 2.5), 0.07]} />
                      <meshStandardMaterial color="#889091" metalness={0.72} roughness={0.3} wireframe />
                    </mesh>
                  </group>
                );
              }
              return (
                <mesh
                  key={`load-${slotIndex}`}
                  position={[-width / 2 + bayWidth * (bayIndex + 0.5), y + Math.max(0.45, height / levels / 5), 0]}
                  castShadow
                >
                  <boxGeometry args={[bayWidth * 0.72, Math.max(0.75, height / levels / 2.8), depth * 0.7]} />
                  <meshStandardMaterial color="#b88752" roughness={0.82} metalness={0.02} />
                </mesh>
              );
            })}
          </group>
        );
      })}
      {isAvRack && (
        <mesh position={[0, height * 0.62, -depth / 2 - 0.04]}>
          <boxGeometry args={[width * 0.96, height * 0.56, 0.06]} />
          <meshStandardMaterial color="#d7dcda" metalness={0.64} roughness={0.3} wireframe />
        </mesh>
      )}
    </group>
  );
};

const PalletModel: React.FC<WarehouseR3FObjectModelProps> = ({ object }) => {
  const palletHeight = Math.min(0.55, (object.height || 4) * 0.16);
  const loadCount = Math.min(12, Math.max(0, object.loadCount || 0));
  const columns = Math.max(1, Math.ceil(Math.sqrt(loadCount)));
  const rows = Math.max(1, Math.ceil(loadCount / columns));
  const boxWidth = object.width * 0.78 / columns;
  const boxDepth = object.depth * 0.78 / rows;

  return (
    <group>
      {Array.from({ length: 5 }, (_, index) => (
        <mesh key={`slat-${index}`} position={[0, palletHeight, -object.depth * 0.4 + (object.depth * 0.8 * index) / 4]} castShadow>
          <boxGeometry args={[object.width, palletHeight * 0.28, object.depth * 0.12]} />
          <meshStandardMaterial color="#9a683b" roughness={0.9} />
        </mesh>
      ))}
      {[-0.35, 0, 0.35].map((ratio) => (
        <mesh key={`runner-${ratio}`} position={[object.width * ratio, palletHeight / 2, 0]} castShadow>
          <boxGeometry args={[object.width * 0.12, palletHeight, object.depth * 0.86]} />
          <meshStandardMaterial color="#7e522f" roughness={0.92} />
        </mesh>
      ))}
      {Array.from({ length: loadCount }, (_, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        return (
          <mesh
            key={`case-${index}`}
            position={[
              -object.width * 0.39 + boxWidth * (column + 0.5),
              palletHeight + Math.max(0.45, (object.height || 4) * 0.22),
              -object.depth * 0.39 + boxDepth * (row + 0.5),
            ]}
            castShadow
          >
            <boxGeometry args={[boxWidth * 0.9, Math.max(0.8, (object.height || 4) * 0.42), boxDepth * 0.9]} />
            <meshStandardMaterial color={index % 3 === 0 ? '#c99a67' : '#b88752'} roughness={0.86} />
          </mesh>
        );
      })}
    </group>
  );
};

const ConveyorModel: React.FC<WarehouseR3FObjectModelProps> = ({ object }) => {
  const height = object.height || 3;
  const rollerCount = Math.min(36, Math.max(4, Math.round(object.width / 1.2)));
  return (
    <group>
      {[-object.depth / 2, object.depth / 2].map((z) => (
        <mesh key={`rail-${z}`} position={[0, height, z]} castShadow>
          <boxGeometry args={[object.width, 0.22, 0.24]} />
          <meshStandardMaterial color={object.color} metalness={0.54} roughness={0.38} />
        </mesh>
      ))}
      {Array.from({ length: rollerCount }, (_, index) => (
        <mesh
          key={`roller-${index}`}
          position={[-object.width / 2 + (object.width * (index + 0.5)) / rollerCount, height, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.16, 0.16, object.depth * 0.92, 10]} />
          <meshStandardMaterial color="#9da8a7" metalness={0.7} roughness={0.28} />
        </mesh>
      ))}
      {[-object.width * 0.42, object.width * 0.42].map((x) => (
        [-object.depth * 0.38, object.depth * 0.38].map((z) => (
          <mesh key={`leg-${x}-${z}`} position={[x, height / 2, z]} castShadow>
            <boxGeometry args={[0.22, height, 0.22]} />
            <meshStandardMaterial color="#687475" metalness={0.5} roughness={0.46} />
          </mesh>
        ))
      ))}
    </group>
  );
};

const PackStationModel: React.FC<WarehouseR3FObjectModelProps> = ({ object }) => {
  const worktopY = Math.max(2.6, (object.height || 7) * 0.45);
  return (
    <group>
      <mesh position={[0, worktopY, 0]} castShadow>
        <boxGeometry args={[object.width, 0.35, object.depth]} />
        <meshStandardMaterial color={object.color} roughness={0.52} metalness={0.22} />
      </mesh>
      {[-0.42, 0.42].flatMap((xRatio) => [-0.38, 0.38].map((zRatio) => (
        <mesh key={`${xRatio}-${zRatio}`} position={[object.width * xRatio, worktopY / 2, object.depth * zRatio]} castShadow>
          <boxGeometry args={[0.24, worktopY, 0.24]} />
          <meshStandardMaterial color="#596666" metalness={0.48} roughness={0.42} />
        </mesh>
      )))}
      <mesh position={[0, worktopY + 1.55, -object.depth * 0.28]} rotation={[-0.08, 0, 0]} castShadow>
        <boxGeometry args={[object.width * 0.34, 1.7, 0.18]} />
        <meshStandardMaterial color="#203238" emissive="#45a3b8" emissiveIntensity={0.42} roughness={0.25} />
      </mesh>
      <mesh position={[object.width * 0.3, worktopY + 0.45, 0]} castShadow>
        <boxGeometry args={[object.width * 0.2, 0.7, object.depth * 0.34]} />
        <meshStandardMaterial color="#d4c6b4" roughness={0.76} />
      </mesh>
    </group>
  );
};

const ForkliftModel: React.FC<WarehouseR3FObjectModelProps> = ({ object }) => {
  const height = object.height || 8;
  return (
    <group>
      <mesh position={[0, height * 0.28, object.depth * 0.12]} castShadow>
        <boxGeometry args={[object.width * 0.9, height * 0.48, object.depth * 0.46]} />
        <meshStandardMaterial color={object.color} metalness={0.24} roughness={0.5} />
      </mesh>
      <mesh position={[0, height * 0.66, object.depth * 0.16]} castShadow>
        <boxGeometry args={[object.width * 0.7, height * 0.38, object.depth * 0.28]} />
        <meshStandardMaterial color="#38484b" metalness={0.36} roughness={0.36} />
      </mesh>
      {[-object.width * 0.43, object.width * 0.43].map((x) => (
        <mesh key={`mast-${x}`} position={[x, height * 0.52, -object.depth * 0.35]} castShadow>
          <boxGeometry args={[0.18, height, 0.22]} />
          <meshStandardMaterial color="#424d4e" metalness={0.62} roughness={0.34} />
        </mesh>
      ))}
      {[-object.width * 0.28, object.width * 0.28].map((x) => (
        <mesh key={`fork-${x}`} position={[x, 0.28, -object.depth * 0.55]} castShadow>
          <boxGeometry args={[0.16, 0.18, object.depth * 0.62]} />
          <meshStandardMaterial color="#525b5b" metalness={0.68} roughness={0.3} />
        </mesh>
      ))}
      {[-object.width * 0.48, object.width * 0.48].flatMap((x) => [-object.depth * 0.05, object.depth * 0.32].map((z) => (
        <mesh key={`wheel-${x}-${z}`} position={[x, height * 0.18, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[height * 0.16, height * 0.16, 0.28, 18]} />
          <meshStandardMaterial color="#242827" roughness={0.9} />
        </mesh>
      )))}
    </group>
  );
};

const AmrModel: React.FC<WarehouseR3FObjectModelProps> = ({ object }) => {
  const height = object.height || 2;
  return (
    <group>
      <mesh position={[0, height * 0.42, 0]} castShadow>
        <cylinderGeometry args={[Math.min(object.width, object.depth) * 0.46, Math.min(object.width, object.depth) * 0.48, height * 0.72, 24]} />
        <meshStandardMaterial color={object.color} metalness={0.42} roughness={0.34} />
      </mesh>
      <mesh position={[0, height * 0.84, 0]} castShadow>
        <cylinderGeometry args={[Math.min(object.width, object.depth) * 0.36, Math.min(object.width, object.depth) * 0.36, height * 0.16, 24]} />
        <meshStandardMaterial color="#263a40" emissive="#45a3b8" emissiveIntensity={0.75} metalness={0.58} roughness={0.24} />
      </mesh>
      <mesh position={[0, height * 1.02, 0]}>
        <sphereGeometry args={[0.2, 14, 10]} />
        <meshStandardMaterial color="#dff7fb" emissive="#45a3b8" emissiveIntensity={1.6} />
      </mesh>
    </group>
  );
};

const ChargingStationModel: React.FC<WarehouseR3FObjectModelProps> = ({ object }) => (
  <group>
    <mesh position={[0, 0.16, 0]} receiveShadow>
      <boxGeometry args={[object.width, 0.32, object.depth]} />
      <meshStandardMaterial color="#4a5557" metalness={0.38} roughness={0.5} />
    </mesh>
    <mesh position={[0, (object.height || 4) / 2, object.depth * 0.36]} castShadow>
      <boxGeometry args={[object.width * 0.8, object.height || 4, object.depth * 0.18]} />
      <meshStandardMaterial color={object.color} metalness={0.46} roughness={0.36} />
    </mesh>
    <mesh position={[0, (object.height || 4) * 0.62, object.depth * 0.25]}>
      <boxGeometry args={[object.width * 0.42, (object.height || 4) * 0.24, 0.08]} />
      <meshStandardMaterial color="#dff7fb" emissive="#45a3b8" emissiveIntensity={1.1} />
    </mesh>
  </group>
);

const SafetyBarrierModel: React.FC<WarehouseR3FObjectModelProps> = ({ object }) => {
  const height = object.height || 4;
  const posts = Math.min(8, Math.max(2, Math.round(object.width / 5) + 1));
  return (
    <group>
      {Array.from({ length: posts }, (_, index) => (
        <mesh key={`post-${index}`} position={[-object.width / 2 + (object.width * index) / (posts - 1), height / 2, 0]} castShadow>
          <boxGeometry args={[0.28, height, Math.max(0.28, object.depth * 0.7)]} />
          <meshStandardMaterial color={object.color} metalness={0.36} roughness={0.48} />
        </mesh>
      ))}
      {[height * 0.35, height * 0.72].map((y) => (
        <mesh key={`rail-${y}`} position={[0, y, 0]} castShadow>
          <boxGeometry args={[object.width, 0.28, Math.max(0.22, object.depth * 0.48)]} />
          <meshStandardMaterial color={object.color} metalness={0.36} roughness={0.48} />
        </mesh>
      ))}
    </group>
  );
};

const SensorModel: React.FC<WarehouseR3FObjectModelProps> = ({ object }) => {
  const height = object.height || 10;
  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.13, height, 10]} />
        <meshStandardMaterial color="#677476" metalness={0.58} roughness={0.34} />
      </mesh>
      <mesh position={[0, height, 0]} castShadow>
        <sphereGeometry args={[Math.min(object.width, object.depth) * 0.32, 18, 12]} />
        <meshStandardMaterial color={object.color} emissive={object.color} emissiveIntensity={0.72} metalness={0.32} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[Math.min(object.width, object.depth) * 0.65, Math.min(object.width, object.depth) * 0.78, 32]} />
        <meshBasicMaterial color={object.color} transparent opacity={0.58} />
      </mesh>
    </group>
  );
};

const CameraModel: React.FC<WarehouseR3FObjectModelProps> = ({ object }) => {
  const height = object.height || 14;
  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.14, height, 10]} />
        <meshStandardMaterial color="#5b6262" metalness={0.54} roughness={0.36} />
      </mesh>
      <mesh position={[0, height, 0]} rotation-x={-0.25} castShadow>
        <boxGeometry args={[object.width * 0.72, object.width * 0.42, object.depth * 0.52]} />
        <meshStandardMaterial color="#d4d8d5" metalness={0.32} roughness={0.34} />
      </mesh>
      <mesh position={[0, height - object.width * 0.06, -object.depth * 0.28]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[object.width * 0.13, object.width * 0.13, 0.12, 18]} />
        <meshStandardMaterial color="#1d2d32" emissive="#45a3b8" emissiveIntensity={0.44} />
      </mesh>
    </group>
  );
};

const RfidAntennaModel: React.FC<WarehouseR3FObjectModelProps> = ({ object }) => {
  const height = object.height || 14;
  const active = object.rfidEnabled !== false && object.automationState !== 'FAULT';
  const signalColor = active ? '#36b98a' : '#8b8378';
  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, height, 12]} />
        <meshStandardMaterial color="#596665" metalness={0.62} roughness={0.34} />
      </mesh>
      <mesh position={[0, height, 0]} rotation={[-0.28, 0, 0]} castShadow>
        <boxGeometry args={[object.width * 0.78, 0.25, object.depth * 0.72]} />
        <meshStandardMaterial color="#d7dcda" emissive={signalColor} emissiveIntensity={active ? 0.22 : 0.02} metalness={0.24} roughness={0.42} />
      </mesh>
      {[0.62, 0.86, 1.1].map((scale) => (
        <mesh key={scale} position={[0, 0.05, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[Math.min(object.width, object.depth) * scale, Math.min(object.width, object.depth) * scale + 0.07, 40]} />
          <meshBasicMaterial color={signalColor} transparent opacity={active ? 0.42 / scale : 0.1} />
        </mesh>
      ))}
    </group>
  );
};

const RfidPortalModel: React.FC<WarehouseR3FObjectModelProps> = ({ object }) => {
  const height = object.height || 12;
  const active = object.rfidEnabled !== false && object.automationState !== 'FAULT';
  const signalColor = active ? '#36b98a' : '#8b8378';
  return (
    <group>
      {[-object.width * 0.44, object.width * 0.44].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, height / 2, 0]} castShadow>
            <boxGeometry args={[0.42, height, object.depth * 0.8]} />
            <meshStandardMaterial color="#394b4d" metalness={0.5} roughness={0.38} />
          </mesh>
          {[0.38, 0.68].map((ratio) => (
            <mesh key={ratio} position={[0, height * ratio, -object.depth * 0.42]} castShadow>
              <boxGeometry args={[object.width * 0.18, height * 0.2, 0.2]} />
              <meshStandardMaterial color="#d7dcda" emissive={signalColor} emissiveIntensity={active ? 0.28 : 0.02} roughness={0.38} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, height, 0]} castShadow>
        <boxGeometry args={[object.width, 0.38, object.depth * 0.5]} />
        <meshStandardMaterial color={object.color} metalness={0.48} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[object.width * 0.78, object.depth * 2.4]} />
        <meshBasicMaterial color={signalColor} transparent opacity={active ? 0.16 : 0.05} />
      </mesh>
    </group>
  );
};

const RfidReaderModel: React.FC<WarehouseR3FObjectModelProps> = ({ object }) => {
  const height = object.height || 6;
  const active = object.rfidEnabled !== false && object.automationState !== 'FAULT';
  const signalColor = active ? '#36b98a' : '#a55b52';
  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[object.width, height, object.depth]} />
        <meshStandardMaterial color="#4b5657" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, height * 0.66, -object.depth / 2 - 0.03]}>
        <boxGeometry args={[object.width * 0.62, height * 0.22, 0.08]} />
        <meshStandardMaterial color="#17282b" emissive={signalColor} emissiveIntensity={active ? 0.9 : 0.18} roughness={0.25} />
      </mesh>
      {[0, 1, 2].map((index) => (
        <mesh key={index} position={[-object.width * 0.22 + index * object.width * 0.22, height * 0.18, -object.depth / 2 - 0.06]}>
          <sphereGeometry args={[0.08, 10, 8]} />
          <meshStandardMaterial color={index === 0 ? signalColor : '#d0a95c'} emissive={index === 0 ? signalColor : '#d0a95c'} emissiveIntensity={0.65} />
        </mesh>
      ))}
    </group>
  );
};

const AreaModel: React.FC<WarehouseR3FObjectModelProps> = ({ object }) => {
  const isFloorArea = !['DOCK_DOOR'].includes(object.type);
  const height = isFloorArea ? 0.1 : Math.max(0.4, object.height || 1);
  return (
    <mesh position={[0, height / 2, 0]} receiveShadow castShadow={!isFloorArea}>
      <boxGeometry args={[object.width, height, object.depth]} />
      <meshStandardMaterial
        color={object.color}
        roughness={object.pbr.roughness}
        metalness={object.pbr.metallic}
        opacity={object.pbr.alpha}
        transparent={object.pbr.alpha < 1}
      />
    </mesh>
  );
};

export default WarehouseR3FObjectModel;
