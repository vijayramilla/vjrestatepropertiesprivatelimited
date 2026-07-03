import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Text } from '@react-three/drei';
import type { AmortRow } from './types';
import * as THREE from 'three';

function Bar({
  position,
  height,
  color,
}: {
  position: [number, number, number];
  height: number;
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const maxHeight = Math.max(height, 0.1);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.05;
    }
  });

  return (
    <mesh position={[position[0], position[1] + maxHeight / 2, position[2]]} ref={meshRef}>
      <boxGeometry args={[0.6, maxHeight, 0.6]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
    </mesh>
  );
}

function AmortizationScene({ data }: { data: AmortRow[] }) {
  const maxVal = useMemo(() => Math.max(...data.map((r) => r.principalPaid + r.interestPaid), 1), [data]);
  const bars = useMemo(() => {
    return data.map((row, i) => {
      const x = (i - data.length / 2) * 1.2;
      const z = 0;
      const principalHeight = (row.principalPaid / maxVal) * 3;
      const interestHeight = (row.interestPaid / maxVal) * 3;
      return {
        key: row.year,
        x,
        z,
        principalHeight: Math.max(principalHeight, 0.05),
        interestHeight: Math.max(interestHeight, 0.05),
        interestY: principalHeight,
      };
    });
  }, [data, maxVal]);

  return (
    <group>
      {bars.map((bar) => (
        <group key={bar.key}>
          <Bar position={[bar.x, 0, bar.z]} height={bar.principalHeight} color="#000000" />
          <Bar position={[bar.x, bar.interestY, bar.z]} height={bar.interestHeight} color="#d97706" />
          <Text
            position={[bar.x, -0.3, bar.z]}
            fontSize={0.2}
            color="#9ca3af"
            anchorX="center"
            anchorY="top"
          >
            {`Y${bar.key}`}
          </Text>
        </group>
      ))}
      <Float speed={0.5} rotationIntensity={0.2} floatIntensity={0.2}>
        <Text position={[0, 3.5, 0]} fontSize={0.25} color="#6b7280" anchorX="center">
          Principal vs Interest Over Time
        </Text>
      </Float>
    </group>
  );
}

export default function ThreeDChart({ data, isDark }: { data: AmortRow[]; isDark: boolean }) {
  if (data.length === 0) return null;

  return (
    <div className="h-72 w-full overflow-hidden rounded-2xl md:h-96">
      <Canvas
        camera={{ position: [6, 4, 6], fov: 50 }}
        gl={{ antialias: true }}
        style={{ background: isDark ? '#1a1a1a' : '#fafafa' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} intensity={1} />
        <directionalLight position={[-3, 5, -3]} intensity={0.3} />
        <OrbitControls enableDamping dampingFactor={0.05} autoRotate autoRotateSpeed={0.5} />
        <AmortizationScene data={data} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <planeGeometry args={[data.length * 1.8, 4]} />
          <meshStandardMaterial color={isDark ? '#222222' : '#f0f0f0'} />
        </mesh>
      </Canvas>
    </div>
  );
}
