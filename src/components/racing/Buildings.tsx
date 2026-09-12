"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { createScatterRng, sampleOffTrack } from "./scatter";

export type BuildingTier = { w: number; h: number; d: number; y: number };

export type BuildingPlan = {
  x: number;
  z: number;
  rotationY: number;
  tone: { r: number; g: number; b: number };
  tiers: BuildingTier[];
  cap?: { w: number; h: number; d: number; y: number };
};

// Pure placement planning — no THREE objects, so scripts can verify geometry
export function planBuildings(count = 40, seed = 42): BuildingPlan[] {
  const rand = createScatterRng(seed);
  const buildings: BuildingPlan[] = [];
  let attempts = 0;
  while (buildings.length < count && attempts < count * 2) {
    attempts++;

    const w = 3 + rand() * 8;
    const d = 3 + rand() * 8;
    const h = 8 + rand() * 35;
    const spot = sampleOffTrack(rand, 0.5 * Math.hypot(w, d), 3, 40);
    if (!spot) continue;

    // Warm gray forms, no emissive
    const brightness = 0.55 + rand() * 0.15;

    // Stepped tiers — a quiet Monument Valley silhouette
    const tiers: BuildingTier[] = [];
    const tierCount = 1 + Math.floor(rand() * 3); // 1..3
    let y = 0;
    for (let tier = 0; tier < tierCount; tier++) {
      const shrink = Math.pow(0.72, tier);
      const tierH =
        tierCount === 1 ? h : tier === 0 ? h * 0.55 : tier === 1 ? h * 0.3 : h * 0.15;
      tiers.push({ w: w * shrink, h: tierH, d: d * shrink, y });
      y += tierH;
    }

    // Occasional terracotta cap echoes the accent color
    let cap: BuildingPlan["cap"];
    if (tierCount > 1 && rand() < 0.35) {
      const shrink = Math.pow(0.72, tierCount - 1);
      cap = { w: w * shrink * 0.7, h: 0.6, d: d * shrink * 0.7, y };
    }

    buildings.push({
      x: spot.x,
      z: spot.z,
      rotationY: spot.rotationY,
      tone: { r: brightness * 0.95, g: brightness * 0.9, b: brightness * 0.85 },
      tiers,
      cap,
    });
  }
  return buildings;
}

export function Buildings() {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    const g = groupRef.current;
    while (g.children.length > 0) g.remove(g.children[0]);

    for (const b of planBuildings()) {
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(b.tone.r, b.tone.g, b.tone.b),
        roughness: 0.85,
      });
      for (const tier of b.tiers) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(tier.w, tier.h, tier.d), mat);
        mesh.position.set(b.x, tier.y + tier.h / 2, b.z);
        mesh.rotation.y = b.rotationY;
        g.add(mesh);
      }
      if (b.cap) {
        const cap = new THREE.Mesh(
          new THREE.BoxGeometry(b.cap.w, b.cap.h, b.cap.d),
          new THREE.MeshStandardMaterial({ color: "#b8612a", roughness: 0.7 }),
        );
        cap.position.set(b.x, b.cap.y + b.cap.h / 2, b.z);
        cap.rotation.y = b.rotationY;
        g.add(cap);
      }
    }
  }, []);

  return <group ref={groupRef} />;
}
