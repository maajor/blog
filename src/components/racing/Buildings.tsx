"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { createScatterRng, distanceToTrack, sampleOffTrack } from "./scatter";

// Northamptonshire farmsteads — the only buildings around Silverstone.
// Low stone/brick houses and barns; nothing tall on an airfield site.
export type FarmsteadPlan = {
  x: number;
  z: number;
  rotationY: number;
};

export function planFarmsteads(count = 4, seed = 42): FarmsteadPlan[] {
  const rand = createScatterRng(seed);
  const sites: FarmsteadPlan[] = [];
  let attempts = 0;
  while (sites.length < count && attempts < count * 4) {
    attempts++;
    const spot = sampleOffTrack(rand, 8, 4, 60);
    if (!spot) continue;
    sites.push({ x: spot.x, z: spot.z, rotationY: spot.rotationY });
  }
  return sites;
}

export function verifyFarmsteads(): string[] {
  return planFarmsteads()
    .filter((f) => distanceToTrack(f.x, f.z) < 8 + 4)
    .map((f) => `farmstead at (${f.x.toFixed(0)}, ${f.z.toFixed(0)})`);
}

export function Buildings() {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    const g = groupRef.current;
    while (g.children.length > 0) g.remove(g.children[0]);

    const wallMat = new THREE.MeshStandardMaterial({
      color: "#c9c2b4",
      roughness: 0.85,
    });
    const barnMat = new THREE.MeshStandardMaterial({
      color: "#9c9180",
      roughness: 0.9,
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: "#b8612a",
      roughness: 0.7,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: "#5f5648",
      roughness: 0.85,
    });

    for (const site of planFarmsteads()) {
      const node = new THREE.Group();

      // farmhouse
      const house = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.8, 4.5), wallMat);
      house.position.set(-3, 1.9, 0);
      node.add(house);
      const houseCap = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.5, 5.1), capMat);
      houseCap.position.set(-3, 4.05, 0);
      node.add(houseCap);

      // barn
      const barn = new THREE.Mesh(new THREE.BoxGeometry(9, 3.2, 5.5), barnMat);
      barn.position.set(4, 1.6, 2);
      node.add(barn);
      const barnCap = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.4, 6.1), trimMat);
      barnCap.position.set(4, 3.4, 2);
      node.add(barnCap);

      node.position.set(site.x, 0, site.z);
      node.rotation.y = site.rotationY;
      g.add(node);
    }
  }, []);

  return <group ref={groupRef} />;
}
