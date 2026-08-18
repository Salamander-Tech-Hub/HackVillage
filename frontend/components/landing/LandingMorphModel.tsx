"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Group, Material, Points, PointsMaterial } from "three";

const PARTICLE_COUNT = 2400;

export function LandingMorphModel({
  activeIndex,
  modelLabel,
  position,
}: {
  activeIndex: number;
  modelLabel: string;
  position: "left" | "center" | "right";
}) {
  return (
    <div className="landing-morph-rail" aria-hidden="true">
      <div className="landing-morph-sticky">
        <div className={`landing-morph-window landing-morph-window--${position}`}>
          <div className="landing-story-glow" />
          <div className="landing-morph-canvas">
            <Canvas camera={{ fov: 42, position: [0, 0, 7.2] }} dpr={[1, 1.5]}>
              <ambientLight intensity={0.75} />
              <directionalLight intensity={1.5} position={[5, 5, 5]} />
              <pointLight color="#00a2fd" intensity={12} position={[-4, 2, 4]} />
              <pointLight color="#4051ca" intensity={8} position={[4, -2, 2]} />
              <MorphingParticles activeIndex={activeIndex} />
            </Canvas>
          </div>
          <span className="landing-story-model-label">
            <i />
            {modelLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function MorphingParticles({ activeIndex }: { activeIndex: number }) {
  const pointsRef = useRef<Points>(null);
  const sceneRef = useRef<Group>(null);
  const solidRef = useRef<Group>(null);
  const [currentPositions] = useState(() =>
    createScatter(createShape(activeIndex), activeIndex + 101),
  );
  const destination = useRef<Float32Array>(new Float32Array(currentPositions));
  const formTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const solidTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showSolid = useRef(false);
  const solidOpacity = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    const points = pointsRef.current;
    if (!points) return;
    const position = points.geometry.getAttribute("position");
    const source = position.array as Float32Array;

    if (formTimer.current) clearTimeout(formTimer.current);
    if (solidTimer.current) clearTimeout(solidTimer.current);
    showSolid.current = false;

    if (!mounted.current) {
      mounted.current = true;
      formTimer.current = setTimeout(() => {
        destination.current = createShape(activeIndex);
      }, 650);
      solidTimer.current = setTimeout(() => {
        showSolid.current = true;
      }, 2500);
    } else {
      destination.current = createScatter(source, activeIndex + 101);
      formTimer.current = setTimeout(() => {
        destination.current = createShape(activeIndex);
      }, 900);
      solidTimer.current = setTimeout(() => {
        showSolid.current = true;
      }, 2900);
    }

    return () => {
      if (formTimer.current) clearTimeout(formTimer.current);
      if (solidTimer.current) clearTimeout(solidTimer.current);
    };
  }, [activeIndex]);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    const position = points.geometry.getAttribute("position");
    const values = position.array as Float32Array;
    const target = destination.current;
    const speed = 1 - Math.exp(-delta * 1.55);

    for (let index = 0; index < values.length; index += 1) {
      values[index] += (target[index] - values[index]) * speed;
    }

    position.needsUpdate = true;
    if (sceneRef.current) {
      sceneRef.current.rotation.y += delta * 0.08;
      sceneRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.35) * 0.08;
    }

    const solidTarget = showSolid.current ? 1 : 0;
    solidOpacity.current +=
      (solidTarget - solidOpacity.current) * Math.min(1, delta * 3.5);
    const visibleOpacity = solidOpacity.current;

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
        material.opacity = baseOpacity * visibleOpacity;
      });
    });

    const pointsMaterial = points.material as PointsMaterial;
    pointsMaterial.opacity = 0.94 * (1 - visibleOpacity);
  });

  return (
    <group ref={sceneRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[currentPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#39bfff"
          size={0.062}
          sizeAttenuation
          transparent
          opacity={0.94}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
      <group ref={solidRef}>
        <DetailedModel key={activeIndex} index={activeIndex} />
      </group>
    </group>
  );
}

function DetailedModel({ index }: { index: number }) {
  const shape = index % 4;
  if (shape === 0) return <InfrastructureModel />;
  if (shape === 1) return <SafeModel />;
  if (shape === 2) return <BookAndPenModel />;
  return <StairwayModel />;
}

function InfrastructureModel() {
  const centers = [-1.65, -0.85, 0, 0.9, 1.68];
  const heights = [0.9, 1.45, 1.1, 1.75, 1.25];

  return (
    <group rotation={[0.25, -0.35, -0.04]}>
      <mesh position={[0, -1.08, 0]}>
        <boxGeometry args={[4.4, 0.16, 2.5]} />
        <meshStandardMaterial
          color="#00115c"
          metalness={0.82}
          roughness={0.24}
          transparent
          opacity={0}
          userData={{ landingBaseOpacity: 0.74 }}
        />
      </mesh>
      <mesh position={[0, -0.98, 0]}>
        <boxGeometry args={[4.12, 0.03, 2.25, 9, 1, 5]} />
        <meshBasicMaterial
          color="#00a2fd"
          wireframe
          transparent
          opacity={0}
          toneMapped={false}
          userData={{ landingBaseOpacity: 0.36 }}
        />
      </mesh>
      {centers.map((x, index) => {
        const height = heights[index];
        return (
          <group key={x} position={[x, -0.96 + height / 2, index % 2 ? -0.35 : 0.35]}>
            <mesh>
              <boxGeometry args={[0.62, height, 0.7]} />
              <meshPhongMaterial
                color={index % 2 ? "#173bc0" : "#087ac8"}
                emissive="#002d88"
                emissiveIntensity={0.35}
                transparent
                opacity={0}
                userData={{ landingBaseOpacity: 0.76 }}
              />
            </mesh>
            <mesh>
              <boxGeometry args={[0.66, height + 0.04, 0.74]} />
              <meshBasicMaterial
                color="#83d6ff"
                wireframe
                transparent
                opacity={0}
                toneMapped={false}
                userData={{ landingBaseOpacity: 0.42 }}
              />
            </mesh>
            <mesh position={[0, height / 2 + 0.04, 0]}>
              <boxGeometry args={[0.72, 0.06, 0.8]} />
              <meshBasicMaterial
                color="#00a2fd"
                transparent
                opacity={0}
                toneMapped={false}
                userData={{ landingBaseOpacity: 0.85 }}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function SafeModel() {
  const hinges: [number, number][] = [
    [1.28, 0.78],
    [1.28, -0.78],
  ];

  return (
    <group rotation={[0.12, -0.28, 0.03]}>
      <mesh>
        <boxGeometry args={[2.8, 2.8, 2.8]} />
        <meshStandardMaterial
          color="#00115c"
          metalness={0.86}
          roughness={0.24}
          transparent
          opacity={0}
          userData={{ landingBaseOpacity: 0.7 }}
        />
      </mesh>
      <mesh>
        <boxGeometry args={[2.86, 2.86, 2.86, 5, 5, 5]} />
        <meshBasicMaterial
          color="#39bfff"
          wireframe
          transparent
          opacity={0}
          toneMapped={false}
          userData={{ landingBaseOpacity: 0.5 }}
        />
      </mesh>
      <mesh position={[0, 0, 1.45]}>
        <boxGeometry args={[2.3, 2.3, 0.18]} />
        <meshStandardMaterial
          color="#082477"
          metalness={0.78}
          roughness={0.22}
          transparent
          opacity={0}
          userData={{ landingBaseOpacity: 0.92 }}
        />
      </mesh>
      <mesh position={[0, 0, 1.58]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.45, 0.07, 14, 72]} />
        <meshPhongMaterial
          color="#00a2fd"
          emissive="#00629d"
          emissiveIntensity={0.6}
          transparent
          opacity={0}
          userData={{ landingBaseOpacity: 1 }}
        />
      </mesh>
      <mesh position={[0, 0, 1.62]}>
        <boxGeometry args={[1.05, 0.1, 0.1]} />
        <meshBasicMaterial
          color="#d8f2ff"
          transparent
          opacity={0}
          toneMapped={false}
          userData={{ landingBaseOpacity: 1 }}
        />
      </mesh>
      <mesh position={[0, 0, 1.63]}>
        <boxGeometry args={[0.1, 1.05, 0.1]} />
        <meshBasicMaterial
          color="#d8f2ff"
          transparent
          opacity={0}
          toneMapped={false}
          userData={{ landingBaseOpacity: 1 }}
        />
      </mesh>
      {hinges.map(([x, y]) => (
        <mesh key={y} position={[x, y, 1.54]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.34, 20]} />
          <meshBasicMaterial
            color="#4051ca"
            transparent
            opacity={0}
            toneMapped={false}
            userData={{ landingBaseOpacity: 0.92 }}
          />
        </mesh>
      ))}
    </group>
  );
}

function BookAndPenModel() {
  return (
    <group rotation={[0.04, -0.22, -0.03]}>
      {[-0.8, 0.8].map((x, pageIndex) => (
        <group
          key={x}
          position={[x, 0, 0]}
          rotation={[0, pageIndex === 0 ? 0.14 : -0.14, 0]}
        >
          <mesh position={[0, 0, -0.1]}>
            <boxGeometry args={[1.64, 2.48, 0.13]} />
            <meshStandardMaterial
              color="#00115c"
              metalness={0.7}
              roughness={0.3}
              transparent
              opacity={0}
              userData={{ landingBaseOpacity: 0.9 }}
            />
          </mesh>
          <mesh>
            <boxGeometry args={[1.52, 2.34, 0.2]} />
            <meshPhongMaterial
              color={pageIndex === 0 ? "#b9e7ff" : "#d8f2ff"}
              emissive="#315f7a"
              emissiveIntensity={0.12}
              transparent
              opacity={0}
              userData={{ landingBaseOpacity: 0.96 }}
            />
          </mesh>
          {[-0.62, -0.22, 0.18, 0.58].map((y) => (
            <mesh key={y} position={[0, y, 0.12]}>
              <boxGeometry args={[1.05, 0.035, 0.025]} />
              <meshBasicMaterial
                color={pageIndex === 0 ? "#087ac8" : "#4051ca"}
                transparent
                opacity={0}
                toneMapped={false}
                userData={{ landingBaseOpacity: 0.5 }}
              />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 0, -0.02]}>
        <cylinderGeometry args={[0.09, 0.09, 2.45, 18]} />
        <meshBasicMaterial
          color="#00a2fd"
          transparent
          opacity={0}
          toneMapped={false}
          userData={{ landingBaseOpacity: 0.88 }}
        />
      </mesh>
      <group position={[1.82, 0, 0.28]} rotation={[0, 0, -0.12]}>
        <mesh>
          <cylinderGeometry args={[0.1, 0.1, 2.35, 24]} />
          <meshStandardMaterial
            color="#ffcb5c"
            metalness={0.78}
            roughness={0.2}
            transparent
            opacity={0}
            userData={{ landingBaseOpacity: 1 }}
          />
        </mesh>
        <mesh position={[0, -1.34, 0]}>
          <coneGeometry args={[0.14, 0.36, 24]} />
          <meshPhongMaterial
            color="#4051ca"
            transparent
            opacity={0}
            userData={{ landingBaseOpacity: 1 }}
          />
        </mesh>
        <mesh position={[0, 1.26, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.18, 24]} />
          <meshBasicMaterial
            color="#00a2fd"
            transparent
            opacity={0}
            toneMapped={false}
            userData={{ landingBaseOpacity: 1 }}
          />
        </mesh>
      </group>
    </group>
  );
}

function StairwayModel() {
  const steps = [0, 1, 2, 3, 4];

  return (
    <group rotation={[0.2, -0.36, 0.03]}>
      {steps.map((step) => (
        <mesh key={step} position={[-1.8 + step * 0.9, -1.5 + step * 0.65, 0]}>
          <boxGeometry args={[1.08, 0.44, 1.5]} />
          <meshPhongMaterial
            color={step % 2 ? "#173bc0" : "#087ac8"}
            emissive="#002b86"
            emissiveIntensity={0.28}
            transparent
            opacity={0}
            userData={{ landingBaseOpacity: 0.82 }}
          />
        </mesh>
      ))}
      {[-0.86, 0.86].map((z) => (
        <group key={z}>
          {steps.map((step) => (
            <mesh key={step} position={[-1.8 + step * 0.9, -0.9 + step * 0.65, z]}>
              <boxGeometry args={[0.055, 0.8, 0.055]} />
              <meshBasicMaterial
                color="#83d6ff"
                transparent
                opacity={0}
                toneMapped={false}
                userData={{ landingBaseOpacity: 0.72 }}
              />
            </mesh>
          ))}
          <mesh position={[0, 0.72, z]} rotation={[0, 0, -0.63]}>
            <boxGeometry args={[0.06, 4.6, 0.06]} />
            <meshBasicMaterial
              color="#00a2fd"
              transparent
              opacity={0}
              toneMapped={false}
              userData={{ landingBaseOpacity: 0.78 }}
            />
          </mesh>
        </group>
      ))}
      {[-0.82, 0.82].map((z) => (
        <mesh key={z} position={[2.15, 1.88, z]}>
          <boxGeometry args={[0.1, 1.52, 0.1]} />
          <meshBasicMaterial
            color="#4051ca"
            transparent
            opacity={0}
            toneMapped={false}
            userData={{ landingBaseOpacity: 0.88 }}
          />
        </mesh>
      ))}
      <mesh position={[2.15, 2.62, 0]}>
        <boxGeometry args={[0.1, 0.1, 1.74]} />
        <meshBasicMaterial
          color="#00a2fd"
          transparent
          opacity={0}
          toneMapped={false}
          userData={{ landingBaseOpacity: 0.94 }}
        />
      </mesh>
    </group>
  );
}

function createShape(index: number) {
  const shape = index % 4;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const random = seededRandom(71 + shape * 37);

  for (let particle = 0; particle < PARTICLE_COUNT; particle += 1) {
    let x = 0;
    let y = 0;
    let z = 0;

    if (shape === 0) {
      const block = Math.floor(random() * 5);
      const centers = [-1.65, -0.85, 0, 0.9, 1.68];
      const heights = [0.9, 1.45, 1.1, 1.75, 1.25];
      x = centers[block] + (random() - 0.5) * 0.7;
      y = -0.9 + random() * heights[block];
      z = (random() - 0.5) * 1.75;
    } else if (shape === 1) {
      const vaultPart = random();
      if (vaultPart < 0.58) {
        const face = Math.floor(random() * 6);
        x = (random() - 0.5) * 2.8;
        y = (random() - 0.5) * 2.8;
        z = (random() - 0.5) * 2.8;
        const side = random() > 0.5 ? 1.4 : -1.4;
        if (face < 2) x = side;
        else if (face < 4) y = side;
        else z = side;
      } else if (vaultPart < 0.75) {
        const edge = Math.floor(random() * 4);
        x = (random() - 0.5) * 2.25;
        y = (random() - 0.5) * 2.25;
        z = 1.48;
        if (edge < 2) x = edge === 0 ? -1.12 : 1.12;
        else y = edge === 2 ? -1.12 : 1.12;
      } else if (vaultPart < 0.88) {
        const angle = random() * Math.PI * 2;
        const radius = 0.42 + (random() - 0.5) * 0.1;
        x = Math.cos(angle) * radius;
        y = Math.sin(angle) * radius;
        z = 1.58;
      } else if (vaultPart < 0.95) {
        if (random() > 0.5) {
          x = (random() - 0.5) * 1.1;
          y = 0;
        } else {
          x = 0;
          y = (random() - 0.5) * 1.1;
        }
        z = 1.62;
      } else {
        x = 1.24 + (random() - 0.5) * 0.14;
        y = (random() > 0.5 ? 0.78 : -0.78) + (random() - 0.5) * 0.28;
        z = 1.54 + (random() - 0.5) * 0.12;
      }
    } else if (shape === 2) {
      const skillPart = random();
      if (skillPart < 0.74) {
        x = (random() - 0.5) * 3.25;
        y = (random() - 0.5) * 2.35;
        z = (random() - 0.5) * 0.2 - Math.abs(x) * 0.025;
      } else if (skillPart < 0.94) {
        const penPosition = (random() - 0.5) * 2.35;
        x = 1.82 + penPosition * 0.12 + (random() - 0.5) * 0.12;
        y = penPosition + (random() - 0.5) * 0.12;
        z = 0.28 + (random() - 0.5) * 0.12;
      } else {
        x = (random() - 0.5) * 0.12;
        y = (random() - 0.5) * 2.45;
        z = -0.02 + (random() - 0.5) * 0.12;
      }
    } else {
      const pathwayPart = random();
      if (pathwayPart < 0.72) {
        const step = Math.floor(random() * 5);
        x = -1.8 + step * 0.9 + (random() - 0.5) * 1.05;
        y = -1.5 + step * 0.65 + (random() - 0.5) * 0.44;
        z = (random() - 0.5) * 1.45;
      } else if (pathwayPart < 0.9) {
        const side = random() > 0.5 ? 0.86 : -0.86;
        const railPosition = random() * 4;
        const step = Math.min(4, Math.floor(railPosition));
        x = -1.8 + railPosition * 0.9;
        y = -0.82 + railPosition * 0.65 + (random() - 0.5) * 0.08;
        z = side + (random() - 0.5) * 0.06;
        if (random() < 0.28) {
          y = -1.28 + step * 0.65 + random() * 0.75;
        }
      } else {
        const framePart = random();
        if (framePart < 0.42) {
          x = 2.15 + (random() - 0.5) * 0.08;
          y = 1.12 + random() * 1.5;
          z = -0.82 + (random() - 0.5) * 0.08;
        } else if (framePart < 0.84) {
          x = 2.15 + (random() - 0.5) * 0.08;
          y = 1.12 + random() * 1.5;
          z = 0.82 + (random() - 0.5) * 0.08;
        } else {
          x = 2.15 + (random() - 0.5) * 0.08;
          y = 2.62 + (random() - 0.5) * 0.08;
          z = (random() - 0.5) * 1.7;
        }
      }
    }

    positions[particle * 3] = x + (random() - 0.5) * 0.055;
    positions[particle * 3 + 1] = y + (random() - 0.5) * 0.055;
    positions[particle * 3 + 2] = z + (random() - 0.5) * 0.055;
  }

  return positions;
}

function createScatter(source: Float32Array, seed: number) {
  const scattered = new Float32Array(source.length);
  const random = seededRandom(seed);

  for (let index = 0; index < source.length; index += 3) {
    const distance = 0.45 + random() * 0.8;
    scattered[index] = source[index] + (random() - 0.5) * distance * 1.8;
    scattered[index + 1] = source[index + 1] + (random() - 0.5) * distance * 1.5;
    scattered[index + 2] = source[index + 2] + (random() - 0.5) * distance * 1.7;
  }

  return scattered;
}

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
