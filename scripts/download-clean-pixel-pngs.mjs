// scripts/download-clean-pixel-pngs.mjs
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import sharp from "sharp";

// ------------------------
// Config
// ------------------------

// Token range
const START_ID = 0;
const END_ID = 9999;

// Where PNGs will be written
const OUT_DIR = path.resolve("downloads/pixel_clean/png");

// How many to do at once
const CONCURRENCY = 8;

// Retry each fetch this many times
const RETRIES = 3;

// Export scale. Base SVGs are ~336×336; use an integer to keep pixels crisp.
const SCALE = 3; // e.g. 1 (=336px), 2 (=672px), 3 (=1008px), 4 (=1344px), etc.

// These token IDs have the background on *line 3* instead of line 2
const LINE3_IDS = new Set([2080, 2941, 3904, 5249, 8398, 8959]);

// Upstream URL builder
// const upstreamUrl = (id) =>
//   `https://raw.githubusercontent.com/proofxyz/moonbirds-assets/main/collection/svg/${id}.svg`;

// ------------------------
// Helpers
// ------------------------

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

function normalizeNewlines(s) {
  return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Remove the background line (line 2 for most tokens; line 3 for the special cases).
 */
function stripBackgroundByLine(svgText, id) {
  const lines = normalizeNewlines(svgText).split("\n");
  const idx = LINE3_IDS.has(id) ? 2 : 1; // 0-based

  if (lines.length <= idx) {
    console.warn(`[warn] #${id}: SVG has only ${lines.length} line(s); cannot remove line ${idx + 1}`);
    return lines.join("\n");
  }

  const removed = lines.splice(idx, 1)[0];
  if (!/^(<rect|<g|<path|<polygon|<circle)/i.test(removed?.trim() ?? "")) {
    console.warn(
      `[note] #${id}: removed line ${idx + 1} doesn't look like a typical bg element:`,
      removed?.slice(0, 100)
    );
  }

  return lines.join("\n");
}

/**
 * Parse intrinsic width/height from <svg>. Fall back to viewBox.
 */
function parseSvgSize(svg) {
  const widthMatch = svg.match(/\bwidth\s*=\s*["']\s*([\d.]+)\s*["']/i);
  const heightMatch = svg.match(/\bheight\s*=\s*["']\s*([\d.]+)\s*["']/i);
  if (widthMatch && heightMatch) {
    return { w: parseFloat(widthMatch[1]), h: parseFloat(heightMatch[1]) };
  }
  const vbMatch = svg.match(
    /viewBox\s*=\s*["']\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s*["']/i
  );
  if (vbMatch) {
    return { w: parseFloat(vbMatch[3]), h: parseFloat(vbMatch[4]) };
  }
  // Fallback to the common pixel-bird size
  return { w: 336, h: 336 };
}

async function fetchWithRetry(url, tries = RETRIES) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === tries) throw err;
      await sleep(300 * attempt); // simple backoff
    }
  }
}

/**
 * Download + clean + rasterize a single token
 */
async function processOne(id) {
  const outFile = path.join(OUT_DIR, `${id}.png`);

  // Skip if already exists (resume-friendly)
  try {
    await fs.promises.access(outFile, fs.constants.F_OK);
    return { id, skipped: true };
  } catch {
    // continue
  }

  const url = upstreamUrl(id);
  const rawSvg = await fetchWithRetry(url);
  const cleanedSvg = stripBackgroundByLine(rawSvg, id);

  // Figure output size (integer scale to keep pixel edges crisp)
  const { w, h } = parseSvgSize(cleanedSvg);
  const outW = Math.max(1, Math.round(w * SCALE));
  const outH = Math.max(1, Math.round(h * SCALE));

  // Rasterize with nearest-neighbor
  const pngBuffer = await sharp(Buffer.from(cleanedSvg))
    .resize(outW, outH, { kernel: "nearest" })
    .png() // preserves transparency by default
    .toBuffer();

  await fs.promises.writeFile(outFile, pngBuffer);
  return { id, skipped: false, outW, outH };
}

/**
 * Simple concurrency pool
 */
async function runAll() {
  await ensureDir(OUT_DIR);

  const ids = [];
  for (let i = START_ID; i <= END_ID; i++) ids.push(i);

  let inFlight = 0;
  let index = 0;
  let completed = 0;
  let failures = 0;

  return new Promise((resolve) => {
    const results = [];
    const tick = async () => {
      if (index >= ids.length && inFlight === 0) {
        console.log(
          `\nDone. ${completed} processed, ${failures} failed. PNGs → ${OUT_DIR} (scale=${SCALE}x)`
        );
        resolve(results);
        return;
      }
      while (inFlight < CONCURRENCY && index < ids.length) {
        const id = ids[index++];
        inFlight++;
        processOne(id)
          .then((r) => {
            completed++;
            if (completed % 100 === 0) {
              console.log(
                `[progress] ${completed}/${ids.length} (latest #${id}${r.skipped ? " skipped" : ""})`
              );
            }
            results.push(r);
          })
          .catch((err) => {
            failures++;
            console.error(`[error] #${id}:`, err?.message || err);
          })
          .finally(() => {
            inFlight--;
            tick();
          });
      }
    };
    tick();
  });
}

// ------------------------
// Go!
// ------------------------
runAll().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});