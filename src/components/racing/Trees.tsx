"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { createTrackCurve } from "./trackCurve";
import { getWallDistance } from "./constants";

const TREE_GREENS = ["#7a8b6a", "#8a9a7b", "#6d7d5d"];

export function Trees() {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    const g = groupRef.current;
    while (g.children.length > 0) g.remove(g.children[0]);

    let seed = 123;
    const rand = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return seed / 2147483647;
    };

    const curve = createTrackCurve();
    for (let i = 0; i < 80; i++) {
      const t = rand();
      const side = rand() > 0.5 ? 1 : -1;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const n = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), tan)
        .normalize();

      const dist = getWallDistance(t) + 3 + rand() * 30;
      const pos = p.clone().add(n.clone().multiplyScalar(side * dist));

      // Trunk
      const trunkH = 2 + rand() * 2;
      const trunkGeom = new THREE.CylinderGeometry(0.2, 0.3, trunkH, 6);
      const trunkMat = new THREE.MeshStandardMaterial({
        color: "#6b5a48",
        roughness: 0.9,
      });
      const trunk = new THREE.Mesh(trunkGeom, trunkMat);
      trunk.position.set(pos.x, trunkH / 2, pos.z);
      g.add(trunk);

      // Canopy — low-poly cone in muted sage/olive greens
      const canopyH = 3 + rand() * 3;
      const canopyR = 1.5 + rand() * 2;
      const canopyGeom = new THREE.ConeGeometry(canopyR, canopyH, 6);
      const greenShade = TREE_GREENS[Math.floor(rand() * TREE_GREENS.length)];
      const canopyMat = new THREE.MeshStandardMaterial({
        color: greenShade,
        roughness: 0.8,
      });
      const canopy = new THREE.Mesh(canopyGeom, canopyMat);
      canopy.position.set(pos.x, trunkH + canopyH / 2 - 0.5, pos.z);
      g.add(canopy);
    }
  }, []);

  return <group ref={groupRef} />;
}
