"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import { AnimatedBeam } from "@/components/landing/AnimatedBeam";

function SphereScene() {
  const sphereRef = useRef<Mesh>(null);
  const innerRef = useRef<Mesh>(null);
  const groupRef = useRef<Group>(null);
  const ringRef = useRef<Group>(null);
  const positions = useMemo<[number, number, number][]>(
    () => [
      [0.3, -0.15, 0.2],
      [-0.35, 0.25, -0.2],
      [0.1, 0.3, 0.1],
    ],
    [],
  );

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.4) * 0.12;
      groupRef.current.rotation.y += delta * 0.12;
    }
    if (sphereRef.current) sphereRef.current.rotation.y += delta * 0.12;
    if (innerRef.current) innerRef.current.rotation.x -= delta * 0.08;
    if (ringRef.current) ringRef.current.rotation.y += delta * 0.08;
  });

  return (
    <group ref={groupRef}>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[1.45, 64, 64]} />
        <meshStandardMaterial
          color="#4fc9ff"
          roughness={0.15}
          metalness={0.78}
          transparent
          opacity={0.85}
          emissive="#2dd7ff"
          emissiveIntensity={0.18}
          side={2}
        />
      </mesh>

      <mesh ref={innerRef}>
        <sphereGeometry args={[1.28, 64, 64]} />
        <meshStandardMaterial
          color="#071827"
          transparent
          opacity={0.22}
          roughness={0.25}
          metalness={0.5}
        />
      </mesh>

      <group ref={ringRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.6, 0.02, 16, 120]} />
          <meshBasicMaterial color="#64d4ff" transparent opacity={0.55} toneMapped={false} />
        </mesh>
        <mesh rotation={[Math.PI / 5, 0, 0]}>
          <torusGeometry args={[1.7, 0.018, 12, 120]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.42} toneMapped={false} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 7]}>
          <torusGeometry args={[1.45, 0.014, 12, 120]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.34} toneMapped={false} />
        </mesh>
      </group>

      <AnimatedBeam />

      {positions.map((position, index) => (
        <mesh key={index} position={position}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="#7be8ff" transparent opacity={0.72} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export function ThreeSphere() {
  return (
    <div className="landing-hero-canvas" aria-hidden="true">
      <Canvas camera={{ fov: 38, position: [0, 0, 6] }} dpr={[1, 1.75]}>
        <ambientLight intensity={0.6} />
        <directionalLight intensity={1.4} position={[5, 5, 5]} />
        <directionalLight intensity={0.8} position={[-4, -2, -1]} />
        <SphereScene />
      </Canvas>
    </div>
  );
}
