// src/lib/getCollection.ts
import { PIXEL_BASE, ODDITY_BASE, ILLU_PROXY } from "@/lib/assets";
import type { CollectionMeta, CollectionConfig } from "@/types/collections";

type Elem<T> = T extends (infer U)[] ? U : never;
type OptElem<T> = Elem<NonNullable<T>>;

export const KNOWN_COLLECTIONS = ["moonbirds", "glyders"] as const;
export type CollectionId = (typeof KNOWN_COLLECTIONS)[number];

export function isKnownCollection(x: string): x is CollectionId {
  return (KNOWN_COLLECTIONS as readonly string[]).includes(x);
}

// ---- Static imports so Next can bundle the JSON ----
import moonbirdsMetaJson from "@/collections/moonbirds/meta.json";
import moonbirdsConfigJson from "@/collections/moonbirds/config.json";
import glydersMetaJson from "@/collections/glyders/meta.json";
import glydersConfigJson from "@/collections/glyders/config.json";

/** Coerce arbitrary JSON into the literal type used by backgrounds.mode */
function asBgMode(x: unknown): "tile" | "image" {
  return x === "image" ? "image" : "tile";
}

/** Make sure a possibly-missing array becomes a proper typed array */
function arr<T>(maybe: unknown, fallback: T[] = []): T[] {
  return Array.isArray(maybe) ? (maybe as T[]) : fallback;
}

/** Normalize raw JSON → CollectionConfig (fill missing bits, coerce modes) */
function normalizeConfig(raw: any): CollectionConfig {
  return {
    devices: arr<CollectionConfig["devices"][number]>(raw.devices).map((d) => ({
      id: String(d.id),
      w: Number(d.w),
      h: Number(d.h),
      name: String(d.name),
    })),

    backgrounds: arr<CollectionConfig["backgrounds"][number]>(raw.backgrounds).map((b) => ({
      id: String(b.id),
      label: String(b.label),
      src: String(b.src),
      mode: asBgMode((b as any).mode),
    })),

    texts: arr<CollectionConfig["texts"][number]>(raw.texts).map((t: any) => ({
      id: String(t.id),
      label: String(t.label),
      src: String(t.src),
      ...(t.maxWidthRatio != null ? { maxWidthRatio: Number(t.maxWidthRatio) } : {}),
      ...(t.maxHeightRatio != null ? { maxHeightRatio: Number(t.maxHeightRatio) } : {}),
      ...(t.allowUpscale != null ? { allowUpscale: Boolean(t.allowUpscale) } : {}),
    })),

    // Some collections don’t have these—default to empty arrays to satisfy the type
birds: arr<OptElem<CollectionConfig["birds"]>>(raw.birds).map((x) => ({
  id: String(x.id),
  label: String(x.label),
  src: String(x.src),
})),

headwear: arr<OptElem<CollectionConfig["headwear"]>>(raw.headwear).map((x) => ({
  id: String(x.id),
  label: String(x.label),
  src: String(x.src),
})),

    // asset bases get injected in loadCollection
    assetBases: {
      pixelBase: undefined,
      oddityBase: undefined,
      illustratedProxy: undefined,
    },
  };
}

// Assert metas to app type (shape should already match)
const META: Record<CollectionId, CollectionMeta> = {
  moonbirds: moonbirdsMetaJson as CollectionMeta,
  glyders: glydersMetaJson as CollectionMeta,
};

// Normalize both configs so they strictly match CollectionConfig
const RAW_CONFIG: Record<CollectionId, CollectionConfig> = {
  moonbirds: normalizeConfig(moonbirdsConfigJson),
  glyders: normalizeConfig(glydersConfigJson),
};

export async function loadCollection(id: CollectionId) {
  const meta = META[id];
  const rawConfig = RAW_CONFIG[id];

  if (!meta || !rawConfig) {
    throw new Error(`Missing meta/config for collection "${id}"`);
  }

  // Inject runtime asset bases (don’t mutate RAW_CONFIG)
  const config: CollectionConfig = {
    ...rawConfig,
    assetBases: {
      pixelBase: PIXEL_BASE,
      oddityBase: ODDITY_BASE,
      illustratedProxy: ILLU_PROXY,
    },
  };

  return { meta, config };
}