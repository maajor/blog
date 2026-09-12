"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { createScatterRng, sampleOffTrack } from "./scatter";

const TREE_GREENS = ["#7a8b6a", "#8a9a7b", "#6d7d5d"];
const BUSH_GREENS = ["#8a9a7b", "#7a8b6a"];

export type TreePlan = {
  x: number;
  z: number;
  trunkH: number;
  twoTier: boolean;
  lowerH: number;
  lowerR: number;
  upperH: number;
  upperR: number;
  green: string;
  upperGreen: string;
  bushes: { dx: number; dz: number; r: number; color: string }[];
};

// Pure placement planning — no THREE objects, so scripts can verify geometry
export function planTrees(count = 80, seed = 123): TreePlan[] {
  const rand = createScatterRng(seed);
  const trees: TreePlan[] = [];
  let attempts = 0;
  while (trees.length < count && attempts < count * 2) {
    attempts++;
    const spot = sampleOffTrack(rand, 2.2, 1.5, 30);
    if (!spot) continue;

    const trunkH = 2 + rand() * 2;
    const green = TREE_GREENS[Math.floor(rand() * TREE_GREENS.length)];
    const twoTier = rand() < 0.45;
    const lowerR = 1.6 + rand() * 1.6;
    const lowerH = 2.2 + rand() * 1.6;
    const upperH = 1.8 + rand() * 1.4;

    const bushes: TreePlan["bushes"] = [];
    if (rand() < 0.35) {
      const bushCount = 1 + Math.floor(rand() * 3);
      for (let b = 0; b < bushCount; b++) {
        bushes.push({
          dx: (rand() - 0.5) * 2.4,
          dz: (rand() - 0.5) * 2.4,
          r: 0.4 + rand() * 0.5,
          color: BUSH_GREENS[Math.floor(rand() * BUSH_GREENS.length)],
        });
      }
    }

    trees.push({
      x: spot.x,
      z: spot.z,
      trunkH,
      twoTier,
      lowerH,
      lowerR,
      upperH,
      upperR: lowerR * 0.62,
      green,
      upperGreen: "#a8b89a",
      bushes,
    });
  }
  return trees;
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
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.3, tree.trunkH, 6),
        trunkMat,
      );
      trunk.position.set(tree.x, tree.trunkH / 2, tree.z);
      g.add(trunk);

      const canopyMat = new THREE.MeshStandardMaterial({
        color: tree.green,
        roughness: 0.8,
        flatShading: true,
      });
      if (tree.twoTier) {
        // Tapered tower: wide tier below, narrower lighter tier above
        const lower = new THREE.Mesh(
          new THREE.ConeGeometry(tree.lowerR, tree.lowerH, 6),
          canopyMat,
        );
        lower.position.set(
          tree.x,
          tree.trunkH - 0.5 + tree.lowerH / 2,
          tree.z,
        );
        lower.rotation.y = Math.random() * Math.PI;
        g.add(lower);

        const upperMat = canopyMat.clone();
        upperMat.color = new THREE.Color(tree.green).lerp(
          new THREE.Color(tree.upperGreen),
          0.25,
        );
        const upper = new THREE.Mesh(
          new THREE.ConeGeometry(tree.upperR, tree.upperH, 6),
          upperMat,
        );
        upper.position.set(
          tree.x,
          tree.trunkH - 0.5 + tree.lowerH * 0.78 + tree.upperH / 2,
          tree.z,
        );
        upper.rotation.y = Math.random() * Math.PI;
        g.add(upper);
      } else {
        const canopyH = 3 + tree.lowerH;
        const canopyR = tree.lowerR * 0.94;
        const canopy = new THREE.Mesh(
          new THREE.ConeGeometry(canopyR, canopyH, 6),
          canopyMat,
        );
        canopy.position.set(tree.x, tree.trunkH + canopyH / 2 - 0.5, tree.z);
        g.add(canopy);
      }

      for (const bush of tree.bushes) {
        const bushMesh = new THREE.Mesh(
          new THREE.IcosahedronGeometry(bush.r, 0),
          new THREE.MeshStandardMaterial({
            color: bush.color,
            roughness: 0.9,
            flatShading: true,
          }),
        );
        bushMesh.position.set(tree.x + bush.dx, bush.r * 0.5, tree.z + bush.dz);
        g.add(bushMesh);
      }
    }
  }, []);

  return <group ref={groupRef} />;
}
