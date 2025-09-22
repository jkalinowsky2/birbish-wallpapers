// scripts/download-moonbirds.mjs
import fs from "node:fs/promises";
import path from "node:path";

// ---- Config ----
const BASE = "https://collection-assets.proof.xyz/moonbirds/images_no_bg";
const OUT_DIR = path.resolve("downloads/moonbirds"); // change if you like
const START_ID = 0;         // Moonbirds are usually 1..10000. If you truly need 0..9999, change these.
const END_ID   = 9999;     // inclusive
const CONCURRENCY = 8;      // be nice to the server
const RETRIES = 3;
const RETRY_BACKOFF_MS = 750;

// ---- Helpers ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function downloadOne(id) {
  const url = `${BASE}/${id}.png`;
  const outPath = path.join(OUT_DIR, `${id}.png`);

  // skip if already exists
  try {
    await fs.access(outPath);
    console.log(`[skip] ${id} (already downloaded)`);
    return;
  } catch {}

  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.status === 404) {
        console.warn(`[404 ] ${id} not found`);
        return;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(outPath, buf);
      console.log(`[ok  ] ${id} saved (${(buf.length / 1024).toFixed(1)} KB)`);
      return;
    } catch (err) {
      console.warn(`[err ] ${id} attempt ${attempt}/${RETRIES}: ${err}`);
      if (attempt < RETRIES) {
        await sleep(RETRY_BACKOFF_MS * attempt);
      } else {
        console.error(`[fail] ${id} giving up`);
      }
    }
  }
}

// simple concurrency pool
async function runPool(ids) {
  let i = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (i < ids.length) {
      const id = ids[i++];
      await downloadOne(id);
      // tiny courteous delay between downloads
      await sleep(100);
    }
  });
  await Promise.all(workers);
}

async function main() {
  await ensureDir(OUT_DIR);
  const ids = Array.from({ length: END_ID - START_ID + 1 }, (_, k) => START_ID + k);
  console.log(`Downloading ${ids.length} images to: ${OUT_DIR}`);
  await runPool(ids);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});