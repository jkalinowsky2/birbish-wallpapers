// src/lib/getDeckConfig.ts
import deckConfig from '../collections/moonbirds/deck.config.json'


// If the JSON is { collections: { ... } }, T = value type of that record.
// Otherwise (single-collection JSON), T = the JSON itself.
export type DeckConfig = typeof deckConfig
export type DeckCollectionConfig =
  DeckConfig extends { collections: Record<string, infer T> } ? T : DeckConfig

export function getDeckConfig(): DeckConfig {
  return deckConfig
}

export function getDeckCollectionConfig(collection: string): DeckCollectionConfig | null {
  const cfg = deckConfig as any
  if (cfg && typeof cfg === 'object' && 'collections' in cfg) {
    // global config: pick by key
    return (cfg.collections as Record<string, DeckCollectionConfig>)[collection] ?? null
  }
  // per-collection file: just return it
  return cfg as DeckCollectionConfig
}