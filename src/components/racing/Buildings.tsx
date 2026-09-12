"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { createTrackCurve } from "./trackCurve";
import { getWallDistance } from "./constants";

export function Buildings() {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    const g = groupRef.current;
    while (g.children.length > 0) g.remove(g.children[0]);

    let seed = 42;
    const rand = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return seed / 2147483647;
    };

    const curve = createTrackCurve();
    for (let i = 0; i < 40; i++) {
      const t = rand();
      const side = rand() > 0.5 ? 1 : -1;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const n = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), tan)
        .normalize();

      const dist = getWallDistance(t) + 8 + rand() * 40;
      const pos = p.clone().add(n.clone().multiplyScalar(side * dist));

      const w = 3 + rand() * 8;
      const h = 8 + rand() * 35;
      const d = 3 + rand() * 8;

      // Warm gray forms, no emissive
      const brightness = 0.55 + rand() * 0.15;
      const tone = new THREE.Color(
        brightness * 0.95,
        brightness * 0.9,
        brightness * 0.85,
      );
      const mat = new THREE.MeshStandardMaterial({
        color: tone,
        roughness: 0.85,
      });

      // Stepped tiers — a quiet Monument Valley silhouette
      const tiers = 1 + Math.floor(rand() * 3); // 1..3
      let y = 0;
      for (let tier = 0; tier < tiers; tier++) {
        const shrink = Math.pow(0.72, tier);
        const tierH = h * (tiers === 1 ? 1 : tier === 0 ? 0.55 : tier === 1 ? 0.3 : 0.15);
        const geom = new THREE.BoxGeometry(w * shrink, tierH, d * shrink);
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(pos.x, y + tierH / 2, pos.z);
        g.add(mesh);
        y += tierH;
      }

      // Occasional terracotta cap echoes the accent color
      if (tiers > 1 && rand() < 0.35) {
        const cap = new THREE.Mesh(
          new THREE.BoxGeometry(w * Math.pow(0.72, tiers - 1) * 0.7, 0.6, d * Math.pow(0.72, tiers - 1) * 0.7),
          new THREE.MeshStandardMaterial({
            color: "#b8612a",
            roughness: 0.7,
          }),
        );
        cap.position.set(pos.x, y + 0.3, pos.z);
        g.add(cap);
      }
    }
  }, []);

  return <group ref={groupRef} />;
}
