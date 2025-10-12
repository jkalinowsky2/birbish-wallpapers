// src/lib/getCollection.ts
import type { CollectionMeta, CollectionConfig } from "@/types/collections";

export const KNOWN_COLLECTIONS = ["moonbirds", "glyders", "gobs", "trenchers"] as const;
export type CollectionId = (typeof KNOWN_COLLECTIONS)[number];
export function isKnownCollection(x: string): x is CollectionId {
  return (KNOWN_COLLECTIONS as readonly string[]).includes(x);
}

// ENV bases
const MOONBIRDS_PIXEL_BASE = process.env.NEXT_PUBLIC_MOONBIRDS_PIXEL_BASE ?? "";
const MOONBIRDS_ILLU_BASE = process.env.NEXT_PUBLIC_MOONBIRDS_ILLU_BASE ?? "";
const MOONBIRDS_ODDITY_BASE = process.env.NEXT_PUBLIC_MOONBIRDS_ODDITY_BASE ?? "";

const GLYDERS_PIXEL_BASE = process.env.NEXT_PUBLIC_GLYDERS_PIXEL_BASE ?? "";
const GLYDERS_ILLU_BASE = process.env.NEXT_PUBLIC_GLYDERS_ILLU_BASE ?? "";

const TRENCHERS_PIXEL_BASE = process.env.NEXT_PUBLIC_TRENCHERS_PIXEL_BASE ?? "";

// Optional proxy (kept for safety/fallbacks)
const ILLU_PROXY = process.env.NEXT_PUBLIC_ILLU_PROXY ?? "";

// Static JSON
import moonbirdsMetaJson from "@/collections/moonbirds/meta.json";
import moonbirdsConfigJson from "@/collections/moonbirds/config.json";
import glydersMetaJson from "@/collections/glyders/meta.json";
import glydersConfigJson from "@/collections/glyders/config.json";
import trenchersMetaJson from "@/collections/trenchers/meta.json";
import trenchersConfigJson from "@/collections/trenchers/config.json";
import gobsMetaJson from "@/collections/gobs/meta.json";
import gobsConfigJson from "@/collections/gobs/config.json";

type RawBaseLayer = { id: string; label: string; src: string };
type RawDevice = { id: string; w: number; h: number; name: string };
type RawBackground = RawBaseLayer & { mode?: "tile" | "image" };
type RawText = RawBaseLayer & { maxWidthRatio?: number; maxHeightRatio?: number; allowUpscale?: boolean };

type RawConfigJson = {
  devices: RawDevice[];
  backgrounds: RawBackground[];
  texts: RawText[];
  birds?: RawBaseLayer[];
  headwear?: RawBaseLayer[];
  effects?: { vignette?: boolean }; 
};

const META: Record<CollectionId, CollectionMeta> = {
  moonbirds: moonbirdsMetaJson as CollectionMeta,
  glyders: glydersMetaJson as CollectionMeta,
  trenchers: trenchersMetaJson as CollectionMeta,
  gobs: gobsMetaJson as CollectionMeta,
};

const RAW_CONFIG: Record<CollectionId, RawConfigJson> = {
  moonbirds: moonbirdsConfigJson as RawConfigJson,
  glyders: glydersConfigJson as RawConfigJson,
  trenchers: trenchersConfigJson as RawConfigJson,
  gobs: gobsConfigJson as RawConfigJson,

};

function toCollectionConfig(id: CollectionId, raw: RawConfigJson): CollectionConfig {
  if (id === "trenchers") {
  console.log("TRENCHERS base =", TRENCHERS_PIXEL_BASE);
}
  const bases = (() => {
    switch (id) {
      case "moonbirds":
        return {
          pixelBase: MOONBIRDS_PIXEL_BASE || undefined,
          illustratedBase: MOONBIRDS_ILLU_BASE || undefined,
          oddityBase: MOONBIRDS_ODDITY_BASE || undefined,
          illustratedProxy: ILLU_PROXY || undefined,

          // Wallpaper scales
          pixelTokenScale: 1.2,
          illustratedTokenScale: 0.45,
          oddityTokenScale: 0.8,

          // Banner scales
          pixelBannerScale: 1.75,
          illustratedBannerScale: 1.75,
          oddityBannerScale: 1.75,
        };

      case "glyders":
        return {
          pixelBase: GLYDERS_PIXEL_BASE || undefined,
          illustratedBase: GLYDERS_ILLU_BASE || undefined,

          pixelTokenScale: 1.0,
          illustratedTokenScale: 1.0,

          pixelBannerScale: 1.75,
          illustratedBannerScale: 1.75,
        };

      case "trenchers":
        return {
          // pixel-only for now
          pixelBase: TRENCHERS_PIXEL_BASE || undefined,

          pixelTokenScale: .45,
          pixelBannerScale: 1.75,
        };

      case "gobs":
        return {
          // fill in when ready; keep keys minimal so types are happy
          pixelTokenScale: 1.0,
          pixelBannerScale: 1.75,
        };

      default:
        return {};
    }
  })();

  return {
    devices: raw.devices.map((d) => ({ id: String(d.id), w: +d.w, h: +d.h, name: String(d.name) })),
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
    assetBases: bases,
    effects: raw.effects ?? { vignette: true },
  };
}

export async function loadCollection(id: CollectionId): Promise<{ meta: CollectionMeta; config: CollectionConfig }> {
  const meta = META[id];
  const raw = RAW_CONFIG[id];
  if (!meta || !raw) throw new Error(`Missing meta/config for "${id}"`);
  if (id === "trenchers") {
  console.log("🟢 Loaded Trenchers", {
    base: TRENCHERS_PIXEL_BASE,
    effects: raw.effects
  });
}
  return { meta, config: toCollectionConfig(id, raw) };
}
