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

export type GlyphItem = { id: string; name?: string; label?: string; image: string; tintMode?: 'any' | 'brand' | 'none'}
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
  glyphs4?: GlyphItem[]
  glyphs5?: GlyphItem[]
  glyphs6?: GlyphItem[]
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
    tintMode: g.tintMode ?? 'any',  // ✅ pass tint mode through
  }))

  const glyphs2 = (col.glyphs2 ?? []).map((g) => ({
    id: g.id,
    name: g.name ?? g.label ?? g.id,
    image: g.image,
    tintMode: g.tintMode ?? 'any',  // ✅ pass tint mode through
  }))

    const glyphs3 = (col.glyphs3 ?? []).map((g) => ({
    id: g.id,
    name: g.name ?? g.label ?? g.id,
    image: g.image,
    tintMode: g.tintMode ?? 'any',  // ✅ pass tint mode through
  }))

    const glyphs4 = (col.glyphs4 ?? []).map((g) => ({
    id: g.id,
    name: g.name ?? g.label ?? g.id,
    image: g.image,
  }))

    const glyphs5 = (col.glyphs5 ?? []).map((g) => ({
    id: g.id,
    name: g.name ?? g.label ?? g.id,
    image: g.image,
  }))

    const glyphs6 = (col.glyphs6 ?? []).map((g) => ({
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
    glyphs4,
    glyphs5,
    glyphs6,
    jkDesigns,
  }
}