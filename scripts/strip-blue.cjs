// scripts/strip-blue.cjs
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const IN_DIR  = process.argv[2] ?? "downloads/trenchers-clean";
const OUT_DIR = process.argv[3] ?? "downloads/trenchers-clean2";

// target blue and tolerance
const BLUE = { r: 6, g: 79, b: 198 }; // #0347AF — adjust if needed
//const BLUE = { r: 255, g: 214, b: 44 }; // #0347AF — adjust if needed
const TOL  = 35;                      // 0–255; raise if some blue remains
const FEATHER = 2;                    // 0–2px soft edge anti-halo

fs.mkdirSync(OUT_DIR, { recursive: true });

function dist2(r,g,b) {
  const dr = r - BLUE.r, dg = g - BLUE.g, db = b - BLUE.b;
  return dr*dr + dg*dg + db*db;
}
const T2 = TOL * TOL;

async function processOne(file) {
  const inputPath = path.join(IN_DIR, file);
  const outPath   = path.join(OUT_DIR, file);

  const img = sharp(inputPath);
  const meta = await img.metadata();
  const width = meta.width, height = meta.height;
  if (!width || !height) return;

  const buf = await img.ensureAlpha().raw().toBuffer();
  for (let i = 0; i < buf.length; i += 4) {
    const r = buf[i], g = buf[i+1], b = buf[i+2];
    if (dist2(r,g,b) <= T2) buf[i+3] = 0;
  }

  let out = sharp(buf, { raw: { width, height, channels: 4 } });
  if (FEATHER > 0) out = out.blur(FEATHER).sharpen();

  await out.png().toFile(outPath);
  console.log("✓", file);
}

// (async () => {
//   const files = fs.readdirSync(IN_DIR).filter(f => f.toLowerCase().endsWith(".png"));
//   for (const f of files) await processOne(f);
//   console.log(`Done → ${OUT_DIR}`);
// })();

(async () => {
  // const files = fs.readdirSync(IN_DIR).filter(f => f.toLowerCase().endsWith(".png"));
  // for (const f of files) await processOne(f);
  // console.log(`Done → ${OUT_DIR}`);

  await processOne("1066.png"); // 👈 just run one file
})();