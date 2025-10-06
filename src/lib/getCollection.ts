// src/lib/getCollection.ts
import type { CollectionMeta, CollectionConfig } from "@/types/collections";

import {
  MOONBIRDS_PIXEL_BASE,
  MOONBIRDS_ILLU_BASE,
  MOONBIRDS_ODDITY_BASE,
  GLYDERS_PIXEL_BASE,
  GLYDERS_ILLU_BASE,
  ILLU_PROXY, // optional fallback for legacy cases
} from "@/lib/assets";

// --- Known collections ---
export const KNOWN_COLLECTIONS = ["moonbirds", "glyders"] as const;
export type CollectionId = (typeof KNOWN_COLLECTIONS)[number];

export function isKnownCollection(x: string): x is CollectionId {
  return (KNOWN_COLLECTIONS as readonly string[]).includes(x);
}

// --- Static JSON imports so Next can bundle them ---
import moonbirdsMetaJson from "@/collections/moonbirds/meta.json";
import moonbirdsConfigJson from "@/collections/moonbirds/config.json";
import glydersMetaJson from "@/collections/glyders/meta.json";
import glydersConfigJson from "@/collections/glyders/config.json";

// --- Raw JSON shapes (looser than runtime types) ---
type RawBaseLayer = { id: string; label: string; src: string };
type RawDevice = { id: string; w: number; h: number; name: string };
type RawBackground = RawBaseLayer & { mode?: "tile" | "image" };
type RawText = RawBaseLayer & {
  maxWidthRatio?: number;
  maxHeightRatio?: number;
  allowUpscale?: boolean;
};

type RawConfigJson = {
  devices: RawDevice[];
  backgrounds: RawBackground[];
  texts: RawText[];
  birds?: RawBaseLayer[];
  headwear?: RawBaseLayer[];
};

// --- Meta/config registry ---
const META: Record<CollectionId, CollectionMeta> = {
  moonbirds: moonbirdsMetaJson as CollectionMeta,
  glyders: glydersMetaJson as CollectionMeta,
};

const RAW_CONFIG: Record<CollectionId, RawConfigJson> = {
  moonbirds: moonbirdsConfigJson as RawConfigJson,
  glyders: glydersConfigJson as RawConfigJson,
};

// --- Normalize JSON -> runtime config ---
function toCollectionConfig(id: CollectionId, raw: RawConfigJson): CollectionConfig {
  const isMoon = id === "moonbirds";
  const isGlyd = id === "glyders";

  return {
    devices: raw.devices.map((d) => ({
      id: String(d.id),
      w: Number(d.w),
      h: Number(d.h),
      name: String(d.name),
    })),

    backgrounds: raw.backgrounds.map((b) => ({
      id: String(b.id),
      label: String(b.label),
      src: String(b.src),
      mode: b.mode ?? "tile",
    })),

    texts: raw.texts.map((t) => ({
      id: String(t.id),
      label: String(t.label),
      src: String(t.src),
      ...(typeof t.maxWidthRatio === "number" ? { maxWidthRatio: t.maxWidthRatio } : {}),
      ...(typeof t.maxHeightRatio === "number" ? { maxHeightRatio: t.maxHeightRatio } : {}),
      ...(typeof t.allowUpscale === "boolean" ? { allowUpscale: t.allowUpscale } : {}),
    })),

    birds: raw.birds?.map((b) => ({ id: String(b.id), label: String(b.label), src: String(b.src) })) ?? [],
    headwear: raw.headwear?.map((h) => ({ id: String(h.id), label: String(h.label), src: String(h.src) })) ?? [],

    // --- Asset base & scale setup ---
    assetBases: {
      pixelBase: isMoon ? MOONBIRDS_PIXEL_BASE : isGlyd ? GLYDERS_PIXEL_BASE : undefined,
      illustratedBase: isMoon ? MOONBIRDS_ILLU_BASE : isGlyd ? GLYDERS_ILLU_BASE : undefined,
      oddityBase: isMoon ? MOONBIRDS_ODDITY_BASE : undefined,
      illustratedProxy: isMoon ? ILLU_PROXY : undefined,

      // Scaling factors (per style)
      ...(isMoon
        ? {
          pixelTokenScale: 1.2,         // Moonbirds pixel — slightly larger
          illustratedTokenScale: 0.45,  // Moonbirds illustrated — smaller scale
          oddityTokenScale: 0.8,        // Moonbirds oddity — medium
        }
        : {
          // Glyders
          pixelTokenScale: 1.0,         // Glyders pixel — standard
          illustratedTokenScale: 1.0,   // Glyders illustrated — already fits
        }),
    },
  };
}

// --- Public loader ---
export async function loadCollection(
  id: CollectionId
): Promise<{ meta: CollectionMeta; config: CollectionConfig }> {
  const meta = META[id];
  const raw = RAW_CONFIG[id];
  if (!meta || !raw) throw new Error(`Missing meta/config for collection "${id}"`);
  const config = toCollectionConfig(id, raw);
  return { meta, config };
}

// // src/lib/getCollection.ts
// //import { PIXEL_BASE, ODDITY_BASE, ILLU_PROXY, GLYDERS_PIXEL_BASE, GLYDERS_ILLU_BASE } from "@/lib/assets"; import type { CollectionMeta, CollectionConfig } from "@/types/collections";

// import {
//   MOONBIRDS_PIXEL_BASE,
//   MOONBIRDS_ILLU_BASE,
//   MOONBIRDS_ODDITY_BASE,
//   GLYDERS_PIXEL_BASE,
//   GLYDERS_ILLU_BASE,
//   ILLU_PROXY, // optional fallback
// } from "@/lib/assets";

// // Known collections
// export const KNOWN_COLLECTIONS = ["moonbirds", "glyders"] as const;
// export type CollectionId = (typeof KNOWN_COLLECTIONS)[number];

// export function isKnownCollection(x: string): x is CollectionId {
//   return (KNOWN_COLLECTIONS as readonly string[]).includes(x);
// }

// // Static JSON imports so Next can bundle them
// import moonbirdsMetaJson from "@/collections/moonbirds/meta.json";
// import moonbirdsConfigJson from "@/collections/moonbirds/config.json";
// import glydersMetaJson from "@/collections/glyders/meta.json";
// import glydersConfigJson from "@/collections/glyders/config.json";

// /** Raw JSON shapes (looser than runtime types) */
// type RawBaseLayer = { id: string; label: string; src: string };
// type RawDevice = { id: string; w: number; h: number; name: string };
// type RawBackground = RawBaseLayer & { mode?: "tile" | "image" };
// type RawText = RawBaseLayer & {
//   maxWidthRatio?: number;
//   maxHeightRatio?: number;
//   allowUpscale?: boolean;
// };

// type RawConfigJson = {
//   devices: RawDevice[];
//   backgrounds: RawBackground[];
//   texts: RawText[];
//   birds?: RawBaseLayer[];
//   headwear?: RawBaseLayer[];
// };

// const META: Record<CollectionId, CollectionMeta> = {
//   moonbirds: moonbirdsMetaJson as CollectionMeta,
//   glyders: glydersMetaJson as CollectionMeta,
// };

// const RAW_CONFIG: Record<CollectionId, RawConfigJson> = {
//   moonbirds: moonbirdsConfigJson as RawConfigJson,
//   glyders: glydersConfigJson as RawConfigJson,
// };

// /** Normalize raw JSON -> CollectionConfig and inject per-collection asset bases. */
// function toCollectionConfig(id: CollectionId, raw: RawConfigJson): CollectionConfig {
//   return {
//     devices: raw.devices.map((d) => ({
//       id: String(d.id),
//       w: Number(d.w),
//       h: Number(d.h),
//       name: String(d.name),
//     })),
//     backgrounds: raw.backgrounds.map((b) => ({
//       id: String(b.id),
//       label: String(b.label),
//       src: String(b.src),
//       mode: b.mode ?? "tile",
//     })),
//     texts: raw.texts.map((t) => ({
//       id: String(t.id),
//       label: String(t.label),
//       src: String(t.src),
//       ...(typeof t.maxWidthRatio === "number" ? { maxWidthRatio: t.maxWidthRatio } : {}),
//       ...(typeof t.maxHeightRatio === "number" ? { maxHeightRatio: t.maxHeightRatio } : {}),
//       ...(typeof t.allowUpscale === "boolean" ? { allowUpscale: t.allowUpscale } : {}),
//     })),
//     birds: raw.birds?.map((b) => ({ id: String(b.id), label: String(b.label), src: String(b.src) })) ?? [],
//     headwear: raw.headwear?.map((h) => ({ id: String(h.id), label: String(h.label), src: String(h.src) })) ?? [],

//     assetBases: {
//       pixelBase: id === "glyders" ? GLYDERS_PIXEL_BASE : PIXEL_BASE,
//       oddityBase: id === "moonbirds" ? ODDITY_BASE : undefined,
//       illustratedProxy: id === "moonbirds" ? ILLU_PROXY : undefined,
//       illustratedBase: id === "glyders"
//         ? (process.env.NEXT_PUBLIC_GLYDERS_ILLU_BASE ?? "")
//         : undefined,


//       // NEW: per-style scales
//       ...(id === "moonbirds"
//         ? {
//           pixelTokenScale: 1.2,        // Moonbirds pixel (if used)
//           illustratedTokenScale: 0.45, // Moonbirds illustrated (smaller)
//           oddityTokenScale: 0.8,     // Moonbirds oddity
//         }
//         : {
//           // Glyders
//           pixelTokenScale: 1,        // integer-scaled, then multiplied
//           illustratedTokenScale: 1, // Glyders illustrated (already looked good)
//         }),
//     }
//   };
// }

// // Public loader
// export async function loadCollection(id: CollectionId): Promise<{ meta: CollectionMeta; config: CollectionConfig }> {
//   const meta = META[id];
//   const raw = RAW_CONFIG[id];
//   if (!meta || !raw) throw new Error(`Missing meta/config for collection "${id}"`);
//   const config = toCollectionConfig(id, raw);
//   return { meta, config };
// }
