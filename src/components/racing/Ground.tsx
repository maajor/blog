"use client";

import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createTrackCurve } from "./trackCurve";
import { getWallDistance } from "./constants";

const PATCH_TONES = ["#b3a895", "#bdb2a0", "#a89c88"];
const MOUND_TONES = ["#b0a592", "#a89c88"];
const ROCK_TONES = ["#9c9180", "#a89c88", "#b0a592"];

// Decorative scatter beyond the walls — flat tones, no physics (unreachable)
export function Ground() {
  const decorRef = useRef<THREE.Group>(null);
  const curve = useMemo(() => createTrackCurve(), []);

  useEffect(() => {
    if (!decorRef.current) return;
    const g = decorRef.current;
    while (g.children.length > 0) g.remove(g.children[0]);

    let seed = 900;
    const rand = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return seed / 2147483647;
    };

    const sampleOffTrack = (margin: number) => {
      const t = rand();
      const side = rand() > 0.5 ? 1 : -1;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const n = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), tan)
        .normalize();
      const dist = getWallDistance(t) + margin;
      return p.clone().add(n.clone().multiplyScalar(side * dist));
    };

    // Sand patches — large flat tone shifts that break up the plane
    for (let i = 0; i < 18; i++) {
      const pos = sampleOffTrack(2 + rand() * 60);
      const r = 12 + rand() * 26;
      const patch = new THREE.Mesh(
        new THREE.CircleGeometry(r, 10),
        new THREE.MeshStandardMaterial({
          color: PATCH_TONES[Math.floor(rand() * PATCH_TONES.length)],
          roughness: 1,
        }),
      );
      patch.rotation.set(-Math.PI / 2, 0, rand() * Math.PI);
      patch.position.set(pos.x, 0.02, pos.z);
      g.add(patch);
    }

    // Gentle mounds — faceted rises on the horizon
    for (let i = 0; i < 14; i++) {
      const r = 10 + rand() * 16;
      const h = 1.2 + rand() * 3.3;
      const pos = sampleOffTrack(r + 4 + rand() * 40);
      const mound = new THREE.Mesh(
        new THREE.ConeGeometry(r, h, 7),
        new THREE.MeshStandardMaterial({
          color: MOUND_TONES[Math.floor(rand() * MOUND_TONES.length)],
          roughness: 1,
          flatShading: true,
        }),
      );
      mound.position.set(pos.x, h / 2 - 0.2, pos.z);
      mound.rotation.y = rand() * Math.PI;
      g.add(mound);
    }

    // Scattered rocks — small squashed icosahedra
    for (let i = 0; i < 50; i++) {
      const r = 0.3 + rand() * 0.8;
      const pos = sampleOffTrack(1.5 + rand() * 50);
      const rock = new THREE.Mesh(
        new THREE.IcosahedronGeometry(r, 0),
        new THREE.MeshStandardMaterial({
          color: ROCK_TONES[Math.floor(rand() * ROCK_TONES.length)],
          roughness: 0.95,
          flatShading: true,
        }),
      );
      rock.scale.y = 0.5 + rand() * 0.3;
      rock.position.set(pos.x, r * 0.35, pos.z);
      rock.rotation.set(rand(), rand() * Math.PI, rand());
      g.add(rock);
    }
  }, [curve]);

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
