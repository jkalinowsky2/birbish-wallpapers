// src/app/deck/test/page.tsx
'use client'
import { useState } from 'react'
import DeckViewerMinimal from '@/components/DeckViewerMinimal'

const RED = '/deckAssets/grips/mb_red_pattern.png'
const BLUE = '/deckAssets/grips/mb_blue_pattern.png'
const BOTTOM = '/deckAssets/moonbirds/samplebottom.png'

export default function Page() {
  const [topUrl, setTopUrl] = useState<string>(RED)

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      <h1 className="text-2xl font-bold">Deck Designer</h1>
      <p className="text-neutral-700 leading-relaxed">
        Custom Moonbirds deck designer coming soon...
      </p>

      {/* Simple selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-600">Grip:</span>
        <button
          onClick={() => setTopUrl(RED)}
          className={`rounded-lg border px-3 py-1 text-sm ${topUrl === RED ? 'bg-black text-white' : 'bg-white'
            }`}
        >
          Red
        </button>
        <button
          onClick={() => setTopUrl(BLUE)}
          className={`rounded-lg border px-3 py-1 text-sm ${topUrl === BLUE ? 'bg-black text-white' : 'bg-white'
            }`}
        >
          Blue
        </button>
      </div>

      <div className="rounded-2xl border p-2">
        <div className="aspect-[16/9] w-full">
          {/* Pass the selected top texture */}
          <DeckViewerMinimal topUrl={topUrl} bottomUrl={BOTTOM} />
        </div>
      </div>
    </div>
  )
}