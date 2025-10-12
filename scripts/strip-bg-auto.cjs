/* Flood-remove edge background, then (optionally) remove large interior islands
   Usage:
     # batch
     node scripts/strip-bg-flood+islands.cjs <inDir> <outDir>
     # single file
     node scripts/strip-bg-flood+islands.cjs <inDir> <outDir> 1066.png
*/
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// ---- CLI ----
const IN_DIR   = process.argv[2] ?? "downloads/trenchers";
const OUT_DIR  = process.argv[3] ?? "downloads/trenchers-clean";
const ONE_FILE = process.argv[4] ?? null;

fs.mkdirSync(OUT_DIR, { recursive: true });

// ---- Config ----
// Two known BG colors with their own tolerances
const BG_OPTIONS = [
  { name: "blue",   color: { r: 6,   g: 79,  b: 198 }, tol: 1 },
  { name: "yellow", color: { r: 255, g: 214, b: 44  }, tol: 35 },
];

// Remove interior islands larger than this many pixels (after Pass A).
// Tune per resolution. For 768x768, 1500–4000 works well for halos;
// hair holes are typically << 500 px.
const ISLAND_AREA_MIN = 2000;  // try 2000–3000 for your set

// Optional feather for anti-halo. Keep 0 for crisp pixel art.
const FEATHER = 0;

// ---- Helpers ----
function dist2(a, b) {
  const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
  return dr*dr + dg*dg + db*db;
}
function colorAt(buf, i) {
  return { r: buf[i], g: buf[i+1], b: buf[i+2] };
}
function detectBackground(buf, width, height) {
  const idxTL = 0;
  const idxTR = (width - 1) * 4;
  const idxBL = (width * (height - 1)) * 4;
  const idxBR = ((width * height) - 1) * 4;
  const samples = [idxTL, idxTR, idxBL, idxBR].map(i => colorAt(buf, i));
  const avg = samples.reduce((acc, s) => ({
    r: acc.r + s.r / samples.length,
    g: acc.g + s.g / samples.length,
    b: acc.b + s.b / samples.length,
  }), { r: 0, g: 0, b: 0 });

  let best = null, bestD = Infinity;
  for (const opt of BG_OPTIONS) {
    const d = dist2(avg, opt.color);
    if (d < bestD) { best = opt; bestD = d; }
  }
  return best;
}

// Pass A: flood from edges, clear only edge-connected BG pixels
function stripByFlood(buf, width, height, BG, tol) {
  const T2 = tol * tol;
  const npx = width * height;
  const visited = new Uint8Array(npx);
  const q = new Uint32Array(npx);
  let qh = 0, qt = 0;

  function tryPush(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (visited[p]) return;
    const i = p * 4;
    if (dist2(colorAt(buf, i), BG) <= T2) {
      visited[p] = 1;
      q[qt++] = p;
    }
  }

  for (let x = 0; x < width; x++) { tryPush(x, 0); tryPush(x, height - 1); }
  for (let y = 0; y < height; y++) { tryPush(0, y); tryPush(width - 1, y); }

  while (qh < qt) {
    const p = q[qh++];
    buf[p*4 + 3] = 0; // make transparent

    const x = p % width;
    const y = (p / width) | 0;

    tryPush(x+1, y);
    tryPush(x-1, y);
    tryPush(x, y+1);
    tryPush(x, y-1);
  }
}

// Pass B: remove LARGE interior islands of background color (keep tiny ones like hair holes)
function stripLargeInteriorIslands(buf, width, height, BG, tol, minArea) {
  const T2 = tol * tol;
  const npx = width * height;
  const seen = new Uint8Array(npx);

  const stackX = new Int32Array(npx);
  const stackY = new Int32Array(npx);
  let sp = 0;

  function isBg(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const p = y * width + x;
    const i = p * 4;
    if (buf[i+3] === 0) return false; // already transparent from Pass A
    return dist2(colorAt(buf, i), BG) <= T2;
  }

  function floodComponent(startX, startY) {
    sp = 0;
    stackX[sp] = startX; stackY[sp] = startY; sp++;
    const pixels = [];

    while (sp > 0) {
      const x = stackX[--sp];
      const y = stackY[sp];
      const p = y * width + x;
      if (seen[p]) continue;
      seen[p] = 1;

      const i = p * 4;
      if (!isBg(x, y)) continue;

      pixels.push(p);

      // 4-neighbors
      if (x+1 < width)  { stackX[sp] = x+1; stackY[sp] = y;   sp++; }
      if (x-1 >= 0)     { stackX[sp] = x-1; stackY[sp] = y;   sp++; }
      if (y+1 < height) { stackX[sp] = x;   stackY[sp] = y+1; sp++; }
      if (y-1 >= 0)     { stackX[sp] = x;   stackY[sp] = y-1; sp++; }
    }

    return pixels;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (seen[p]) continue;
      if (!isBg(x, y)) { seen[p] = 1; continue; }

      const comp = floodComponent(x, y);

      // If big enough, nuke it; else keep (hair/holes)
      if (comp.length >= minArea) {
        for (const q of comp) buf[q*4 + 3] = 0;
      }
    }
  }
}

async function processOne(file) {
  const inputPath = path.join(IN_DIR, file);
  const outPath   = path.join(OUT_DIR, file);

  const img = sharp(inputPath);
  const meta = await img.metadata();
  const width = meta.width, height = meta.height;
  if (!width || !height) return;

  const buf = await img.ensureAlpha().raw().toBuffer();

  // Detect which BG we have
  const bg = detectBackground(buf, width, height);
  if (!bg) {
    console.warn(`⚠️  Could not detect background for ${file}`);
    return;
  }
  console.log(`→ ${file}: bg=${bg.name}, tol=${bg.tol}`);

  // Pass A: remove edge-connected bg
  stripByFlood(buf, width, height, bg.color, bg.tol);

  // Pass B: remove large interior islands (halo openings, etc.)
  stripLargeInteriorIslands(buf, width, height, bg.color, bg.tol, ISLAND_AREA_MIN);

  // Output
  let out = sharp(buf, { raw: { width, height, channels: 4 } });
  if (FEATHER > 0) out = out.blur(FEATHER).sharpen();
  await out.png().toFile(outPath);
  console.log(`✓ ${file}`);
}

(async () => {
  if (ONE_FILE) {
    await processOne(ONE_FILE);
  } else {
    const files = fs.readdirSync(IN_DIR).filter(f => f.toLowerCase().endsWith(".png"));
    for (const f of files) await processOne(f);
  }
  console.log(`Done → ${OUT_DIR}`);
})();

// // scripts/strip-bg-auto.cjs
// const fs = require("fs");
// const path = require("path");
// const sharp = require("sharp");

// const IN_DIR  = process.argv[2] ?? "downloads/trenchers-clean";
// const OUT_DIR = process.argv[3] ?? "downloads/trenchers-clean3";

// fs.mkdirSync(OUT_DIR, { recursive: true });

// // Define both possible background colors and tolerances
// const BG_OPTIONS = [
//   { name: "blue", color: { r: 6, g: 79, b: 198 }, tol: 0 },
//   { name: "yellow", color: { r: 255, g: 214, b: 44 }, tol: 35},
// ];

// const FEATHER = 2; // soften edges slightly

// function dist2(a, b) {
//   const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
//   return dr * dr + dg * dg + db * db;
// }

// // find the most likely background color by sampling corners
// async function detectBackground(buf, width, height) {
//   const corners = [
//     0, // top-left
//     (width - 1) * 4, // top-right
//     (width * (height - 1)) * 4, // bottom-left
//     ((width * height) - 1) * 4, // bottom-right
//   ];
//   const samples = corners.map(i => ({
//     r: buf[i],
//     g: buf[i + 1],
//     b: buf[i + 2],
//   }));
//   // Average sample
//   const avg = samples.reduce((acc, s) => ({
//     r: acc.r + s.r / samples.length,
//     g: acc.g + s.g / samples.length,
//     b: acc.b + s.b / samples.length,
//   }), { r: 0, g: 0, b: 0 });

//   // Pick nearest background option
//   let best = null, bestDist = Infinity;
//   for (const opt of BG_OPTIONS) {
//     const d = dist2(avg, opt.color);
//     if (d < bestDist) { best = opt; bestDist = d; }
//   }
//   return best;
// }

// async function processOne(file) {
//   const inputPath = path.join(IN_DIR, file);
//   const outPath   = path.join(OUT_DIR, file);

//   const img = sharp(inputPath);
//   const meta = await img.metadata();
//   const width = meta.width, height = meta.height;
//   if (!width || !height) return;

//   const buf = await img.ensureAlpha().raw().toBuffer();

//   // Detect which background color we’re dealing with
//   const bg = await detectBackground(buf, width, height);
//   if (!bg) {
//     console.warn(`⚠️  Could not detect background for ${file}`);
//     return;
//   }

//   const { color: BG, tol: TOL } = bg;
//   const T2 = TOL * TOL;

//   console.log(`→ ${file}: detected ${bg.name} background`);

//   // Remove matching pixels
//   for (let i = 0; i < buf.length; i += 4) {
//     const r = buf[i], g = buf[i + 1], b = buf[i + 2];
//     const d2 = (r - BG.r) ** 2 + (g - BG.g) ** 2 + (b - BG.b) ** 2;
//     if (d2 <= T2) buf[i + 3] = 0;
//   }

//   let out = sharp(buf, { raw: { width, height, channels: 4 } });
//   if (FEATHER > 0) out = out.blur(FEATHER).sharpen();

//   await out.png().toFile(outPath);
//   console.log(`✓  ${file}`);
// }

// (async () => {
//   const singleFile = process.argv[4]; // optional
//   if (singleFile) {
//     await processOne(singleFile);
//   } else {
//     const files = fs.readdirSync(IN_DIR).filter(f => f.toLowerCase().endsWith(".png"));
//     for (const f of files) await processOne(f);
//   }
//   console.log(`Done → ${OUT_DIR}`);
// })();