import assert from "node:assert/strict";
import test from "node:test";
import { bodySettled, stepBody, terrainYAt, type Body, type Point } from "./terrainPhysics";

const field = (height: (x: number) => number): Point[] =>
  Array.from({ length: 51 }, (_, i) => ({ x: i * 20, y: height(i * 20) }));

function settle(terrain: Point[], x: number, y = terrainYAt(terrain, x)) {
  let body: Body = { x, y, vx: 0, vy: 0 };
  for (let i = 0; i < 2400; i += 1) {
    body = stepBody(body, terrain, 1 / 120);
    if (bodySettled(body, terrain)) return body;
  }
  assert.fail("Character did not settle within 20 simulated seconds");
}

test("flat ground falls vertically and exactly 15 degrees does not slide", () => {
  const flat = field(() => 400);
  assert.deepEqual(settle(flat, 400, 320), { x: 400, y: 400, vx: 0, vy: 0 });
  const fifteenDegrees = Math.tan(15 * Math.PI / 180);
  for (const slope of [-fifteenDegrees, fifteenDegrees]) {
    const terrain = field(x => 400 + (x - 500) * slope);
    assert.equal(settle(terrain, 500).x, 500);
  }
});

test("slopes just above 15 degrees move the character downhill", () => {
  const sixteenDegrees = Math.tan(16 * Math.PI / 180);
  assert.ok(settle(field(x => 400 + (x - 500) * sixteenDegrees), 500).x > 500);
  assert.ok(settle(field(x => 400 - (x - 500) * sixteenDegrees), 500).x < 500);
});

test("both crater walls slide downhill after landing and stop on stable ground", () => {
  const crater = field(x => 300 + Math.max(0, 100 - Math.abs(x - 500) * 2));
  const left = settle(crater, 470, 280);
  const right = settle(crater, 530, 280);
  assert.ok(left.x > 490 && left.x <= 500);
  assert.ok(right.x < 510 && right.x >= 500);
  assert.equal(left.y, terrainYAt(crater, left.x));
  assert.equal(right.y, terrainYAt(crater, right.x));
});

test("sliding respects world boundaries", () => {
  assert.equal(settle(field(x => 2 * x), 970).x, 976);
  assert.equal(settle(field(x => 2000 - 2 * x), 30).x, 24);
});
