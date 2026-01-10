// scripts/download-moonbirds.mjs
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// ---- Config ----
// const BASE = "https://collection-assets.proof.xyz/moonbirds/images_no_bg";

// ---- Config pixel with background ----
// const CONTRACT = "0x23581767a106ae21c074b2276d25e5c3e136a68b";
// const BASE = `https://proof-nft-image.imgix.net/${CONTRACT}`;


// const OUT_DIR = path.resolve("downloads/moonbirds");
// https://proof-nft-image.imgix.net/0x23581767a106ae21c074b2276D25e5C3e136a68b/7208
// const BASE = "https://www.trenchersonape.com/Trenchers_nfts";
// ✅ NEW PNG base
const BASE = "https://collection-assets.proof.xyz/moonbirds/images";

const OUT_DIR = path.resolve("downloads/moonbirds-ill");
const START_ID = 0;
const END_ID = 9999;
const CONCURRENCY = 8;
const RETRIES = 3;
const RETRY_BACKOFF_MS = 750;

const SCALE = .25;        // ✅ no scaling
const TARGET_PX = 1200; // or 900 for web


// what we request + what we save
const IMGIX_PARAMS = "fm=png";
const OUTPUT_EXT = "png";

// ---- Helpers ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

// async function downloadOne(id) {

//   // const url = `${BASE}/${id}?${IMGIX_PARAMS}`;
//   const url = `https://www.proof.xyz/api/moonbirds/${id}/image?backgroundId=0`;
//   const outPath = path.join(OUT_DIR, `${id}.${OUTPUT_EXT}`);

//   // skip if already exists
//   try {
//     await fs.access(outPath);
//     console.log(`[skip] ${id} (already downloaded)`);
//     return;
//   } catch { }

//   for (let attempt = 1; attempt <= RETRIES; attempt++) {
//     try {
//       const res = await fetch(url, { cache: "no-store" });

//       if (res.status === 404) {
//         console.warn(`[404 ] ${id} not found`);
//         return;
//       }
//       if (!res.ok) {
//         throw new Error(`HTTP ${res.status} ${res.statusText}`);
//       }

//       const inputBuf = Buffer.from(await res.arrayBuffer());

//       // If no scaling requested, just save directly
//       if (!SCALE || SCALE === 1) {
//         await fs.writeFile(outPath, inputBuf);
//         console.log(`[ok  ] ${id} saved (${(inputBuf.length / 1024).toFixed(1)} KB)`);
//         return;
//       }

//       // Pixel-perfect upscale: nearest neighbor
//       const image = sharp(inputBuf, { limitInputPixels: false });
//       const meta = await image.metadata();

//       if (!meta.width || !meta.height) {
//         throw new Error("Could not read image metadata (width/height missing)");
//       }

//       const outBuf = await image
//         .resize(meta.width * SCALE, meta.height * SCALE, { kernel: "nearest" })
//         .png()
//         .toBuffer();

//       await fs.writeFile(outPath, outBuf);
//       console.log(
//         `[ok  ] ${id} saved (${(outBuf.length / 1024).toFixed(1)} KB) scaled ${SCALE}x`
//       );
//       return;
//     } catch (err) {
//       console.warn(`[err ] ${id} attempt ${attempt}/${RETRIES}: ${err}`);
//       if (attempt < RETRIES) {
//         await sleep(RETRY_BACKOFF_MS * attempt);
//       } else {
//         console.error(`[fail] ${id} giving up`);
//       }
//     }
//   }
// }

// simple concurrency pool

//DOWNLOAD PIXEL ART AND SCALE
// async function downloadOne(id) {
//   const url = `https://raw.githubusercontent.com/proofxyz/moonbirds-assets/main/collection/svg/${id}.svg`;
//   const outPath = path.join(OUT_DIR, `${id}.png`);

//   // Skip if already exists
//   try {
//     await fs.access(outPath);
//     console.log(`[skip] ${id} (already downloaded)`);
//     return;
//   } catch {}

//   for (let attempt = 1; attempt <= RETRIES; attempt++) {
//     try {
//       const res = await fetch(url, { cache: "no-store" });

//       if (res.status === 404) {
//         console.warn(`[404 ] ${id} not found`);
//         return;
//       }
//       if (!res.ok) {
//         throw new Error(`HTTP ${res.status} ${res.statusText}`);
//       }

//       // ✅ THIS is the missing piece
//       const svgBuf = Buffer.from(await res.arrayBuffer());

//       const SCALE = 4; // 1, 2, 4, 8, 16 — always integer
//       const pngBuf = await svgToPixelPerfectPng(svgBuf, SCALE);

//       await fs.writeFile(outPath, pngBuf);
//       console.log(
//         `[ok  ] ${id} saved (${(pngBuf.length / 1024).toFixed(1)} KB, x${SCALE})`
//       );
//       return;
//     } catch (err) {
//       console.warn(`[err ] ${id} attempt ${attempt}/${RETRIES}: ${err}`);
//       if (attempt < RETRIES) {
//         await sleep(RETRY_BACKOFF_MS * attempt);
//       } else {
//         console.error(`[fail] ${id} giving up`);
//       }
//     }
//   }
// }

//DOWNLOAD ILLUSTRATED ART
async function downloadOne(id) {
  // OLD SVG (keep for reference)
  // const url = `https://raw.githubusercontent.com/proofxyz/moonbirds-assets/main/collection/svg/${id}.svg`;

  // ✅ NEW PNG endpoint
  const url = `${BASE}/${id}.png`;
  const outPath = path.join(OUT_DIR, `${id}.${OUTPUT_EXT}`);

  // skip if already exists
  try {
    await fs.access(outPath);
    console.log(`[skip] ${id} (already downloaded)`);
    return;
  } catch { }

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

      const ct = (res.headers.get("content-type") || "").toLowerCase();
      const buf = Buffer.from(await res.arrayBuffer());

      // sanity check (helps catch HTML/error responses)
      if (!ct.startsWith("image/")) {
        throw new Error(`Non-image response (${ct || "no content-type"}) from ${url}`);
      }

      // // ✅ SCALE=1: save directly (no sharp)
      // await fs.writeFile(outPath, buf);

      // console.log(
      //   `[ok  ] ${id} saved (${ct}, ${(buf.length / 1024).toFixed(1)} KB)`
      // );

      // ✅ Resize to a fixed output size (illustrated art friendly)
      const outBuf = await sharp(buf, { limitInputPixels: false })
        .resize(TARGET_PX, TARGET_PX, {
          fit: "contain",
          kernel: "lanczos3",
          withoutEnlargement: false, // set true if you only want to downscale
        })
        .png()
        .toBuffer();

      await fs.writeFile(outPath, outBuf);

      console.log(
        `[ok  ] ${id} saved (${ct} -> png, ${(outBuf.length / 1024).toFixed(1)} KB) @ ${TARGET_PX}px`
      );
      return;
    } catch (err) {
      console.warn(`[err ] ${id} attempt ${attempt}/${RETRIES}: ${err}`);
      if (attempt < RETRIES) await sleep(RETRY_BACKOFF_MS * attempt);
      else console.error(`[fail] ${id} giving up`);
    }
  }
}

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


async function fetchImageBuffer(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      // encourage image responses
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
    },
    cache: "no-store",
  });

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const buf = Buffer.from(await res.arrayBuffer());

  // If it's already an image, done
  if (contentType.startsWith("image/")) {
    return { buf, contentType, finalUrl: res.url };
  }

  // If it's HTML, try to pull out the real image URL from <img src="...">
  if (contentType.includes("text/html")) {
    const html = buf.toString("utf8");

    // very simple parse: first img src
    const m = html.match(/<img[^>]+src="([^"]+)"/i);
    if (!m?.[1]) {
      throw new Error(`Got HTML (no <img src>) from ${res.url}`);
    }

    const imgUrl = m[1].startsWith("http") ? m[1] : new URL(m[1], res.url).toString();
    const res2 = await fetch(imgUrl, {
      redirect: "follow",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
      },
      cache: "no-store",
    });

    const ct2 = (res2.headers.get("content-type") || "").toLowerCase();
    const buf2 = Buffer.from(await res2.arrayBuffer());

    if (!ct2.startsWith("image/")) {
      throw new Error(`Expected image from extracted src, got ${ct2} (${imgUrl})`);
    }

    return { buf: buf2, contentType: ct2, finalUrl: imgUrl };
  }

  // Something else (json, text, etc.)
  throw new Error(`Non-image response: ${contentType} from ${res.url}`);
}

async function svgToPixelPerfectPng(svgBuf, scale) {
  // 1) Render once (base raster)
  const base = sharp(svgBuf, { density: 72 });
  const meta = await base.metadata();

  // Sometimes width/height aren't present in metadata on the first pass.
  // In that case, render to PNG once and re-open to get dimensions.
  let w = meta.width;
  let h = meta.height;

  let basePngBuf;
  if (!w || !h) {
    basePngBuf = await base.png().toBuffer();
    const meta2 = await sharp(basePngBuf).metadata();
    w = meta2.width;
    h = meta2.height;
    if (!w || !h) throw new Error("Could not determine SVG raster dimensions");
  } else {
    basePngBuf = await base.png().toBuffer();
  }

  // 2) Pixel-perfect integer upscale (nearest)
  if (!scale || scale === 1) return basePngBuf;

  return sharp(basePngBuf)
    .resize(w * scale, h * scale, { kernel: "nearest" })
    .png()
    .toBuffer();
}