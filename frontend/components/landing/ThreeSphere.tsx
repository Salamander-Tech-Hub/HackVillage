"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group, Material, Mesh, Points, PointsMaterial } from "three";
import { AnimatedBeam } from "@/components/landing/AnimatedBeam";

function SphereScene({ reduceMotion, active }: { reduceMotion: boolean; active: boolean }) {
  const sphereRef = useRef<Mesh>(null);
  const innerRef = useRef<Mesh>(null);
  const groupRef = useRef<Group>(null);
  const solidRef = useRef<Group>(null);
  const ringRef = useRef<Group>(null);
  const particleRef = useRef<Points>(null);
  const progress = useRef(1);
  const particlePositions = useMemo(() => createSphereParticles(2100), []);
  const positions = useMemo<[number, number, number][]>(
    () => [
      [0.3, -0.15, 0.2],
      [-0.35, 0.25, -0.2],
      [0.1, 0.3, 0.1],
    ],
    [],
  );

  useFrame((state, delta) => {
    const target = active ? 1 : 0;
    progress.current = reduceMotion
      ? target
      : progress.current + (target - progress.current) * Math.min(1, delta * 3.2);
    const formed = progress.current;

    solidRef.current?.traverse((object) => {
      const candidate = object as typeof object & { material?: Material | Material[] };
      if (!candidate.material) return;
      const materials = Array.isArray(candidate.material)
        ? candidate.material
        : [candidate.material];

      materials.forEach((material) => {
        const storedOpacity = material.userData.landingBaseOpacity as number | undefined;
        const baseOpacity = storedOpacity ?? material.opacity;
        if (storedOpacity === undefined) material.userData.landingBaseOpacity = baseOpacity;
        material.transparent = true;
        material.opacity = baseOpacity * formed;
      });
    });

    if (particleRef.current) {
      const particleMaterial = particleRef.current.material as PointsMaterial;
      particleMaterial.opacity = Math.sin((1 - formed) * Math.PI * 0.5) * 0.92;
      particleRef.current.scale.setScalar(1 + (1 - formed) * 0.9);
      if (!reduceMotion) {
        particleRef.current.rotation.x -= delta * (0.08 + (1 - formed) * 0.2);
        particleRef.current.rotation.z += delta * (0.06 + (1 - formed) * 0.2);
      }
    }

    if (reduceMotion) return;
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.15) * 0.12;
      groupRef.current.rotation.y += delta * 0.1;
    }
    if (sphereRef.current) {
      sphereRef.current.rotation.y += delta * 0.08;
      sphereRef.current.rotation.x += delta * 0.025;
    }
    if (innerRef.current) innerRef.current.rotation.x -= delta * 0.05;
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.12;
      ringRef.current.rotation.y += delta * 0.06;
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={solidRef}>
        <mesh ref={sphereRef}>
          <icosahedronGeometry args={[1.62, 3]} />
          <meshPhongMaterial
            color="#2854ff"
            wireframe
            transparent
            opacity={0.82}
            emissive="#003b9b"
            emissiveIntensity={0.45}
          />
        </mesh>

        <mesh ref={innerRef}>
          <icosahedronGeometry args={[1.36, 2]} />
          <meshStandardMaterial
            color="#00115c"
            transparent
            opacity={0.28}
            roughness={0.38}
            metalness={0.72}
          />
        </mesh>

        <group ref={ringRef}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[2.05, 0.018, 16, 140]} />
            <meshBasicMaterial color="#00a2fd" transparent opacity={0.85} toneMapped={false} />
          </mesh>
          <mesh rotation={[Math.PI / 5, 0, 0]}>
            <torusGeometry args={[2.18, 0.012, 12, 140]} />
            <meshBasicMaterial color="#77d4ff" transparent opacity={0.45} toneMapped={false} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 7]}>
            <torusGeometry args={[1.82, 0.01, 12, 140]} />
            <meshBasicMaterial color="#4051ca" transparent opacity={0.5} toneMapped={false} />
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
      <points ref={particleRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#59c9ff"
          size={0.046}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </group>
  );
}

export function ThreeSphere() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [active, setActive] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.intersectionRatio >= 0.24),
      { rootMargin: "0px", threshold: [0, 0.24, 0.5] },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="landing-hero-canvas" aria-hidden="true">
      <Canvas camera={{ fov: 40, position: [0, 0, 7.4] }} dpr={[1, 1.75]}>
        <ambientLight intensity={0.7} />
        <directionalLight intensity={1.5} position={[5, 5, 5]} />
        <pointLight color="#00a2fd" intensity={12} position={[-4, 1, 3]} />
        <SphereScene reduceMotion={reduceMotion} active={active} />
      </Canvas>
    </div>
  );
}

function createSphereParticles(count: number) {
  const positions = new Float32Array(count * 3);
  let state = 67;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };

  for (let index = 0; index < count; index += 1) {
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const radius = 1.7 + (random() - 0.5) * 0.28;
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi);
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  return positions;
}
