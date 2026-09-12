import * as THREE from "three";
import { createTrackCurve } from "./trackCurve";
import { getWallDistance } from "./constants";

// Deterministic LCG so the scenery is identical on every reload
export function createScatterRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// The loop doubles back on itself, so sections far apart in track-parameters
// can sit right next to each other in space (Luffield/Brooklands are ~1 unit
// apart wall-to-wall). Placement is keep-out tested against EVERY section.
const curve = createTrackCurve();
const KEEP_OUT_N = 400;
const keepOut: { x: number; z: number; wd: number }[] = [];
for (let i = 0; i < KEEP_OUT_N; i++) {
  const t = i / KEEP_OUT_N;
  const p = curve.getPointAt(t);
  keepOut.push({ x: p.x, z: p.z, wd: getWallDistance(t) });
}

// Signed distance to the whole track in XZ: <0 means inside some section's walls
export function distanceToTrack(x: number, z: number): number {
  let min = Infinity;
  for (const k of keepOut) {
    const d = Math.hypot(x - k.x, z - k.z) - k.wd;
    if (d < min) min = d;
  }
  return min;
}

export type ScatterPlacement = { x: number; z: number; rotationY: number };

// Find a spot with at least `footprint + clearance` beyond the walls of every
// section. `spread` adds random extra distance. Returns null if no spot found.
export function sampleOffTrack(
  rand: () => number,
  footprint: number,
  clearance: number,
  spread = 20,
  tries = 10,
): ScatterPlacement | null {
  for (let i = 0; i < tries; i++) {
    const t = rand();
    const side = rand() > 0.5 ? 1 : -1;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const n = new THREE.Vector3()
      .crossVectors(new THREE.Vector3(0, 1, 0), tan)
      .normalize();
    const dist = getWallDistance(t) + footprint + clearance + rand() * spread;
    const pos = p.clone().add(n.clone().multiplyScalar(side * dist));
    if (distanceToTrack(pos.x, pos.z) >= footprint + clearance) {
      return { x: pos.x, z: pos.z, rotationY: rand() * Math.PI * 2 };
    }
  }
  return null;
}
