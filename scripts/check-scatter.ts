// Geometric regression check: every planned scenery placement must sit
// beyond the walls of EVERY track section, including its own footprint.
// Run with: npx tsx scripts/check-scatter.ts
import { verifyGroundDecor } from "../src/components/racing/Ground";
import { verifyFarmsteads } from "../src/components/racing/Buildings";
import { verifyTrees } from "../src/components/racing/Trees";
import { verifyTrackside } from "../src/components/racing/structures";

const failures = [
  ...verifyTrees(),
  ...verifyFarmsteads(),
  ...verifyGroundDecor(),
  ...verifyTrackside(),
];

if (failures.length > 0) {
  console.error(`${failures.length} placement(s) intersect the track keep-out:`);
  for (const f of failures) console.error(`  FAIL ${f}`);
  process.exit(1);
}
console.log("scatter keep-out OK");
