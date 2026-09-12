"use client";

import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createScatterRng, sampleOffTrack } from "./scatter";

const PATCH_TONES = ["#b3a895", "#bdb2a0", "#a89c88"];
const MOUND_TONES = ["#b0a592", "#a89c88"];
const ROCK_TONES = ["#9c9180", "#a89c88", "#b0a592"];

export type GroundDecorPlan = {
  patches: { x: number; z: number; r: number; color: string; rotation: number }[];
  mounds: { x: number; z: number; r: number; h: number; color: string; rotationY: number }[];
  rocks: { x: number; z: number; r: number; squash: number; color: string; rotation: [number, number, number] }[];
};

// Pure placement planning — no THREE objects, so scripts can verify geometry
export function planGroundDecor(
  patchCount = 18,
  moundCount = 14,
  rockCount = 50,
  seed = 900,
): GroundDecorPlan {
  const rand = createScatterRng(seed);

  const patches = [];
  for (let placed = 0, attempts = 0; placed < patchCount && attempts < patchCount * 3; attempts++) {
    const r = 12 + rand() * 26;
    const spot = sampleOffTrack(rand, r, 1, 60);
    if (!spot) continue;
    placed++;
    patches.push({
      x: spot.x,
      z: spot.z,
      r,
      color: PATCH_TONES[Math.floor(rand() * PATCH_TONES.length)],
      rotation: rand() * Math.PI,
    });
  }

  const mounds = [];
  for (let placed = 0, attempts = 0; placed < moundCount && attempts < moundCount * 3; attempts++) {
    const r = 10 + rand() * 16;
    const h = 1.2 + rand() * 3.3;
    const spot = sampleOffTrack(rand, r, 3, 40);
    if (!spot) continue;
    placed++;
    mounds.push({
      x: spot.x,
      z: spot.z,
      r,
      h,
      color: MOUND_TONES[Math.floor(rand() * MOUND_TONES.length)],
      rotationY: rand() * Math.PI,
    });
  }

  const rocks: GroundDecorPlan["rocks"] = [];
  for (let placed = 0, attempts = 0; placed < rockCount && attempts < rockCount * 3; attempts++) {
    const r = 0.3 + rand() * 0.8;
    const spot = sampleOffTrack(rand, r + 0.4, 1, 50);
    if (!spot) continue;
    placed++;
    rocks.push({
      x: spot.x,
      z: spot.z,
      r,
      squash: 0.5 + rand() * 0.3,
      color: ROCK_TONES[Math.floor(rand() * ROCK_TONES.length)],
      rotation: [rand(), rand() * Math.PI, rand()],
    });
  }

  return { patches, mounds, rocks };
}

// Decorative scatter beyond the walls — flat tones, no physics (unreachable)
export function Ground() {
  const decorRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!decorRef.current) return;
    const g = decorRef.current;
    while (g.children.length > 0) g.remove(g.children[0]);

    const { patches, mounds, rocks } = planGroundDecor();

    for (const p of patches) {
      const patch = new THREE.Mesh(
        new THREE.CircleGeometry(p.r, 10),
        new THREE.MeshStandardMaterial({ color: p.color, roughness: 1 }),
      );
      patch.rotation.set(-Math.PI / 2, 0, p.rotation);
      patch.position.set(p.x, 0.02, p.z);
      g.add(patch);
    }

    for (const m of mounds) {
      const mound = new THREE.Mesh(
        new THREE.ConeGeometry(m.r, m.h, 7),
        new THREE.MeshStandardMaterial({
          color: m.color,
          roughness: 1,
          flatShading: true,
        }),
      );
      mound.position.set(m.x, m.h / 2 - 0.2, m.z);
      mound.rotation.y = m.rotationY;
      g.add(mound);
    }

    for (const r of rocks) {
      const rock = new THREE.Mesh(
        new THREE.IcosahedronGeometry(r.r, 0),
        new THREE.MeshStandardMaterial({
          color: r.color,
          roughness: 0.95,
          flatShading: true,
        }),
      );
      rock.scale.y = r.squash;
      rock.position.set(r.x, r.r * 0.35, r.z);
      rock.rotation.set(...r.rotation);
      g.add(rock);
    }
  }, []);

  return (
    <>
      <RigidBody type="fixed" position={[340, -2.5, 480]} colliders={false} friction={1.5}>
        <CuboidCollider args={[1500, 2.5, 1500]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[45, 2.5, 5]} receiveShadow>
          <planeGeometry args={[3000, 3000]} />
          <meshStandardMaterial color="#b8ad9a" roughness={1} />
        </mesh>
      </RigidBody>
      <group ref={decorRef} />
    </>
  );
}
