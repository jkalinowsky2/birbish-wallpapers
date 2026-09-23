import assert from "node:assert/strict";
import test from "node:test";
import { makeTerrain } from "./terrainGeneration";
import { terrainYAt } from "./terrainPhysics";

test("generated terrain stays in the playable vertical range", () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    for (const point of makeTerrain(seed)) {
      assert.ok(point.y >= 205 && point.y <= 465, `seed ${seed} escaped at ${point.x}`);
    }
  }
});

test("spawn areas remain below the 15 degree slide threshold", () => {
  const maximumSlope = Math.tan(15 * Math.PI / 180) + 1e-6;
  for (let seed = 1; seed <= 200; seed += 1) {
    const terrain = makeTerrain(seed);
    for (const x of [105, 895]) {
      const slope = Math.abs((terrainYAt(terrain, x + 4) - terrainYAt(terrain, x - 4)) / 8);
      assert.ok(slope <= maximumSlope, `seed ${seed} has an unstable spawn at ${x}`);
    }
  }
});

test("fields consistently include substantial elevation changes", () => {
  const relief = Array.from({ length: 200 }, (_, seed) => {
    const heights = makeTerrain(seed + 1).map(point => point.y);
    return Math.max(...heights) - Math.min(...heights);
  });
  const largeFields = relief.filter(value => value >= 130).length;
  assert.ok(largeFields >= 150, `only ${largeFields} of 200 fields had large hills`);
});
