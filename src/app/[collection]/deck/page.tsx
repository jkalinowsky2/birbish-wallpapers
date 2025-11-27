'use client'

import DeckComposer from '@/components/DeckComposer'
import { buildDeckComposerConfig } from '@/lib/getDeckConfig'

export default function Page() {
  const cfg = buildDeckComposerConfig('moonbirds')

  return (
    <main className="min-h-dvh text-neutral-900">
      {/* Full-width wrapper, same as home/shop */}
      <div className="w-screen relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] bg-neutral-50">
        <div className="bg-[#faf7f2] p-0 m-0">
          {/* Hero band – identical padding & styles to Home */}
          <section className="w-full bg-gradient-to-b from-[#ce0000] to-[#b20000] text-white border-b border-neutral-900">
            <div className="px-4 md:px-8 lg:px-10 pt-8 pb-10 md:pt-10 md:pb-12 lg:pt-16 lg:pb-16">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                Deck Designer
              </h1>

              <p className="mt-3 text-sm md:text-base text-white">
                Customize your Moonbirds skate deck!
              </p>
            </div>
          </section>
        </div>

        {/* Inner content – mirrors Home/Shop layout */}
        <div className="px-4 md:px-6 lg:px-8 pb-10">
          <div className="max-w-7xl mx-auto pt-8">
            <DeckComposer config={cfg} />
          </div>
        </div>
      </div>
    </main>
  )
}