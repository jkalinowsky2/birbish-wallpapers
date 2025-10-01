// src/lib/getCollection.ts
import { PIXEL_BASE, ODDITY_BASE, ILLU_PROXY } from "@/lib/assets";
import type { CollectionMeta, CollectionConfig } from "@/types/collections";

// Known collections
export const KNOWN_COLLECTIONS = ["moonbirds", "glyders"] as const;
export type CollectionId = (typeof KNOWN_COLLECTIONS)[number];

export function isKnownCollection(x: string): x is CollectionId {
  return (KNOWN_COLLECTIONS as readonly string[]).includes(x);
}

// Static JSON imports so Next can bundle them
import moonbirdsMetaJson from "@/collections/moonbirds/meta.json";
import moonbirdsConfigJson from "@/collections/moonbirds/config.json";
import glydersMetaJson from "@/collections/glyders/meta.json";
import glydersConfigJson from "@/collections/glyders/config.json";

/**
 * Raw shape as it exists in your JSON files (no assetBases in JSON, some fields optional).
 * We keep this local so we don't fight the stricter runtime types.
 */
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
  birds?: RawBaseLayer[];    // optional in JSON
  headwear?: RawBaseLayer[]; // optional in JSON
};

// Map the statically imported JSON into the raw shape (no `any`)
const META: Record<CollectionId, CollectionMeta> = {
  moonbirds: moonbirdsMetaJson as CollectionMeta,
  glyders: glydersMetaJson as CollectionMeta,
};

const RAW_CONFIG: Record<CollectionId, RawConfigJson> = {
  moonbirds: moonbirdsConfigJson as RawConfigJson,
  glyders: glydersConfigJson as RawConfigJson,
};

/** Normalize raw JSON -> CollectionConfig (inject runtime assetBases, default optionals). */
function toCollectionConfig(raw: RawConfigJson): CollectionConfig {
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
    // If CollectionConfig requires arrays, we guarantee them here:
    birds: raw.birds?.map((b) => ({ id: String(b.id), label: String(b.label), src: String(b.src) })) ?? [],
    headwear:
      raw.headwear?.map((h) => ({ id: String(h.id), label: String(h.label), src: String(h.src) })) ?? [],
    assetBases: {
      pixelBase: PIXEL_BASE,
      oddityBase: ODDITY_BASE,
      illustratedProxy: ILLU_PROXY,
    },
  };
}

// Public loader
export async function loadCollection(id: CollectionId): Promise<{
  meta: CollectionMeta;
  config: CollectionConfig;
}> {
  const meta = META[id];
  const raw = RAW_CONFIG[id];

  if (!meta || !raw) {
    throw new Error(`Missing meta/config for collection "${id}"`);
  }

  const config = toCollectionConfig(raw);
  return { meta, config };
}