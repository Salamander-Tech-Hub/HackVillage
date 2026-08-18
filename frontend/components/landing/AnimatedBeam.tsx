"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh, MeshStandardMaterial } from "three";

export function AnimatedBeam() {
  const beamRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!beamRef.current) return;
    beamRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.4) * 0.08;
    const material = beamRef.current.material as MeshStandardMaterial;
    material.emissiveIntensity = 1.2 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
  });

  return (
    <group rotation={[Math.PI / 6, 0, Math.PI / 4]}>
      <mesh ref={beamRef}>
        <boxGeometry args={[0.08, 0.08, 5.8]} />
        <meshStandardMaterial
          color="#4fc9ff"
          emissive="#66d7ff"
          emissiveIntensity={1.4}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.08, 0.08, 5.8]} />
        <meshBasicMaterial color="#44d7ff" transparent opacity={0.14} toneMapped={false} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.2, 0.2, 5.8]} />
        <meshBasicMaterial color="#6de8ff" transparent opacity={0.12} toneMapped={false} />
      </mesh>
    </group>
  );
}
