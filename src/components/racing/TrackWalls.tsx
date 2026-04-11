"use client";

import { useMemo } from "react";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import * as THREE from "three";
import { WALL_HEIGHT, getWallDistance } from "./constants";
import { createTrackCurve } from "./trackCurve";

const N = 600; // number of wall segments (must be high enough for smooth curves)

export function TrackWalls() {
  const walls = useMemo(() => {
    const curve = createTrackCurve();
    const segments: {
      position: [number, number, number];
      rotation: [number, number, number];
      args: [number, number, number];
    }[] = [];

    for (let i = 0; i < N; i++) {
      const t0 = i / N;
      const t1 = (i + 1) / N;

      const p0 = curve.getPointAt(t0);
      const p1 = curve.getPointAt(t1);
      const tan = curve.getTangentAt(t0);
      const n = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), tan)
        .normalize();

      const wd0 = getWallDistance(t0);

      // For each side (left and right)
      for (const side of [1, -1] as const) {
        const w0 = p0.clone().add(n.clone().multiplyScalar(side * wd0));
        const w1 = p1.clone().add(n.clone().multiplyScalar(side * wd0));

        const mid = w0.clone().add(w1).multiplyScalar(0.5);
        const segLen = w0.distanceTo(w1);
        const angle = Math.atan2(w1.x - w0.x, w1.z - w0.z);

        segments.push({
          position: [mid.x, WALL_HEIGHT / 2, mid.z],
          rotation: [0, angle, 0],
          args: [0.3, WALL_HEIGHT / 2, segLen / 2],
        });
      }
    }

    return segments;
  }, []);

  return (
    <RigidBody type="fixed" colliders={false} friction={0.01} restitution={0.1}>
      {walls.map((w, i) => (
        <CuboidCollider key={i} args={w.args} position={w.position} rotation={w.rotation} />
      ))}
    </RigidBody>
  );
}
