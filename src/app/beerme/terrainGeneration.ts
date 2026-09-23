import type { Point } from "./terrainPhysics";

const WORLD_WIDTH = 1000;
const TERRAIN_STEP = 20;
const SPAWN_POINTS = [105, 895];

function seededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function landform(x: number, center: number, width: number) {
  const distance = (x - center) / width;
  return Math.exp(-0.5 * distance * distance);
}

export function makeTerrain(seed: number) {
  const random = seededRandom(seed);
  const points: Point[] = [];
  const baseHeight = 370 + (random() - 0.5) * 24;
  const mainHill = {
    center: 360 + random() * 280,
    width: 78 + random() * 72,
    height: 95 + random() * 80,
  };
  const secondHill = {
    center: 190 + random() * 620,
    width: 58 + random() * 74,
    height: 35 + random() * 65,
  };
  const valley = {
    center: 260 + random() * 480,
    width: 70 + random() * 95,
    depth: 28 + random() * 55,
  };
  const waveOffset = random() * Math.PI * 2;

  for (let x = 0; x <= WORLD_WIDTH; x += TERRAIN_STEP) {
    const ridge =
      baseHeight +
      Math.sin(x / 105 + waveOffset) * 30 +
      Math.sin(x / 210 + seed * 0.013) * 35 -
      landform(x, mainHill.center, mainHill.width) * mainHill.height -
      landform(x, secondHill.center, secondHill.width) * secondHill.height +
      landform(x, valley.center, valley.width) * valley.depth +
      (random() - 0.5) * 24;

    points.push({ x, y: clamp(ridge, 205, 465) });
  }

  for (let pass = 0; pass < 2; pass += 1) {
    const previous = points.map((point) => point.y);
    for (let i = 1; i < points.length - 1; i += 1) {
      points[i].y = (previous[i - 1] + previous[i] * 2 + previous[i + 1]) / 4;
    }
  }

  // Give each character a small stable perch without flattening the nearby hills.
  for (const spawnX of SPAWN_POINTS) {
    const target = points[Math.round(spawnX / TERRAIN_STEP)].y;
    for (const point of points) {
      const distance = Math.abs(point.x - spawnX);
      if (distance >= 75) continue;
      const blend = distance <= 35 ? 0 : (distance - 35) / 40;
      point.y = target + (point.y - target) * blend;
    }
  }

  return points;
}
