// Geometric regression check: every planned scatter placement must sit at
// least `footprint + clearance` beyond the walls of EVERY track section.
// Run with: npx tsx scripts/check-scatter.ts
import { distanceToTrack } from "../src/components/racing/scatter";
import { planTrees } from "../src/components/racing/Trees";
import { planBuildings } from "../src/components/racing/Buildings";
import { planGroundDecor } from "../src/components/racing/Ground";

let failures = 0;
let checked = 0;

function check(label: string, x: number, z: number, required: number) {
  checked++;
  const d = distanceToTrack(x, z);
  if (d < required) {
    failures++;
    console.error(
      `FAIL ${label} at (${x.toFixed(1)}, ${z.toFixed(1)}): ` +
        `clearance ${d.toFixed(2)} < required ${required.toFixed(2)}`,
    );
  }
}

const trees = planTrees();
for (const t of trees) check("tree", t.x, t.z, 2.2 + 1.5);

const buildings = planBuildings();
for (const b of buildings) check("building", b.x, b.z, 3);

const { patches, mounds, rocks } = planGroundDecor();
for (const p of patches) check("patch", p.x, p.z, p.r + 1);
for (const m of mounds) check("mound", m.x, m.z, m.r + 3);
for (const r of rocks) check("rock", r.x, r.z, r.r + 0.4 + 1);

console.log(
  `checked ${checked} placements ` +
    `(${trees.length} trees, ${buildings.length} buildings, ` +
    `${patches.length} patches, ${mounds.length} mounds, ${rocks.length} rocks)`,
);
if (failures > 0) {
  console.error(`${failures} placement(s) intersect the track keep-out`);
  process.exit(1);
}
console.log("scatter keep-out OK");
