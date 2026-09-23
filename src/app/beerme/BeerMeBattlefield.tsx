"use client";

import { useEffect, useRef, useState } from "react";

import type { Point } from "./terrainPhysics";
export type { Point } from "./terrainPhysics";
export type ProjectileKind = "classic" | "tallboy" | "keg";
export type Projectile = Point & {
  owner: "player" | "opponent";
  rotation: number;
  kind: ProjectileKind;
};
export type Explosion = Point & { id: number; kind: ProjectileKind };
export type DamageFlash = { id: number; target: "player" | "opponent"; amount: number };

type Scene = {
  terrain: Point[];
  player: Point;
  opponent: Point;
  projectile: Projectile | null;
  explosion: Explosion | null;
  angle: number;
  power: number;
  canFire: boolean;
  playerHealth: number;
  opponentHealth: number;
  playerToken: number;
  opponentToken: number;
  damageFlash: DamageFlash | null;
  winner: "player" | "opponent" | null;
};

// One source sprite pixel = one framebuffer pixel. Physics retain world coordinates.
const WIDTH = 500;
const HEIGHT = 270;
const SCALE = 0.5;
const SKY = ["#477bac", "#508ab7", "#5a9bc3", "#6cadd0", "#82bed8", "#9ccee0", "#b9dee6", "#d6e9dd"];
const GRASS = ["#446b35", "#4f7c38", "#598c3e", "#679b45", "#7ba64e"];
const PROJECTILES: Record<ProjectileKind, { image: number; size: number }> = {
  classic: { image: 0, size: 18 },
  tallboy: { image: 1, size: 18 },
  keg: { image: 2, size: 45 },
};

function spriteUrl(token: number, direction: "east" | "west") {
  return `https://raw.githubusercontent.com/the-pixelshop/moonbirds/main/export%20by%20tokenid/${token}/${token}_${direction}_idle.gif`;
}

function noise(x: number, y: number) {
  let n = Math.imul(x + 7919, 374761393) + Math.imul(y + 6841, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function surface(terrain: Point[], x: number) {
  const wx = Math.max(0, Math.min(1000, x / SCALE));
  const index = Math.min(Math.floor(wx / 20), terrain.length - 2);
  const a = terrain[index];
  const b = terrain[index + 1];
  return Math.round((a.y + (b.y - a.y) * ((wx - a.x) / (b.x - a.x))) * SCALE);
}

function pixelLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string) {
  x0 = Math.round(x0); y0 = Math.round(y0);
  x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  ctx.fillStyle = color;
  for (;;) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const twice = error * 2;
    if (twice >= dy) { error += dy; x0 += sx; }
    if (twice <= dx) { error += dx; y0 += sy; }
  }
}

function pixelDisk(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  ctx.fillStyle = color;
  const r = Math.max(1, Math.round(radius));
  for (let row = -r; row <= r; row += 1) {
    const half = Math.floor(Math.sqrt(r * r - row * row));
    ctx.fillRect(Math.round(x) - half, Math.round(y) + row, half * 2 + 1, 1);
  }
}

function paintTerrain(ctx: CanvasRenderingContext2D, terrain: Point[], original: Point[]) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  for (let x = 0; x < WIDTH; x += 1) {
    const top = surface(terrain, x);
    const crater = top > surface(original, x) + 2;
    for (let y = top; y < HEIGHT; y += 1) {
      const depth = y - top;
      const patch = Math.sin(x / 36 + y / 19) + Math.sin(x / 17 - y / 32);
      const shade = Math.max(0, Math.min(4, Math.floor(2.6 + patch * 0.7 - depth / 100 + noise(x, y) * 0.7)));
      ctx.fillStyle = crater && depth < 9
        ? ["#424737", "#626044", "#80774e"][Math.min(2, Math.floor(depth / 3))]
        : GRASS[shade];
      if (depth === 0) ctx.fillStyle = crater ? "#374431" : "#b4ca70";
      else if (depth < 3 && !crater) ctx.fillStyle = "#8bb853";
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Stable meadow details are clipped to the current surface; craters remove them.
  for (let x = 3; x < WIDTH - 3; x += 3) {
    for (let y = 135; y < HEIGHT - 3; y += 4) {
      const top = surface(terrain, x);
      if (y < top + 6 || (top > surface(original, x) + 2 && y < top + 13)) continue;
      const pick = noise(x * 3, y * 7);
      if (pick > 0.955) {
        ctx.fillStyle = "#345c36";
        ctx.fillRect(x, y, 1, 3);
        ctx.fillRect(x - 1, y + 1, 3, 1);
        ctx.fillStyle = pick > 0.985 ? "#f4e9b7" : "#e1b458";
        ctx.fillRect(x - 1, y - 1, 3, 1);
        ctx.fillRect(x, y - 2, 1, 3);
        ctx.fillStyle = pick > 0.985 ? "#e4ac50" : "#fff1b7";
        ctx.fillRect(x, y - 1, 1, 1);
      } else if (pick < 0.1) {
        ctx.fillStyle = pick < 0.04 ? "#8cb355" : "#396637";
        ctx.fillRect(x, y, 1, 2);
        ctx.fillRect(x + 2, y - 1, 1, 2);
      }
    }
  }
}

function paintSky(ctx: CanvasRenderingContext2D) {
  for (let y = 0; y < HEIGHT; y += 1) {
    const band = Math.min(SKY.length - 1, Math.floor(y / 27));
    ctx.fillStyle = SKY[band];
    ctx.fillRect(0, y, WIDTH, 1);
    if (band < SKY.length - 1 && y % 27 > 21) {
      ctx.fillStyle = SKY[band + 1];
      for (let x = y % 2; x < WIDTH; x += 2) ctx.fillRect(x, y, 1, 1);
    }
  }
  pixelDisk(ctx, 391, 44, 16, "#b9ced0");
  pixelDisk(ctx, 391, 44, 12, "#f7ebaf");
  // Distant stepped hills establish depth without introducing smooth vector edges.
  for (let x = 0; x < WIDTH; x += 1) {
    const ridge = Math.round(166 + Math.sin(x / 67) * 13 + Math.sin(x / 28) * 5);
    ctx.fillStyle = "#84b9a0";
    ctx.fillRect(x, ridge, 1, HEIGHT - ridge);
    const near = Math.round(186 + Math.sin(x / 45 + 2) * 17);
    ctx.fillStyle = "#699e80";
    ctx.fillRect(x, near, 1, HEIGHT - near);
  }
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const rect = (dx: number, dy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x + dx * scale), Math.round(y + dy * scale), Math.ceil(w * scale), Math.ceil(h * scale));
  };
  rect(0, 10, 63, 7, "#b3d5df");
  rect(6, 5, 49, 10, "#dfebdf");
  rect(14, 0, 16, 14, "#f3f1df");
  rect(11, 3, 24, 9, "#f3f1df");
  rect(33, 4, 14, 8, "#f3f1df");
  rect(4, 10, 55, 3, "#f3f1df");
  rect(8, 17, 46, 2, "#9fc5d2");
}

function energyHud(
  ctx: CanvasRenderingContext2D,
  side: "left" | "right",
  label: string,
  health: number,
) {
  const width = 91;
  const x = side === "left" ? 6 : WIDTH - width - 6;
  const value = Math.max(0, Math.min(100, health));
  ctx.fillStyle = "#27343a";
  ctx.fillRect(x, 6, width, 18);
  ctx.fillStyle = "#d9decf";
  ctx.fillRect(x + 1, 7, width - 2, 1);
  ctx.fillRect(x + 1, 22, width - 2, 1);
  ctx.font = "bold 7px monospace";
  ctx.textBaseline = "top";
  ctx.textAlign = side;
  ctx.fillStyle = "#f4edcf";
  ctx.fillText(`${label} ENERGY ${value}`, side === "left" ? x + 5 : x + width - 5, 9);
  ctx.fillStyle = "#56635b";
  ctx.fillRect(x + 5, 18, width - 10, 2);
  ctx.fillStyle = side === "left" ? "#c5db8e" : "#ecc47e";
  const barWidth = Math.round((width - 10) * value / 100);
  ctx.fillRect(side === "left" ? x + 5 : x + width - 5 - barWidth, 18, barWidth, 2);
}

export default function BeerMeBattlefield(scene: Scene) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef(scene);
  const [assetError, setAssetError] = useState(false);
  useEffect(() => { sceneRef.current = scene; }, [scene]);
  useEffect(() => { setAssetError(false); }, [scene.playerToken, scene.opponentToken]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    setAssetError(false);
    let disposed = false;
    let frame = 0;
    const images = [
      "/sprites/beerme-can.png",
      "/sprites/beerme-can-tallboy.png",
      "/sprites/beerme-keg.png",
    ].map((src) => {
      const image = new Image();
      image.src = src;
      image.onerror = () => { if (!disposed) setAssetError(true); };
      return image;
    });
    const landscape = document.createElement("canvas");
    landscape.width = WIDTH; landscape.height = HEIGHT;
    const landCtx = landscape.getContext("2d")!;
    const sky = document.createElement("canvas");
    sky.width = WIDTH; sky.height = HEIGHT;
    paintSky(sky.getContext("2d")!);
    let lastTerrain: Point[] | null = null;
    let original = sceneRef.current.terrain;
    let lastExplosion: number | undefined;
    let explosionStart = 0;
    let previous = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (now - previous < 1000 / 30) return;
      previous = now;
      const state = sceneRef.current;
      const positions = [state.player, state.opponent];
      if (state.terrain !== lastTerrain) {
        // Cratering reuses unaffected points; a new field replaces every point.
        if (lastTerrain && state.terrain.every((point, i) => point !== lastTerrain![i])) {
          original = state.terrain;
        }
        paintTerrain(landCtx, state.terrain, original);
        lastTerrain = state.terrain;
      }
      ctx.drawImage(sky, 0, 0);
      const time = reducedMotion.matches ? 0 : now / 1000;
      for (let i = 0; i < 5; i += 1) {
        const speed = 1.5 + (i % 3) * 0.7;
        const x = ((i * 139 + time * speed) % 650) - 80;
        cloud(ctx, x, 24 + (i % 3) * 31, i % 2 ? 0.75 : 1);
      }
      ctx.drawImage(landscape, 0, 0);

      positions.forEach((position) => {
        const x = Math.round(position.x * SCALE), y = Math.round(position.y * SCALE);
        ctx.fillStyle = "#345238";
        ctx.fillRect(x - 12, y - 1, 24, 2);
      });

      if (state.canFire) {
        const angle = state.angle * Math.PI / 180;
        const length = (22 + state.power * 0.65) * SCALE;
        const x = (positions[0].x + 22) * SCALE, y = (positions[0].y - 76) * SCALE;
        const endX = x + Math.cos(angle) * length, endY = y - Math.sin(angle) * length;
        pixelLine(ctx, x, y + 1, endX, endY + 1, "#603b37");
        pixelLine(ctx, x, y, endX, endY, "#f8db79");
        for (const side of [-0.6, 0.6]) {
          pixelLine(ctx, endX, endY, endX - Math.cos(angle + side) * 5, endY + Math.sin(angle + side) * 5, "#f8db79");
        }
      }
      if (state.projectile) {
        const shot = state.projectile;
        const projectileArt = PROJECTILES[shot.kind];
        const halfSize = projectileArt.size / 2;
        ctx.save();
        ctx.translate(Math.round(shot.x * SCALE), Math.round(shot.y * SCALE));
        ctx.rotate(Math.round((shot.rotation + now * 0.75) / 15) * Math.PI / 12);
        const projectileImage = images[projectileArt.image];
        if (projectileImage?.complete && projectileImage.naturalWidth) {
          ctx.drawImage(projectileImage, -halfSize, -halfSize, projectileArt.size, projectileArt.size);
        }
        ctx.restore();
      }
      if (state.explosion) {
        if (lastExplosion !== state.explosion.id) {
          lastExplosion = state.explosion.id;
          explosionStart = now;
        }
        const age = (now - explosionStart) / 1000;
        const x = state.explosion.x * SCALE, y = state.explosion.y * SCALE;
        const explosionScale = state.explosion.kind === "tallboy" ? 1.25 : 1;
        // Pressurized golden spray, followed by irregular pale foam and droplets.
        if (age < 0.55) {
          const bloom = Math.sin(Math.min(1, age / 0.55) * Math.PI);
          for (let i = 0; i < 9; i += 1) {
            const a = Math.PI + (i / 8) * Math.PI;
            const radius = (4 + bloom * (5 + noise(i, 41) * 6)) * explosionScale;
            const cx = x + Math.cos(a) * bloom * 23 * explosionScale;
            const cy = y + (Math.sin(a) * bloom * 26 - 3) * explosionScale;
            pixelDisk(ctx, cx, cy, radius, "#f3d887");
            pixelDisk(ctx, cx - 1, cy - 3, radius * 0.7, "#fff6d7");
            pixelDisk(ctx, cx - 2, cy - 5, radius * 0.35, "#fffdf0");
          }
        }
        for (let i = 0; i < 36; i += 1) {
          const a = Math.PI + noise(i, 9) * Math.PI;
          const speed = 25 + noise(i, 7) * 65;
          const dx = Math.cos(a) * speed * age * explosionScale;
          const dy = (Math.sin(a) * speed * age - age * 19 + age * age * 65) * explosionScale;
          if (age > 0.75 + noise(i, 51) * 0.25) continue;
          const px = Math.round(x + dx), py = Math.round(y + dy);
          if (i % 4 === 0) {
            pixelDisk(ctx, px, py, (age < 0.65 ? 2 : 1) * explosionScale, "#fffdf0");
            ctx.fillStyle = "#e9d9a7";
            ctx.fillRect(px, py + 1, 1, 1);
          } else {
            ctx.fillStyle = i % 3 ? "#f6dfa0" : "#fff6d7";
            ctx.fillRect(px, py, 1, age < 0.5 ? 3 : 2);
          }
        }
      }
      energyHud(ctx, "left", "YOU", state.playerHealth);
      energyHud(ctx, "right", String(state.opponentToken), state.opponentHealth);
    };
    frame = requestAnimationFrame(draw);
    return () => { disposed = true; cancelAnimationFrame(frame); images.forEach((image) => { image.onerror = null; }); };
  }, []);

  const spriteStyle = (position: Point) => ({
    left: `${((position.x * SCALE - 24) / WIDTH) * 100}%`,
    top: `${((position.y * SCALE - 46) / HEIGHT) * 100}%`,
    width: `${(48 / WIDTH) * 100}%`,
  });

  const damageStyle = (position: Point) => ({
    left: `${(position.x * SCALE / WIDTH) * 100}%`,
    top: `${((position.y * SCALE - 54) / HEIGHT) * 100}%`,
  });

  return (
    <div className="beerme-battlefield">
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} role="img" aria-label="Pixel-art battlefield with rolling green hills, flowers, drifting clouds, and two Moonbird opponents." />
      <img
        className="beerme-sprite"
        src={spriteUrl(scene.playerToken, "east")}
        style={spriteStyle(scene.player)}
        alt=""
        aria-hidden="true"
        onError={() => setAssetError(true)}
      />
      <img
        className="beerme-sprite"
        src={spriteUrl(scene.opponentToken, "west")}
        style={spriteStyle(scene.opponent)}
        alt=""
        aria-hidden="true"
        onError={() => setAssetError(true)}
      />
      {scene.damageFlash && (
        <span
          key={scene.damageFlash.id}
          className="beerme-damage"
          style={damageStyle(scene.damageFlash.target === "player" ? scene.player : scene.opponent)}
          aria-hidden="true"
        >
          -{scene.damageFlash.amount}
        </span>
      )}
      {scene.winner && (
        <div className="beerme-winner" role="status">
          Birb {scene.winner === "player" ? scene.playerToken : scene.opponentToken} wins
        </div>
      )}
      {assetError && <p className="beerme-asset-error" role="alert">Sprite artwork could not load. Please reload the page.</p>}
    </div>
  );
}
