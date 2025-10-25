'use client'

import DeckComposer, { type DeckComposerConfig } from '@/components/DeckComposer'
import deckConfig from '@/collections/moonbirds/deck.config.json'

export default function Page() {
  const raw = deckConfig.collections['moonbirds']

  // Adapt JSON -> DeckComposerConfig
  const cfg: DeckComposerConfig = {
    collectionKey: 'moonbirds',
    grips: raw.grips.map(
      (g: { id: string; label?: string; name?: string; image: string }) => ({
        id: g.id,
        name: g.label ?? g.name ?? g.id,
        image: g.image,
      })
    ),
    bottoms: raw.bottoms.map(
      (b: { id: string; label?: string; name?: string; image: string }) => ({
        id: b.id,
        name: b.label ?? b.name ?? b.id,
        image: b.image,
      })
    ),
    glyphs: (raw.glyphs ?? []).map(
      (x: { id: string; label?: string; name?: string; image: string }) => ({
        id: x.id,
        name: x.label ?? x.name ?? x.id,
        image: x.image,
      })
    ),
    jkDesigns: (raw.jkDesigns ?? []).map(
      (j: { id: string; label?: string; name?: string; image: string }) => ({
        id: j.id,
        name: j.label ?? j.name ?? j.id,
        image: j.image,
      })
    ),
  }

  return <DeckComposer config={cfg} />
}
