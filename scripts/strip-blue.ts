import fs from "fs";
import path from "path";
import sharp from "sharp";

const IN_DIR  = process.argv[2] ?? "glyders-raw";
const OUT_DIR = process.argv[3] ?? "glyders-clean";

// target blue and tolerance
const BLUE = { r: 3, g: 71, b: 175 }; // #0B51C8  <-- adjust if yours differs
const TOL  = 24;                        // 0–255; raise if some blue remains
const FEATHER = 1;                      // 0–2px soft edge anti-halo

fs.mkdirSync(OUT_DIR, { recursive: true });

function dist2(r:number,g:number,b:number) {
  const dr = r - BLUE.r, dg = g - BLUE.g, db = b - BLUE.b;
  return dr*dr + dg*dg + db*db;
}
const T2 = TOL * TOL;

async function processOne(file: string) {
  const inputPath = path.join(IN_DIR, file);
  const outPath   = path.join(OUT_DIR, file);

  const img = sharp(inputPath);
  const { width, height } = await img.metadata();
  if (!width || !height) return;

  // Work in RGBA
  const buf = await img.ensureAlpha().raw().toBuffer();
  // buf = [r,g,b,a, r,g,b,a, ...]
  for (let i = 0; i < buf.length; i += 4) {
    const r = buf[i], g = buf[i+1], b = buf[i+2];
    if (dist2(r,g,b) <= T2) {
      // make fully transparent
      buf[i+3] = 0;
    }
  }

  let out = sharp(buf, { raw: { width, height, channels: 4 } });

  // light feather on the transparency edge to avoid dark outline
  if (FEATHER > 0) {
    out = out.blur(FEATHER).sharpen(); // mild soften/restore
  }

  await out.png().toFile(outPath);
  console.log("✓", file);
}

(async () => {
  const files = fs.readdirSync(IN_DIR).filter(f => f.toLowerCase().endsWith(".png"));
  for (const f of files) {
    await processOne(f);
  }
  console.log(`Done → ${OUT_DIR}`);
})();