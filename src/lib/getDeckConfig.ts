// src/lib/getDeckConfig.ts
import deckConfig from '../collections/moonbirds/deck.config.json'

export type GripItem = { id: string; label: string; src: string }
export type UVFix = { rotationFixDeg: number; flipX: boolean; flipY: boolean }

export type PerCollectionDeckConfig = {
  uvProfile?: {
    top?: UVFix
    bottom?: UVFix
  }
  grips?: GripItem[]
  defaults?: {
    style?: 'illustrated' | 'pixel' | 'oddity'
    top?: { fit?: 'cover' | 'contain' | 'stretch'; rotationDeg?: number; scale?: number; offset?: { x: number; y: number } }
    bottom?: { fit?: 'cover' | 'contain' | 'stretch'; rotationDeg?: number; scale?: number; offset?: { x: number; y: number } }
  }
}

export type GlobalDeckConfig = {
  v?: number
  defaultModel?: string
  collections: Record<string, PerCollectionDeckConfig>
}

// The JSON can be either a global config with `collections` or a single per-collection config
export type DeckConfig = GlobalDeckConfig | PerCollectionDeckConfig
export type DeckCollectionConfig = PerCollectionDeckConfig

function isGlobalConfig(x: unknown): x is GlobalDeckConfig {
  return !!x && typeof x === 'object' && 'collections' in (x as Record<string, unknown>)
}

export function getDeckConfig(): DeckConfig {
  return deckConfig as DeckConfig
}

export function getDeckCollectionConfig(collection: string): DeckCollectionConfig | null {
  const cfg = deckConfig as DeckConfig
  if (isGlobalConfig(cfg)) {
    return cfg.collections[collection] ?? null
  }
  // per-collection file: just return it
  return cfg as DeckCollectionConfig
}