'use client'

import DeckComposer from '@/components/DeckComposer'
import { buildDeckComposerConfig } from '@/lib/getDeckConfig'

export default function Page() {
  const cfg = buildDeckComposerConfig('moonbirds')
  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-2">Deck Designer</h1>
      <p className="text-neutral-600 mb-6">Custom Moonbirds deck designer</p>
      <DeckComposer config={cfg} />
    </main>
  )
}