"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { createTrackCurve } from "./trackCurve";
import { getWallDistance } from "./constants";

const TREE_GREENS = ["#7a8b6a", "#8a9a7b", "#6d7d5d"];
const BUSH_GREENS = ["#8a9a7b", "#7a8b6a"];

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

      // Canopy — low-poly cones in muted sage/olive greens
      const greenShade = TREE_GREENS[Math.floor(rand() * TREE_GREENS.length)];
      const canopyMat = new THREE.MeshStandardMaterial({
        color: greenShade,
        roughness: 0.8,
        flatShading: true,
      });
      const twoTier = rand() < 0.45;
      if (twoTier) {
        // Tapered tower: wide tier below, narrower tier above
        const lowerH = 2.2 + rand() * 1.6;
        const lowerR = 1.6 + rand() * 1.6;
        const lower = new THREE.Mesh(
          new THREE.ConeGeometry(lowerR, lowerH, 6),
          canopyMat,
        );
        lower.position.set(pos.x, trunkH - 0.5 + lowerH / 2, pos.z);
        lower.rotation.y = rand() * Math.PI;
        g.add(lower);

        const upperH = 1.8 + rand() * 1.4;
        const upperMat = canopyMat.clone();
        upperMat.color = new THREE.Color(greenShade).lerp(
          new THREE.Color("#a8b89a"),
          0.25,
        );
        const upper = new THREE.Mesh(
          new THREE.ConeGeometry(lowerR * 0.62, upperH, 6),
          upperMat,
        );
        upper.position.set(
          pos.x,
          trunkH - 0.5 + lowerH * 0.78 + upperH / 2,
          pos.z,
        );
        upper.rotation.y = rand() * Math.PI;
        g.add(upper);
      } else {
        const canopyH = 3 + rand() * 3;
        const canopyR = 1.5 + rand() * 2;
        const canopy = new THREE.Mesh(
          new THREE.ConeGeometry(canopyR, canopyH, 6),
          canopyMat,
        );
        canopy.position.set(pos.x, trunkH + canopyH / 2 - 0.5, pos.z);
        g.add(canopy);
      }

      // Occasional bushes at the base
      if (rand() < 0.35) {
        const bushCount = 1 + Math.floor(rand() * 3);
        for (let b = 0; b < bushCount; b++) {
          const r = 0.4 + rand() * 0.5;
          const bush = new THREE.Mesh(
            new THREE.IcosahedronGeometry(r, 0),
            new THREE.MeshStandardMaterial({
              color: BUSH_GREENS[Math.floor(rand() * BUSH_GREENS.length)],
              roughness: 0.9,
              flatShading: true,
            }),
          );
          bush.position.set(
            pos.x + (rand() - 0.5) * 2.4,
            r * 0.5,
            pos.z + (rand() - 0.5) * 2.4,
          );
          g.add(bush);
        }
      }
    }
  }, []);

  return <group ref={groupRef} />;
}
