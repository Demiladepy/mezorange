"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type Particle = { x: number; y: number; z: number; speed: number };

function generateParticles(count: number): Particle[] {
  const arr: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const r = 4 + Math.random() * 8;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    arr.push({
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta),
      z: r * Math.cos(phi),
      speed: 0.1 + Math.random() * 0.2,
    });
  }
  return arr;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setMobile(mq.matches);
    const t = window.setTimeout(update, 0);
    mq.addEventListener("change", update);
    return () => {
      clearTimeout(t);
      mq.removeEventListener("change", update);
    };
  }, []);
  return mobile;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fn = () => setReduced(mq.matches);
    const t = window.setTimeout(fn, 0);
    mq.addEventListener("change", fn);
    return () => {
      clearTimeout(t);
      mq.removeEventListener("change", fn);
    };
  }, []);
  return reduced;
}

function CentralIcosahedron() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.x = t * 0.15;
    ref.current.rotation.y = t * 0.22;
    const breathe = 0.95 + Math.sin(t * (Math.PI / 2)) * 0.05;
    ref.current.scale.setScalar(breathe);
  });

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1.2, 0]} />
      <meshBasicMaterial color="#F7931A" wireframe transparent opacity={0.85} />
    </mesh>
  );
}

function ParticleField({ particles }: { particles: Particle[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D()).current;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed + i) * 0.15,
        p.y + Math.cos(t * p.speed * 0.7 + i) * 0.15,
        p.z,
      );
      const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
      dummy.scale.setScalar(0.04 + (1 - dist / 12) * 0.04);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particles.length]}>
      <circleGeometry args={[1, 6]} />
      <meshBasicMaterial color="#F7931A" transparent opacity={0.55} />
    </instancedMesh>
  );
}

function Scene({ particles }: { particles: Particle[] }) {
  const groupRef = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.x +=
      (mouse.current.x * 0.35 - groupRef.current.position.x) * 0.04;
    groupRef.current.position.y +=
      (-mouse.current.y * 0.25 - groupRef.current.position.y) * 0.04;
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.25} />
      <pointLight position={[4, 4, 4]} intensity={0.6} color="#F7931A" />
      <CentralIcosahedron />
      <ParticleField particles={particles} />
    </group>
  );
}

export function MezoBackgroundCanvas() {
  const mobile = useIsMobile();
  const reduced = useReducedMotion();
  const [allParticles] = useState(() => generateParticles(200));
  const particleCount = mobile ? 50 : reduced ? 80 : 200;
  const particles = allParticles.slice(0, particleCount);

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 55 }}
      dpr={mobile ? 1 : [1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#0B0B0F"]} />
      <fog attach="fog" args={["#0B0B0F", 6, 18]} />
      <Scene particles={particles} />
    </Canvas>
  );
}

export default function MezoBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <MezoBackgroundCanvas />
      <div
        className="absolute inset-0 bg-gradient-to-b from-obsidian/40 via-obsidian/75 to-obsidian"
        aria-hidden
      />
    </div>
  );
}
