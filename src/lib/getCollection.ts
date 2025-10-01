// src/lib/getCollection.ts
import { PIXEL_BASE, ODDITY_BASE, ILLU_PROXY } from "@/lib/assets";

export const KNOWN_COLLECTIONS = ["moonbirds", "glyders"] as const;
export type CollectionId = (typeof KNOWN_COLLECTIONS)[number];

export function isKnownCollection(x: string): x is CollectionId {
  return (KNOWN_COLLECTIONS as readonly string[]).includes(x);
}

// Point at src/collections/* (not src/data/*)
const metaLoaders: Record<CollectionId, () => Promise<any>> = {
  moonbirds: () => import("@/collections/moonbirds/meta.json"),
  glyders:   () => import("@/collections/glyders/meta.json"),
};

const configLoaders: Record<CollectionId, () => Promise<any>> = {
  moonbirds: () => import("@/collections/moonbirds/config.json"),
  glyders:   () => import("@/collections/glyders/config.json"),
};

export async function loadCollection(id: CollectionId) {
  const metaMod   = await metaLoaders[id]();
  const configMod = await configLoaders[id]();

  const rawMeta   = metaMod.default;
  const rawConfig = configMod.default;

  const config = {
    ...rawConfig,
    assetBases: {
      pixelBase: rawConfig.assetBases?.pixelBase ?? PIXEL_BASE,
      oddityBase: rawConfig.assetBases?.oddityBase ?? ODDITY_BASE,
      illustratedProxy: rawConfig.assetBases?.illustratedProxy ?? ILLU_PROXY,
    },
  };

  return { meta: rawMeta, config };
}