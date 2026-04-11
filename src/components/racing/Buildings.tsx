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

      const geom = new THREE.BoxGeometry(w, h, d);
      // Warm gray forms, no emissive
      const brightness = 0.55 + rand() * 0.15;
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(brightness * 0.95, brightness * 0.9, brightness * 0.85),
        roughness: 0.85,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(pos.x, h / 2, pos.z);
      g.add(mesh);
    }
  }, []);

  return <group ref={groupRef} />;
}
