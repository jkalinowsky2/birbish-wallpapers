// src/lib/getDeckConfig.ts
import deckConfig from '../collections/moonbirds/deck.config.json'
import type { DeckComposerConfig } from '@/components/DeckComposer'

/* ---------- Types for the raw JSON (as stored on disk) ---------- */
export type GripItem = {
  id: string
  label?: string
  name?: string
  image?: string
  src?: string
}

export type BottomItem = {
  id: string
  label?: string
  name?: string
  image?: string
  src?: string
  // (We ignore color bottoms here to keep runtime simple/stable.)
}

export type GlyphItem = { id: string; name?: string; label?: string; image: string }
export type JKDesignItem = { id: string; name: string; image: string }

export type UVFix = { rotationFixDeg: number; flipX: boolean; flipY: boolean }

export type PerCollectionDeckConfig = {
  uvProfile?: {
    top?: UVFix
    bottom?: UVFix
  }
  grips?: GripItem[]
  bottoms?: BottomItem[]
  glyphs?: GlyphItem[]
  glyphs2?: GlyphItem[]
  glyphs3?: GlyphItem[]
  jkDesigns?: JKDesignItem[]
  defaults?: {
    style?: 'illustrated' | 'pixel' | 'oddity'
    top?: {
      fit?: 'cover' | 'contain' | 'stretch'
      rotationDeg?: number
      scale?: number
      offset?: { x: number; y: number }
    }
    bottom?: {
      fit?: 'cover' | 'contain' | 'stretch'
      rotationDeg?: number
      scale?: number
      offset?: { x: number; y: number }
    }
  }
}

export type GlobalDeckConfig = {
  v?: number
  defaultModel?: string
  collections: Record<string, PerCollectionDeckConfig>
}

/* ---------- Helpers to read the raw JSON ---------- */
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
  return cfg as DeckCollectionConfig
}

/* ---------- Adapter: build the exact shape DeckComposer needs ---------- */
const pickImage = (obj: { image?: string; src?: string }) => obj.image ?? obj.src ?? ''

export function buildDeckComposerConfig(collectionKey: string): DeckComposerConfig {
  const col = getDeckCollectionConfig(collectionKey)
  if (!col) throw new Error(`Collection "${collectionKey}" not found in deck.config.json`)

  const grips = (col.grips ?? []).map((g) => ({
    id: g.id,
    name: g.name ?? g.label ?? g.id,
    image: pickImage(g),
  }))

  // 👇 Image-only bottoms (simple, stable; avoids any color/stretch logic)
  const bottoms = (col.bottoms ?? []).map((b) => ({
    id: b.id,
    name: b.name ?? b.label ?? b.id,
    image: pickImage(b),
  }))

  const glyphs = (col.glyphs ?? []).map((g) => ({
    id: g.id,
    name: g.name ?? g.label ?? g.id,
    image: g.image,
  }))

  const glyphs2 = (col.glyphs2 ?? []).map((g) => ({
    id: g.id,
    name: g.name ?? g.label ?? g.id,
    image: g.image,
  }))

    const glyphs3 = (col.glyphs3 ?? []).map((g) => ({
    id: g.id,
    name: g.name ?? g.label ?? g.id,
    image: g.image,
  }))

  const jkDesigns = (col.jkDesigns ?? []).map((j) => ({
    id: j.id,
    name: j.name,
    image: j.image,
  }))

  return {
    collectionKey,
    grips,
    bottoms,
    glyphs,
    glyphs2,
    glyphs3,
    jkDesigns,
  }
}
// // src/lib/getDeckConfig.ts
// import deckConfig from '../collections/moonbirds/deck.config.json'

// /* ---------- Types for the raw JSON (as it exists on disk) ---------- */
// export type GripItem = {
//   id: string
//   label?: string
//   name?: string
//   image?: string
//   src?: string
// }

// export type BottomItem = {
//   id: string
//   label?: string
//   name?: string
//   image?: string
//   src?: string
//   type?: 'image' | 'color'      // <-- add
//   color?: string                // <-- add
// }

// export type GlyphItem = { id: string; name?: string; label?: string; image: string }
// export type JKDesignItem = { id: string; name: string; image: string }

// export type UVFix = { rotationFixDeg: number; flipX: boolean; flipY: boolean }

// export type PerCollectionDeckConfig = {
//   uvProfile?: {
//     top?: UVFix
//     bottom?: UVFix
//   }
//   grips?: GripItem[]
//   bottoms?: BottomItem[]
//   glyphs?: GlyphItem[]
//   glyphs2?: GlyphItem[]
//   jkDesigns?: JKDesignItem[]
//   defaults?: {
//     style?: 'illustrated' | 'pixel' | 'oddity'
//     top?: {
//       fit?: 'cover' | 'contain' | 'stretch'
//       rotationDeg?: number
//       scale?: number
//       offset?: { x: number; y: number }
//     }
//     bottom?: {
//       fit?: 'cover' | 'contain' | 'stretch'
//       rotationDeg?: number
//       scale?: number
//       offset?: { x: number; y: number }
//     }
//   }
// }

// export type GlobalDeckConfig = {
//   v?: number
//   defaultModel?: string
//   collections: Record<string, PerCollectionDeckConfig>
// }

// // The JSON can be either a global config with `collections` or a single per-collection config
// export type DeckConfig = GlobalDeckConfig | PerCollectionDeckConfig
// export type DeckCollectionConfig = PerCollectionDeckConfig

// function isGlobalConfig(x: unknown): x is GlobalDeckConfig {
//   return !!x && typeof x === 'object' && 'collections' in (x as Record<string, unknown>)
// }

// export function getDeckConfig(): DeckConfig {
//   return deckConfig as DeckConfig
// }

// export function getDeckCollectionConfig(collection: string): DeckCollectionConfig | null {
//   const cfg = deckConfig as DeckConfig
//   if (isGlobalConfig(cfg)) {
//     return cfg.collections[collection] ?? null
//   }
//   // per-collection file: just return it
//   return cfg as DeckCollectionConfig
// }

// /* ---------- Adapter for DeckComposer.tsx ---------- */
// /** Matches the props shape DeckComposer expects */
// export type DeckComposerConfig = {
//   collectionKey: string
//   grips: { id: string; name: string; image: string }[]
//   bottoms: (
//     | { id: string; name: string; type: 'image'; image: string }
//     | { id: string; name: string; type: 'color'; color: string }
//   )[]
//   glyphs?: { id: string; name: string; image: string }[]
//   glyphs2?: { id: string; name: string; image: string }[]
//   jkDesigns?: { id: string; name: string; image: string }[]
// }

// /** Safe helper to pick an image field (supports either `image` or older `src`) */
// const pickImage = (obj: { image?: string; src?: string }) => obj.image ?? obj.src ?? ''

// /** Build the exact config shape DeckComposer needs (including glyphs2) */
// export function buildDeckComposerConfig(collectionKey: string): DeckComposerConfig {
//   const col = getDeckCollectionConfig(collectionKey)
//   if (!col) {
//     throw new Error(`Collection "${collectionKey}" not found in deck.config.json`)
//   }

//   const grips = (col.grips ?? []).map((g) => ({
//     id: g.id,
//     name: g.name ?? g.label ?? g.id,
//     image: pickImage(g),
//   }))

//   const bottoms = (col.bottoms ?? []).map((b) => {
//     const name = b.name ?? b.label ?? b.id
//     if (b.type === 'color') {
//       return {
//         id: b.id,
//         name,
//         type: 'color' as const,
//         color: b.color ?? '#ffffff',
//       }
//     }
//     // default to image type when type is missing
//     return {
//       id: b.id,
//       name,
//       type: 'image' as const,
//       image: pickImage(b),
//     }
//   })

//   const glyphs = (col.glyphs ?? []).map((g) => ({
//     id: g.id,
//     name: g.name ?? g.label ?? g.id,
//     image: g.image,
//   }))

//   const glyphs2 = (col.glyphs2 ?? []).map((g) => ({
//     id: g.id,
//     name: g.name ?? g.label ?? g.id,
//     image: g.image,
//   }))

//   const jkDesigns = (col.jkDesigns ?? []).map((j) => ({
//     id: j.id,
//     name: j.name,
//     image: j.image,
//   }))

//   return {
//     collectionKey,
//     grips,
//     bottoms,
//     glyphs,
//     glyphs2,
//     jkDesigns,
//   }
// }

// // // src/lib/getDeckConfig.ts
// // import deckConfig from '../collections/moonbirds/deck.config.json'

// // export type GripItem = { id: string; label: string; src: string }
// // export type UVFix = { rotationFixDeg: number; flipX: boolean; flipY: boolean }

// // export type PerCollectionDeckConfig = {
// //   uvProfile?: {
// //     top?: UVFix
// //     bottom?: UVFix
// //   }
// //   grips?: GripItem[]
// //   defaults?: {
// //     style?: 'illustrated' | 'pixel' | 'oddity'
// //     top?: { fit?: 'cover' | 'contain' | 'stretch'; rotationDeg?: number; scale?: number; offset?: { x: number; y: number } }
// //     bottom?: { fit?: 'cover' | 'contain' | 'stretch'; rotationDeg?: number; scale?: number; offset?: { x: number; y: number } }
// //   }
// // }

// // export type GlobalDeckConfig = {
// //   v?: number
// //   defaultModel?: string
// //   collections: Record<string, PerCollectionDeckConfig>
// // }

// // // The JSON can be either a global config with `collections` or a single per-collection config
// // export type DeckConfig = GlobalDeckConfig | PerCollectionDeckConfig
// // export type DeckCollectionConfig = PerCollectionDeckConfig

// // function isGlobalConfig(x: unknown): x is GlobalDeckConfig {
// //   return !!x && typeof x === 'object' && 'collections' in (x as Record<string, unknown>)
// // }

// // export function getDeckConfig(): DeckConfig {
// //   return deckConfig as DeckConfig
// // }

// // export function getDeckCollectionConfig(collection: string): DeckCollectionConfig | null {
// //   const cfg = deckConfig as DeckConfig
// //   if (isGlobalConfig(cfg)) {
// //     return cfg.collections[collection] ?? null
// //   }
// //   // per-collection file: just return it
// //   return cfg as DeckCollectionConfig
// // }