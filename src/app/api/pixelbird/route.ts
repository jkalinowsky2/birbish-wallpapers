import { NextResponse } from "next/server";

// Optional: avoid dev caching and force Node runtime
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Very small SVG scrubber:
 * - Fetches token SVG from upstream (raw GitHub)
 * - Removes either the 1st or 2nd element after <svg> (configurable per token)
 * - Fallback: remove the first <rect> if needed
 * - Ensures width/height from viewBox
 */

const UPSTREAM_SVG = (id: string) =>
  `https://raw.githubusercontent.com/proofxyz/moonbirds-assets/main/collection/svg/${id}.svg`;

// Tokens where the background is the *second* element after <svg>
const SPECIAL_REMOVE_THIRD_LINE = new Set<number>([
  2080, 2941, 3904, 5249, 8398, 8959,
]);

// Remove the Nth (1-based) element immediately after the opening <svg ...> tag.
// Skips whitespace and <!-- comments --> between elements.
// Treats an "element" as a single tag (opening or self-closed). This is sufficient
// for the background tag we need to strip.
function removeNthElementAfterSvg(
  src: string,
  n: number
): { out: string; removed?: string } {
  if (n < 1) return { out: src };

  const svgOpen = src.search(/<svg\b/i);
  if (svgOpen === -1) return { out: src };

  const svgTagEnd = src.indexOf(">", svgOpen);
  if (svgTagEnd === -1) return { out: src };

  let i = svgTagEnd + 1;

  // helper: skip whitespace and a single leading comment
  const skipSpaceAndComment = () => {
    while (i < src.length && /\s/.test(src[i])) i++;
    if (src.slice(i, i + 4) === "<!--") {
      const ce = src.indexOf("-->", i + 4);
      if (ce !== -1) {
        i = ce + 3;
        while (i < src.length && /\s/.test(src[i])) i++;
      }
    }
  };

  skipSpaceAndComment();

  // walk forward, skipping (n-1) elements, then remove the next one
  let skipped = 0;
  while (i < src.length) {
    if (src[i] !== "<") {
      i++;
      continue;
    }
    // we are at the start of an element tag
    // find the end of this tag (single tag only, good enough for bg element)
    let j = i;
    while (j < src.length && src[j] !== ">") j++;
    if (j >= src.length) break;
    j++; // include '>'

    if (skipped < n - 1) {
      // skip this element and move to the next visible token
      i = j;
      skipSpaceAndComment();
      skipped++;
      continue;
    }

    // This is the Nth element → remove it
    const removed = src.slice(i, j);
    const out = src.slice(0, i) + src.slice(j);
    return { out, removed };
  }

  // If we couldn't find that many elements, return unchanged
  return { out: src };
}

export async function GET(req: Request) {
  console.log("[api/pixel] hit:", req.url);
  const { searchParams } = new URL(req.url);
  const id = (searchParams.get("id") || "").trim();
  console.log("[api/pixel] request id:", id);

  const n = parseInt(id, 10);
  if (!Number.isFinite(n) || n < 1 || n > 10000) {
    console.log("[api/pixel] bad id");
    return new NextResponse("Bad token id", { status: 400 });
  }

  const upstream = UPSTREAM_SVG(id);
  console.log("[api/pixel] fetching upstream:", upstream);

  const res = await fetch(upstream, { cache: "no-store" }).catch((e) => {
    console.error("[api/pixel] upstream fetch threw:", e);
    return null as unknown as Response;
  });

  if (!res || !res.ok) {
    console.error("[api/pixel] upstream error status:", res?.status);
    return new NextResponse("Upstream error", { status: 502 });
  }

  let svg = await res.text();

  // Normalize newlines
  svg = svg.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Choose which element to remove:
  // - Default: remove the 1st element after <svg>
  // - SPECIAL IDs: remove the 2nd element after <svg>
  const nth = SPECIAL_REMOVE_THIRD_LINE.has(n) ? 2 : 1;

  const { out: strippedOnce, removed } = removeNthElementAfterSvg(svg, nth);
  svg = strippedOnce;

  // Fallback: if nothing meaningful got removed, also try removing the first <rect>
  if (!removed || !/<(rect|path|g)\b/i.test(removed)) {
    // Type the callback params to satisfy TS implicit-any rule
    svg = svg.replace(
      /<rect\b[^>]*>(?:\s*<\/rect>)?|<rect\b[^>]*\/>/i,
      (_m: string): string => ""
    );
  }

  // Ensure <svg> has explicit width/height from viewBox (helps image decoding)
  const vb = svg.match(
    /viewBox\s*=\s*["']\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s*["']/i
  );
  if (vb) {
    const vbW = parseFloat(vb[3]);
    const vbH = parseFloat(vb[4]);
    if (!/\bwidth\s*=/.test(svg) || !/\bheight\s*=/.test(svg)) {
      svg = svg.replace(
        /<svg\b([^>]*)>/i,
        (_m: string, attrs: string): string =>
          `<svg${attrs} width="${vbW}" height="${vbH}">`
      );
    }
  }

  console.log(
    "[api/pixel] removed element (nth=%d): %s",
    nth,
    removed ? removed.slice(0, 120) : "(none)"
  );

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// import { NextResponse } from "next/server";

// /**
//  * Very small SVG scrubber:
//  * - Fetches token SVG from upstream
//  * - Removes any <rect> that covers the full viewBox (background)
//  * - Returns cleaned SVG with CORS
//  *
//  * Adjust `UPSTREAM_SVG` to your pixel-bird SVG source.
//  */
// // src/app/api/pixel/route.ts
// const UPSTREAM_SVG = (id: string) =>
//   `https://raw.githubusercontent.com/proofxyz/moonbirds-assets/main/collection/svg/${id}.svg`;


// export async function GET(req: Request) {
//   console.log("[api/pixel] hit:", req.url);
//   const { searchParams } = new URL(req.url);
//   const id = (searchParams.get("id") || "").trim();
//   console.log("[api/pixel] request id:", id);

//   const n = parseInt(id, 10);
//   if (!Number.isFinite(n) || n < 1 || n > 10000) {
//     console.log("[api/pixel] bad id");
//     return new NextResponse("Bad token id", { status: 400 });
//   }

//   const upstream = `https://raw.githubusercontent.com/proofxyz/moonbirds-assets/main/collection/svg/${id}.svg`;
//   console.log("[api/pixel] fetching upstream:", upstream);

//   const res = await fetch(upstream, { cache: "no-store" }).catch((e) => {
//     console.error("[api/pixel] upstream fetch threw:", e);
//     return null;
//   });

//   if (!res || !res.ok) {
//     console.error("[api/pixel] upstream error status:", res?.status);
//     return new NextResponse("Upstream error", { status: 502 });
//   }

//   let svg = await res.text();
// // Normalize newlines
// svg = svg.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

// // Remove the first element immediately after the opening <svg ...> tag.
// // This handles multi-line tags and any tag name (<rect>, <path>, <g>, etc.),
// // skipping whitespace and comments.
// function removeFirstElementAfterSvg(src: string): { out: string; removed?: string } {
//   // find "<svg"
//   const svgOpen = src.search(/<svg\b/i);
//   if (svgOpen === -1) return { out: src };

//   // find end of opening <svg ...>
//   const svgTagEnd = src.indexOf(">", svgOpen);
//   if (svgTagEnd === -1) return { out: src };

//   // cursor after <svg>
//   let i = svgTagEnd + 1;

//   // skip whitespace
//   while (i < src.length && /\s/.test(src[i])) i++;

//   // skip comments <!-- ... -->
//   if (src.slice(i).startsWith("<!--")) {
//     const commentEnd = src.indexOf("-->", i + 4);
//     if (commentEnd !== -1) {
//       i = commentEnd + 3;
//       while (i < src.length && /\s/.test(src[i])) i++;
//     }
//   }

//   // if next char isn't a '<', nothing to do
//   if (src[i] !== "<") return { out: src };

//   // remove the first full element "<...>" (handles multi-line, self-closed or not)
//   const start = i;
//   // find the closing '>' of this element (not perfect XML parsing, but OK for flat bg element)
//   let depth = 0;
//   let j = start;
//   while (j < src.length) {
//     const ch = src[j];
//     if (ch === "<") depth++;
//     if (ch === ">") {
//       // stop at first '>' after start for single-tag backgrounds
//       j++;
//       break;
//     }
//     j++;
//   }
//   const removed = src.slice(start, j);
//   const out = src.slice(0, start) + src.slice(j);
//   return { out, removed };
// }

// const { out: strippedOnce, removed } = removeFirstElementAfterSvg(svg);
// svg = strippedOnce;

// // Fallback: if we didn't remove anything useful, also try removing the first <rect> we see.
// if (!removed || !/<(rect|path|g)\b/i.test(removed)) {
//   svg = svg.replace(/<rect\b[^>]*>(?:\s*<\/rect>)?|<rect\b[^>]*\/>/i, "");
// }

// // Ensure <svg> has explicit width/height from viewBox (helps image decoding)
// const vb = svg.match(/viewBox\s*=\s*["']\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s*["']/i);
// if (vb) {
//   const vbW = parseFloat(vb[3]);
//   const vbH = parseFloat(vb[4]);
//   if (!/\bwidth\s*=/.test(svg) || !/\bheight\s*=/.test(svg)) {
//     svg = svg.replace(/<svg\b([^>]*)>/i, (_m, attrs) => `<svg${attrs} width="${vbW}" height="${vbH}">`);
//   }
// }

// // Debug (optional): log what we removed
// console.log("[api/pixelbird] removed element:", removed?.slice(0, 200));
//   return new NextResponse(svg, {
//     headers: {
//       "Content-Type": "image/svg+xml; charset=utf-8",
//       "Access-Control-Allow-Origin": "*",
//     },
//   });
// }