import * as THREE from "three";

// ============================================================
// TRACK DEFINITION — Silverstone circuit from RaceCircuitSilverstone.svg
// Scaled to match previous track perimeter (~3860 units)
// Clockwise direction, start/finish on Hamilton Straight
// ============================================================

const TRACK_POINTS: [number, number, number][] = [
  // ===== START/FINISH — Hamilton Straight =====
  [137, 0, 382],
  // Club/Vale — heading NW from Hamilton Straight
  [79, 0, 297],
  [24, 0, 217],
  [10, 0, 127],
  // Infield complex
  [43, 0, 38],
  [16, 0, -55],
  [14, 0, -119],
  [55, 0, -158],
  [50, 0, -195],
  [-4, 0, -206],
  // Woodcote
  [-89, 0, -162],
  [-173, 0, -114],
  [-256, 0, -65],
  // Luffield — complex
  [-339, 0, -16],
  [-388, 0, 52],
  [-336, 0, 113],
  // Brooklands
  [-382, 0, 150],
  [-452, 0, 83],
  // ===== Wellington Straight — heading north on left side =====
  [-493, 0, -2],
  [-481, 0, -97],
  [-462, 0, -192],
  [-439, 0, -286],
  // Stowe/Vale — heading east across bottom-left
  [-378, 0, -352],
  [-281, 0, -349],
  [-186, 0, -332],
  [-93, 0, -308],
  [2, 0, -307],
  [85, 0, -259],
  // ===== Hangar Straight — heading east across top =====
  [178, 0, -263],
  [219, 0, -178],
  [278, 0, -103],
  [346, 0, -34],
  // Maggots/Becketts/Chapel — complex right side heading south
  [413, 0, 36],
  [480, 0, 105],
  [543, 0, 179],
  [574, 0, 265],
  // Copse — heading south back toward straight
  [497, 0, 313],
  [405, 0, 341],
  [317, 0, 379],
  // Hamilton Straight (east end, heading back to start)
  [284, 0, 456],
  [229, 0, 454],
  [192, 0, 453],
];

export function createTrackCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    TRACK_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    true,
    "catmullrom",
    0.5,
  );
}
