"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { createScatterRng, distanceToTrack, sampleOffTrack } from "./scatter";

// Silverstone sits on open farmland: trees grow in small copses between
// fields, with the odd lone oak. Broadleaf blobs dominate; few conifers.
const TREE_GREENS = ["#7a8b6a", "#8a9a7b", "#6d7d5d"];

export type TreePlan = {
  x: number;
  z: number;
  kind: "broadleaf" | "conifer";
  trunkH: number;
  blobR: number;
  coneR: number;
  coneH: number;
  green: string;
};

function makeTree(
  x: number,
  z: number,
  rand: () => number,
  scale = 1,
): TreePlan {
  const conifer = rand() < 0.28;
  const green = TREE_GREENS[Math.floor(rand() * TREE_GREENS.length)];
  if (conifer) {
    return {
      x,
      z,
      kind: "conifer",
      trunkH: (3 + rand() * 2) * scale,
      blobR: 0,
      coneR: (2.6 + rand() * 1.2) * scale,
      coneH: (6 + rand() * 2) * scale,
      green,
    };
  }
  return {
    x,
    z,
    kind: "broadleaf",
    trunkH: (5 + rand() * 3) * scale,
    blobR: (3.2 + rand() * 1.4) * scale,
    coneR: 0,
    coneH: 0,
    green,
  };
}

// Pure placement planning — no THREE objects, so scripts can verify geometry
export function planTrees(
  clusterCount = 20,
  singleCount = 14,
  seed = 123,
): TreePlan[] {
  const rand = createScatterRng(seed);
  const trees: TreePlan[] = [];

  // Copses — clusters of 3-6 trees sharing a field corner
  for (let c = 0; c < clusterCount; c++) {
    const center = sampleOffTrack(rand, 9, 2, 70);
    if (!center) continue;
    const n = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < n; i++) {
      const x = center.x + (rand() - 0.5) * 16;
      const z = center.z + (rand() - 0.5) * 16;
      if (distanceToTrack(x, z) < 2.5) continue;
      trees.push(makeTree(x, z, rand));
    }
  }

  // Lone field trees
  for (let s = 0; s < singleCount; s++) {
    const spot = sampleOffTrack(rand, 3, 2, 90);
    if (!spot) continue;
    trees.push(makeTree(spot.x, spot.z, rand, 1.15));
  }

  return trees;
}

export function verifyTrees(): string[] {
  return planTrees()
    .filter((t) => distanceToTrack(t.x, t.z) < 2.5)
    .map((t) => `tree at (${t.x.toFixed(0)}, ${t.z.toFixed(0)})`);
}

export function Trees() {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    const g = groupRef.current;
    while (g.children.length > 0) g.remove(g.children[0]);

    const trunkMat = new THREE.MeshStandardMaterial({
      color: "#6b5a48",
      roughness: 0.9,
    });

    for (const tree of planTrees()) {
      const canopyMat = new THREE.MeshStandardMaterial({
        color: tree.green,
        roughness: 0.8,
        flatShading: true,
      });

      if (tree.kind === "broadleaf") {
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.5, tree.trunkH, 6),
          trunkMat,
        );
        trunk.position.set(tree.x, tree.trunkH / 2, tree.z);
        g.add(trunk);

        // Two stacked blob tiers — a rounded oak crown
        const lower = new THREE.Mesh(
          new THREE.IcosahedronGeometry(tree.blobR, 0),
          canopyMat,
        );
        lower.position.set(tree.x, tree.trunkH + tree.blobR * 0.55, tree.z);
        lower.rotation.set(0.3, tree.x % 1, 0.2);
        lower.scale.y = 0.85;
        g.add(lower);

        const upper = new THREE.Mesh(
          new THREE.IcosahedronGeometry(tree.blobR * 0.72, 0),
          canopyMat,
        );
        upper.position.set(
          tree.x + tree.blobR * 0.18,
          tree.trunkH + tree.blobR * 1.15,
          tree.z - tree.blobR * 0.12,
        );
        upper.rotation.set(0.5, tree.z % 1, 0.4);
        g.add(upper);
      } else {
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.4, tree.trunkH, 6),
          trunkMat,
        );
        trunk.position.set(tree.x, tree.trunkH / 2, tree.z);
        g.add(trunk);

        const lower = new THREE.Mesh(
          new THREE.ConeGeometry(tree.coneR, tree.coneH, 6),
          canopyMat,
        );
        lower.position.set(tree.x, tree.trunkH + tree.coneH * 0.38, tree.z);
        lower.rotation.y = tree.x;
        g.add(lower);

        const upper = new THREE.Mesh(
          new THREE.ConeGeometry(tree.coneR * 0.6, tree.coneH * 0.65, 6),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(tree.green).lerp(
              new THREE.Color("#a8b89a"),
              0.25,
            ),
            roughness: 0.8,
            flatShading: true,
          }),
        );
        upper.position.set(
          tree.x,
          tree.trunkH + tree.coneH * 0.85,
          tree.z,
        );
        upper.rotation.y = tree.z;
        g.add(upper);
      }
    }
  }, []);

  return <group ref={groupRef} />;
}
