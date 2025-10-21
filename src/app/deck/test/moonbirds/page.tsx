// src/app/deck/moonbirds/page.tsx
'use client'

import { useState } from 'react'
import DeckViewerMinimal from '@/components/DeckViewerMinimal'
import { getDeckCollectionConfig } from '@/lib/getDeckConfig'

export default function Page() {
  // Load config from your JSON (src/collections/moonbirds/deck.config.json)
  const cfg = getDeckCollectionConfig('moonbirds')

  // Basic guard if the JSON isn't found or empty
  if (!cfg) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold">Moonbirds Deck Builder</h1>
        <p className="mt-4 text-red-600">
          Could not load deck config. Check src/collections/moonbirds/deck.config.json.
        </p>
      </div>
    )
  }

  // Defaults pulled from config
  const defaultTop =
    cfg.grips?.[0]?.src ?? '/deckAssets/grips/mb_red_pattern.png'
  const defaultBottom =
    // allow a default image in your config if you add one later
    (cfg.defaults as any)?.bottom?.imageUrl ??
    '/deckAssets/moonbirds/samplebottom.png'

  // Local page state (minimal)
  const [topUrl, setTopUrl] = useState<string>(defaultTop)
  const [bottomUrl] = useState<string>(defaultBottom)

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      <h1 className="text-2xl font-bold">Moonbirds Deck Builder</h1>

      {/* Grip selector from config */}
      {cfg.grips?.length ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600">Grip:</span>
          {cfg.grips.map((g: any) => (
            <button
              key={g.id}
              onClick={() => setTopUrl(g.src)}
              className={`rounded-lg border px-3 py-1 text-sm ${
                topUrl === g.src ? 'bg-black text-white' : 'bg-white'
              }`}
              title={g.label}
            >
              {g.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">
          No grips defined in deck.config.json
        </p>
      )}

      {/* Viewer */}
      <div className="rounded-2xl border bg-white p-2">
        <div className="aspect-[16/9] w-full">
          <DeckViewerMinimal topUrl={topUrl} bottomUrl={bottomUrl} />
        </div>
      </div>
    </div>
  )
}