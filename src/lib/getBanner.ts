// src/lib/getBanner.ts
import type { BannerConfig } from "@/types/banner";
import type { CollectionId } from "@/lib/getCollection";

// Per-collection banner configs (JSON files you created)
import moonbirdsBanner from "@/collections/moonbirds/banner.config.json";
import glydersBanner from "@/collections/glyders/banner.config.json";
// Add more when ready
// import glydersBanner from "@/collections/glyders/banner.json";

const BANNERS: Partial<Record<CollectionId, BannerConfig>> = {
  moonbirds: moonbirdsBanner as BannerConfig,
  glyders: glydersBanner as BannerConfig,
};

export async function loadBanner(id: CollectionId): Promise<BannerConfig> {
  const cfg = BANNERS[id];
  if (!cfg) throw new Error(`No banner config for collection "${id}"`);
  return cfg;
}