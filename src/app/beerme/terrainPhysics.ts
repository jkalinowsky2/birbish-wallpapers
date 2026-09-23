export type Point = { x: number; y: number };
export type Body = Point & { vx: number; vy: number };

const SLIDE_SLOPE = Math.tan(15 * Math.PI / 180);

export function terrainYAt(points: Point[], x: number) {
  const safeX = Math.max(0, Math.min(1000, x));
  const index = Math.min(Math.floor(safeX / 20), points.length - 2);
  const left = points[index];
  const right = points[index + 1];
  return left.y + (right.y - left.y) * (safeX - left.x) / (right.x - left.x);
}

function slopeAt(points: Point[], x: number) {
  return (terrainYAt(points, x + 4) - terrainYAt(points, x - 4)) / 8;
}

export function stepBody(body: Body, terrain: Point[], dt: number): Body {
  let { x, y, vx, vy } = body;
  const ground = terrainYAt(terrain, x);
  if (y >= ground - 0.01) {
    y = ground;
    vy = 0;
    const slope = slopeAt(terrain, x);
    // Positive screen-space slope descends right. Bodies slide above 15 degrees.
    if (Math.abs(slope) <= SLIDE_SLOPE + 1e-6) return { x, y, vx: 0, vy: 0 };
    vx += 420 * slope / (1 + slope * slope) * dt;
    vx = Math.max(-90, Math.min(90, vx));
    const nextX = Math.max(24, Math.min(976, x + vx * dt));
    if (nextX === x) return { x, y, vx: 0, vy: 0 };
    x = nextX;
    y = terrainYAt(terrain, x);
    if (Math.abs(slopeAt(terrain, x)) <= SLIDE_SLOPE + 1e-6) vx = 0;
  } else {
    vy += 420 * dt;
    x = Math.max(24, Math.min(976, x + vx * dt));
    y = Math.min(terrainYAt(terrain, x), y + vy * dt);
    if (y >= terrainYAt(terrain, x)) vy = 0;
  }
  return { x, y, vx, vy };
}

export function bodySettled(body: Body, terrain: Point[]) {
  return Math.abs(body.y - terrainYAt(terrain, body.x)) < 0.01 &&
    body.vx === 0 && body.vy === 0 &&
    (Math.abs(slopeAt(terrain, body.x)) <= SLIDE_SLOPE + 1e-6 || body.x <= 24 || body.x >= 976);
}
