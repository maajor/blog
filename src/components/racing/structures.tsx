"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { TRACK_WIDTH, getWallDistance } from "./constants";
import { createTrackCurve, tForPoint } from "./trackCurve";
import { canPlaceExtent, distanceToTrack } from "./scatter";

// —— Silverstone trackside furniture ——————————————————————————
// The circuit sits on a flat WWII RAF airfield amid open Northamptonshire
// farmland: named grandstands with wide sightlines, the wing-shaped pit
// building, hangars on Hangar Straight, hedgerow field boundaries.

const PALETTE = {
  structure: "#9c9180", // warm gray framing
  structureDark: "#7a7060",
  trim: "#5f5648",
  cream: "#e8d9c0",
  seatA: "#b8612a", // terracotta seat rows
  seatB: "#e8d9c0",
  glazing: "#4a4038",
  roof: "#a89c88",
  tire: "#2a2520",
} as const;

const curve = createTrackCurve();

function frameAt(t: number) {
  const p = curve.getPointAt(t);
  const tan = curve.getTangentAt(t);
  const n = new THREE.Vector3()
    .crossVectors(new THREE.Vector3(0, 1, 0), tan)
    .normalize();
  return { p, tan, n };
}

const STAND_DEPTH = 13;
const STAND_CLEARANCE = 3;

export type GrandstandPlan = {
  x: number;
  z: number;
  rotationY: number;
  angleY: number; // long-axis direction (along the track tangent)
  length: number;
};

// Try the preferred side of the track first, fall back to the other
function placeStand(
  anchor: [number, number],
  length: number,
  preferredSide: 1 | -1,
): GrandstandPlan | null {
  const t = tForPoint(anchor[0], anchor[1]);
  const { p, tan, n } = frameAt(t);
  const angleY = Math.atan2(tan.x, tan.z);
  const wd = getWallDistance(t);
  const offset = wd + STAND_DEPTH / 2 + STAND_CLEARANCE;

  for (const side of [preferredSide, (-preferredSide) as 1 | -1]) {
    const pos = p.clone().add(n.clone().multiplyScalar(side * offset));
    // Stand's long axis follows the tangent; front (+Z local) faces the track
    const rotationY = Math.atan2(-side * n.x, -side * n.z);
    if (
      canPlaceExtent(pos.x, pos.z, angleY, length / 2, STAND_DEPTH / 2, STAND_CLEARANCE)
    ) {
      return { x: pos.x, z: pos.z, rotationY, angleY, length };
    }
  }
  return null;
}

export type Vec = { x: number; z: number };

export type TracksidePlan = {
  grandstands: GrandstandPlan[];
  pit: GrandstandPlan | null; // same placement rules as a stand
  tyreLines: { x: number; z: number; angleY: number; count: number }[];
  bridge: { x: number; z: number; angleY: number; span: number } | null;
  hangars: { x: number; z: number; rotationY: number }[];
  tower: Vec | null;
};

export function planTrackside(): TracksidePlan {
  // Named stands along the lap — anchors are Silverstone corner coordinates
  const standSpecs: {
    anchor: [number, number];
    length: number;
    side: 1 | -1;
  }[] = [
    { anchor: [79, 297], length: 40, side: 1 }, // Club
    { anchor: [16, -55], length: 42, side: -1 }, // Village / Loop infield
    { anchor: [-388, 52], length: 46, side: 1 }, // Luffield hairpin
    { anchor: [-481, -97], length: 50, side: 1 }, // Wellington Straight
    { anchor: [-378, -352], length: 55, side: 1 }, // Stowe, end of Hangar Straight entry
    { anchor: [543, 179], length: 50, side: -1 }, // Becketts
  ];

  const grandstands: GrandstandPlan[] = [];
  for (const s of standSpecs) {
    const stand = placeStand(s.anchor, s.length, s.side);
    if (stand) grandstands.push(stand);
  }

  // The Wing — pit building on the pit straight, north side
  const pit = placeStand([256, 455], 66, 1);

  // Tyre stacks at the heavy-braking kinks
  const tyreAnchors: [number, number][] = [
    [55, -158], // infield chicane
    [480, 105], // Maggotts entry
    [-281, -349], // Stowe braking zone
    [-256, -65], // Luffield exit
  ];
  const tyreLines = [];
  for (const [ax, az] of tyreAnchors) {
    const t = tForPoint(ax, az);
    const { p, tan, n } = frameAt(t);
    const wd = getWallDistance(t);
    for (const side of [1, -1] as const) {
      const pos = p.clone().add(n.clone().multiplyScalar(side * (wd + 2.4)));
      if (distanceToTrack(pos.x, pos.z) >= 2.4) {
        tyreLines.push({
          x: pos.x,
          z: pos.z,
          angleY: Math.atan2(tan.x, tan.z),
          count: 12,
        });
        break;
      }
    }
  }

  // Footbridge across Wellington Straight
  let bridge: TracksidePlan["bridge"] = null;
  {
    const t = tForPoint(-481, -97);
    const { p, n } = frameAt(t);
    const span = TRACK_WIDTH + 12;
    const angleY = Math.atan2(n.x, n.z); // crosses the track
    bridge = { x: p.x, z: p.z, angleY, span };
  }

  // RAF heritage — hangars and the control tower off Hangar Straight
  const hangarAnchors: [number, number][] = [
    [219, -178],
    [278, -103],
  ];
  const hangars = [];
  for (const [ax, az] of hangarAnchors) {
    const t = tForPoint(ax, az);
    const { p, tan, n } = frameAt(t);
    const wd = getWallDistance(t);
    const angleY = Math.atan2(tan.x, tan.z);
    for (const side of [1, -1] as const) {
      const pos = p
        .clone()
        .add(n.clone().multiplyScalar(side * (wd + 16)));
      if (canPlaceExtent(pos.x, pos.z, angleY, 11, 5, 4)) {
        hangars.push({ x: pos.x, z: pos.z, rotationY: angleY });
        break;
      }
    }
  }

  let tower: TracksidePlan["tower"] = null;
  {
    const t = tForPoint(178, -263);
    const { p, n } = frameAt(t);
    const wd = getWallDistance(t);
    for (const side of [1, -1] as const) {
      const pos = p.clone().add(n.clone().multiplyScalar(side * (wd + 10)));
      if (canPlaceExtent(pos.x, pos.z, 0, 4, 4, 4)) {
        tower = { x: pos.x, z: pos.z };
        break;
      }
    }
  }

  return { grandstands, pit, tyreLines, bridge, hangars, tower };
}

export function verifyTrackside(): string[] {
  const failures: string[] = [];
  const plan = planTrackside();
  for (const g of plan.grandstands) {
    if (
      !canPlaceExtent(
        g.x,
        g.z,
        g.angleY,
        g.length / 2,
        STAND_DEPTH / 2,
        STAND_CLEARANCE,
      )
    ) {
      failures.push(`grandstand at (${g.x.toFixed(0)}, ${g.z.toFixed(0)})`);
    }
  }
  return failures;
}

// ————— mesh builders (shared across instances) —————

function buildGrandstand(length: number, parent: THREE.Group) {
  const structMat = new THREE.MeshStandardMaterial({
    color: PALETTE.structure,
    roughness: 0.85,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: PALETTE.roof,
    roughness: 0.8,
  });
  const seatA = new THREE.MeshStandardMaterial({
    color: PALETTE.seatA,
    roughness: 0.8,
  });
  const seatB = new THREE.MeshStandardMaterial({
    color: PALETTE.seatB,
    roughness: 0.8,
  });

  const ROWS = 6;
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(length, 1, STAND_DEPTH),
    structMat,
  );
  base.position.set(0, 0.5, 0);
  parent.add(base);

  for (let i = 0; i < ROWS; i++) {
    const row = new THREE.Mesh(
      new THREE.BoxGeometry(length, 1.5, 1.9),
      i % 2 === 0 ? seatA : seatB,
    );
    row.position.set(0, 1.75 + i * 1.45, 5.2 - i * 1.7);
    parent.add(row);
  }

  const back = new THREE.Mesh(new THREE.BoxGeometry(length, 8.5, 0.6), structMat);
  back.position.set(0, 4.75, -6.2);
  parent.add(back);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(length + 1.5, 0.4, STAND_DEPTH + 1),
    roofMat,
  );
  roof.position.set(0, 11.7, 0.4);
  parent.add(roof);

  for (const px of [-length / 2 + 2, -length / 6, length / 6, length / 2 - 2]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10.5, 0.5), structMat);
    post.position.set(px, 5.75, -5.7);
    parent.add(post);
  }
}

function buildPitBuilding(parent: THREE.Group) {
  const wallMat = new THREE.MeshStandardMaterial({
    color: PALETTE.cream,
    roughness: 0.8,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: PALETTE.trim,
    roughness: 0.85,
  });
  const glazingMat = new THREE.MeshStandardMaterial({
    color: PALETTE.glazing,
    roughness: 0.4,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: PALETTE.roof,
    roughness: 0.8,
  });

  // Two storeys with a cantilevered upper "wing" toward the track
  const lower = new THREE.Mesh(new THREE.BoxGeometry(64, 4.5, 6), wallMat);
  lower.position.set(0, 2.25, 0);
  parent.add(lower);

  const wing = new THREE.Mesh(new THREE.BoxGeometry(70, 3, 8.5), wallMat);
  wing.position.set(0, 7, 0.8);
  parent.add(wing);

  const glazing = new THREE.Mesh(new THREE.BoxGeometry(64, 1.6, 0.3), glazingMat);
  glazing.position.set(0, 5.4, 4.4);
  parent.add(glazing);

  const garages = new THREE.Mesh(new THREE.BoxGeometry(64, 1.8, 0.3), trimMat);
  garages.position.set(0, 1.1, 3.2);
  parent.add(garages);

  const roofEdge = new THREE.Mesh(new THREE.BoxGeometry(72, 0.5, 9.5), roofMat);
  roofEdge.position.set(0, 8.75, 0.8);
  parent.add(roofEdge);

  // Scoring tower on one end
  const tower = new THREE.Mesh(new THREE.BoxGeometry(5, 11, 5), wallMat);
  tower.position.set(35, 5.5, 0);
  parent.add(tower);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.6, 0.4), trimMat);
  panel.position.set(35, 9.4, 2.4);
  parent.add(panel);
}

function buildTyreStack(parent: THREE.Group, x: number, z: number) {
  const tireMat = new THREE.MeshStandardMaterial({
    color: PALETTE.tire,
    roughness: 0.95,
  });
  const topMat = new THREE.MeshStandardMaterial({
    color: PALETTE.trim,
    roughness: 0.9,
  });
  const tiers = 2 + Math.floor((Math.abs(x) + Math.abs(z)) % 2);
  for (let i = 0; i < tiers; i++) {
    const t = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 0.42, 10),
      i === tiers - 1 ? topMat : tireMat,
    );
    t.position.set(x, 0.21 + i * 0.44, z);
    parent.add(t);
  }
}

export function TracksideStructures() {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    const g = groupRef.current;
    while (g.children.length > 0) g.remove(g.children[0]);

    const plan = planTrackside();

    for (const stand of plan.grandstands) {
      const node = new THREE.Group();
      buildGrandstand(stand.length, node);
      node.position.set(stand.x, 0, stand.z);
      node.rotation.y = stand.rotationY;
      g.add(node);
    }

    if (plan.pit) {
      const node = new THREE.Group();
      buildPitBuilding(node);
      node.position.set(plan.pit.x, 0, plan.pit.z);
      node.rotation.y = plan.pit.rotationY;
      g.add(node);
    }

    for (const line of plan.tyreLines) {
      const dx = Math.sin(line.angleY);
      const dz = Math.cos(line.angleY);
      for (let i = 0; i < line.count; i++) {
        const f = (i - (line.count - 1) / 2) * 1.5;
        buildTyreStack(g, line.x + dx * f, line.z + dz * f);
      }
    }

    if (plan.bridge) {
      const b = plan.bridge;
      const deckMat = new THREE.MeshStandardMaterial({
        color: PALETTE.structure,
        roughness: 0.85,
      });
      const trimMat = new THREE.MeshStandardMaterial({
        color: PALETTE.trim,
        roughness: 0.9,
      });
      const node = new THREE.Group();
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.7, b.span),
        deckMat,
      );
      deck.position.y = 6.3;
      node.add(deck);
      for (const s of [-1, 1]) {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 0.8, b.span),
          trimMat,
        );
        rail.position.set(s * 1.2, 7.05, 0);
        node.add(rail);
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 6.3, 1.6),
          trimMat,
        );
        post.position.set(0, 3.15, s * (b.span / 2 - 1.5));
        node.add(post);
      }
      node.position.set(b.x, 0, b.z);
      node.rotation.y = b.angleY;
      g.add(node);
    }

    for (const h of plan.hangars) {
      const node = new THREE.Group();
      const wallMat = new THREE.MeshStandardMaterial({
        color: PALETTE.structure,
        roughness: 0.9,
      });
      const base = new THREE.Mesh(new THREE.BoxGeometry(20, 2.6, 8), wallMat);
      base.position.y = 1.3;
      node.add(base);
      const arch = new THREE.Mesh(
        new THREE.CylinderGeometry(4, 4, 20, 12, 1, false, 0, Math.PI),
        new THREE.MeshStandardMaterial({
          color: PALETTE.roof,
          roughness: 0.85,
          flatShading: true,
        }),
      );
      arch.rotation.z = Math.PI / 2;
      arch.position.y = 2.6;
      node.add(arch);
      node.position.set(h.x, 0, h.z);
      node.rotation.y = h.rotationY;
      g.add(node);
    }

    if (plan.tower) {
      const node = new THREE.Group();
      const wallMat = new THREE.MeshStandardMaterial({
        color: PALETTE.cream,
        roughness: 0.8,
      });
      const trimMat = new THREE.MeshStandardMaterial({
        color: PALETTE.trim,
        roughness: 0.9,
      });
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(3.5, 8, 3.5), wallMat);
      shaft.position.y = 4;
      node.add(shaft);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(6, 2.2, 6), trimMat);
      cab.position.y = 9.1;
      node.add(cab);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.4, 6.8), wallMat);
      cap.position.y = 10.4;
      node.add(cap);
      node.position.set(plan.tower.x, 0, plan.tower.z);
      g.add(node);
    }
  }, []);

  return <group ref={groupRef} />;
}
