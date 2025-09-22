// scripts/download-clean-pixel-svgs.mjs
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

// ------------------------
// Config
// ------------------------
const START_ID = 1;
const END_ID = 10;
const OUT_DIR = path.resolve("downloads/pixel_clean/svg");
const CONCURRENCY = 10; // how many parallel downloads
const RETRIES = 3;

// IDs where the background is on *line 3* instead of line 2
const LINE3_IDS = new Set([2080, 2941, 3904, 5249, 8398, 8959]);

// Upstream URL builder
const upstreamUrl = (id) =>
  `https://raw.githubusercontent.com/proofxyz/moonbirds-assets/main/collection/svg/${id}.svg`;

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
 * Remove the background line (line 2 for most tokens; line 3 for special cases).
 * - We *only* remove that one line, per your working approach.
 * - If the file has fewer lines than expected, we no-op (and log).
 */
function stripBackgroundByLine(svgText, id) {
  const lines = normalizeNewlines(svgText).split("\n");

  // Decide which line index to remove (0-based)
  // Line 1 => index 1, Line 3 => index 2
  const lineIndexToRemove = LINE3_IDS.has(id) ? 2 : 1;

  if (lines.length <= lineIndexToRemove) {
    console.warn(`[warn] #${id}: SVG has only ${lines.length} line(s); cannot remove line ${lineIndexToRemove + 1}`);
    return lines.join("\n");
  }

  const removed = lines.splice(lineIndexToRemove, 1)[0];

  // Optional: sanity log when the removed line looks nothing like a background
  if (!/^(<rect|<g|<path|<polygon|<circle)/i.test(removed?.trim() ?? "")) {
    console.warn(`[note] #${id}: removed line ${lineIndexToRemove + 1} doesn't look like a typical bg element:`, removed?.slice(0, 80));
  }

  return lines.join("\n");
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
 * Download + clean a single token SVG
 */
async function processOne(id) {
  const outFile = path.join(OUT_DIR, `${id}.svg`);

  // Skip if already exists (resume-friendly)
  try {
    await fs.promises.access(outFile, fs.constants.F_OK);
    return { id, skipped: true };
  } catch {
    // continue
  }

  const url = upstreamUrl(id);
  const raw = await fetchWithRetry(url);
  const cleaned = stripBackgroundByLine(raw, id);

  await fs.promises.writeFile(outFile, cleaned, "utf8");
  return { id, skipped: false };
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
        console.log(`\nDone. ${completed} cleaned, ${failures} failed. Output → ${OUT_DIR}`);
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
              console.log(`[progress] ${completed}/${ids.length} (latest #${id}${r.skipped ? " skipped" : ""})`);
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