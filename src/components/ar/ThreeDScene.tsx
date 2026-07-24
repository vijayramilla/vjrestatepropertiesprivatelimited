import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

function Building({ position, height, color, delay }: { position: [number, number, number]; height: number; color: string; delay: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startY = position[1];

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.elapsedTime * 0.3 + delay;
      meshRef.current.position.y = startY + Math.sin(t) * 0.08;
    }
  });

  return (
    <mesh ref={meshRef} position={[position[0], startY + height / 2, position[2]]}>
      <boxGeometry args={[0.8, height, 0.8]} />
      <meshPhysicalMaterial
        color={color}
        metalness={0.6}
        roughness={0.2}
        transparent
        opacity={0.85}
      />
      {/* window grid */}
      {Array.from({ length: Math.floor(height / 0.25) }).map((_, i) => (
        <mesh key={i} position={[0, -height / 2 + 0.15 + i * 0.25, 0.41]}>
          <planeGeometry args={[0.6, 0.12]} />
          <meshBasicMaterial color="#4ade80" opacity={0.3 + Math.random() * 0.4} transparent />
        </mesh>
      ))}
    </mesh>
  );
}

function GroundGrid() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[12, 12]} />
      <meshStandardMaterial color="#0a0a0a" />
    </mesh>
  );
}

function GridHelper() {
  return (
    <gridHelper args={[12, 24, '#1a1a1a', '#222222']} position={[0, 0, 0]} />
  );
}

function FloatingParticles() {
  const count = 80;
  const positions = useRef(new Float32Array(count * 3));
  const speeds = useRef(new Float32Array(count));

  for (let i = 0; i < count; i++) {
    positions.current[i * 3] = (Math.random() - 0.5) * 10;
    positions.current[i * 3 + 1] = (Math.random() - 0.5) * 5;
    positions.current[i * 3 + 2] = (Math.random() - 0.5) * 10;
    speeds.current[i] = 0.2 + Math.random() * 0.3;
  }

  const pointsRef = useRef<THREE.Points>(null);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        pos[i * 3 + 1] += Math.sin(clock.elapsedTime * speeds.current[i] + i) * 0.001;
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions.current}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#4ade80" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

function Scene() {
  const buildings: { position: [number, number, number]; height: number; color: string; delay: number }[] = [
    { position: [-2.2, 0, -2], height: 1.8, color: '#0f766e', delay: 0 },
    { position: [-0.8, 0, -2], height: 2.4, color: '#0891b2', delay: 1 },
    { position: [0.8, 0, -2], height: 1.6, color: '#0f766e', delay: 2 },
    { position: [2.2, 0, -2], height: 2.8, color: '#0d9488', delay: 0.5 },
    { position: [-1.5, 0, -0.5], height: 2.0, color: '#14b8a6', delay: 1.5 },
    { position: [0, 0, -0.5], height: 3.2, color: '#0f766e', delay: 0.8 },
    { position: [1.5, 0, -0.5], height: 2.2, color: '#0891b2', delay: 2.2 },
    { position: [-1, 0, 1], height: 1.4, color: '#0d9488', delay: 1.2 },
    { position: [1, 0, 1], height: 1.8, color: '#14b8a6', delay: 0.3 },
  ];

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} />
      <directionalLight position={[-3, 5, -3]} intensity={0.5} color="#4ade80" />
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#4ade80" />
      <Float speed={0.5} rotationIntensity={0.05} floatIntensity={0.1}>
        <group>
          {buildings.map((b, i) => (
            <Building key={i} {...b} />
          ))}
        </group>
      </Float>
      <GroundGrid />
      <GridHelper />
      <FloatingParticles />
    </>
  );
}

export default function ThreeDScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <PerspectiveCamera makeDefault position={[4, 3, 5]} fov={45} />
        <Scene />
      </Canvas>
    </div>
  );
}
