import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { vastuZones } from '@/lib/vastuData';
import type { VastuZone } from '@/lib/vastuData';

const RADIUS = 2.0;
const ARC_WIDTH = 0.45;

function ZoneArc({
  zone,
  index,
  hoveredZone,
  setHoveredZone,
  setSelectedZone,
  clockOffset,
}: {
  zone: VastuZone;
  index: number;
  hoveredZone: string | null;
  setHoveredZone: (id: string | null) => void;
  setSelectedZone: (zone: VastuZone | null) => void;
  clockOffset: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startAngle = (index * Math.PI * 2) / 8 + Math.PI;
  const endAngle = ((index + 1) * Math.PI * 2) / 8 + Math.PI;
  const midAngle = (startAngle + endAngle) / 2;
  const isHovered = hoveredZone === zone.id;

  // create arc shape
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const inner = RADIUS - ARC_WIDTH / 2;
    const outer = RADIUS + ARC_WIDTH / 2;
    const segments = 16;
    s.moveTo(Math.cos(startAngle) * inner, Math.sin(startAngle) * inner);
    for (let i = 0; i <= segments; i++) {
      const a = startAngle + ((endAngle - startAngle) * i) / segments;
      s.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    }
    for (let i = segments; i >= 0; i--) {
      const a = startAngle + ((endAngle - startAngle) * i) / segments;
      s.lineTo(Math.cos(a) * inner, Math.sin(a) * inner);
    }
    s.closePath();
    return s;
  }, [startAngle, endAngle]);

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerEnter={() => setHoveredZone(zone.id)}
        onPointerLeave={() => setHoveredZone(null)}
        onClick={() => setSelectedZone(zone)}
      >
        <shapeGeometry args={[shape]} />
        <meshPhysicalMaterial
          color={zone.color}
          metalness={isHovered ? 0.3 : 0.1}
          roughness={0.4}
          transparent
          opacity={isHovered ? 1 : 0.8}
          emissive={zone.color}
          emissiveIntensity={isHovered ? 0.3 : 0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Text
        position={[Math.cos(midAngle) * (RADIUS + 1), 0.05, Math.sin(midAngle) * (RADIUS + 1)]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {zone.direction}
      </Text>
    </group>
  );
}

function CenterOrb() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2) * 0.05);
    }
  });
  return (
    <mesh ref={meshRef} position={[0, 0.05, 0]}>
      <sphereGeometry args={[0.35, 24, 24]} />
      <meshPhysicalMaterial
        color="#EA580C"
        emissive="#EA580C"
        emissiveIntensity={0.4}
        metalness={0.6}
        roughness={0.2}
      />
    </mesh>
  );
}

function CompassRings() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[RADIUS - 1, RADIUS + 1, 64]} />
        <meshBasicMaterial color="#1a1a1a" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <ringGeometry args={[RADIUS - 0.35, RADIUS + 0.35, 64]} />
        <meshBasicMaterial color="#222222" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Scene({
  hoveredZone,
  setHoveredZone,
  setSelectedZone,
}: {
  hoveredZone: string | null;
  setHoveredZone: (id: string | null) => void;
  setSelectedZone: (zone: VastuZone | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const mouseX = useRef(0);
  const mouseY = useRef(0);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += (mouseX.current * 0.02 - groupRef.current.rotation.y) * 0.02;
      groupRef.current.rotation.x += (mouseY.current * 0.02 - groupRef.current.rotation.x) * 0.02;
      if (!hoveredZone) {
        groupRef.current.rotation.y += 0.002;
      }
    }
  });

  const handlePointerMove = (e: any) => {
    mouseX.current = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY.current = (e.clientY / window.innerHeight) * 2 - 1;
  };

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      <directionalLight position={[-3, 5, -3]} intensity={0.3} color="#4ade80" />
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#EA580C" />
      <CompassRings />
      {vastuZones.map((zone, i) => (
        <ZoneArc
          key={zone.id}
          zone={zone}
          index={i}
          hoveredZone={hoveredZone}
          setHoveredZone={setHoveredZone}
          setSelectedZone={setSelectedZone}
          clockOffset={0}
        />
      ))}
      <CenterOrb />
      {/* N label */}
      <Text
        position={[0, 0.05, -(RADIUS + 1.5)]}
        fontSize={0.35}
        color="#EA580C"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        N
      </Text>
    </group>
  );
}

export default function VastuCompass3D({
  onZoneSelect,
}: {
  onZoneSelect?: (zone: VastuZone | null) => void;
}) {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<VastuZone | null>(null);

  const handleSelect = (zone: VastuZone | null) => {
    setSelectedZone(zone);
    onZoneSelect?.(zone);
  };

  return (
    <div className="h-[380px] w-full sm:h-[460px]">
      <Canvas
        camera={{ position: [0, 5, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene
          hoveredZone={hoveredZone}
          setHoveredZone={setHoveredZone}
          setSelectedZone={handleSelect}
        />
      </Canvas>
    </div>
  );
}
