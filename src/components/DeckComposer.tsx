
// src/components/DeckComposer.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import DeckViewerMinimal from './DeckViewerMinimal'
import { ChevronDown } from 'lucide-react'

/* ---------- Types (image-only bottoms) ---------- */
export type GripOption = { id: string; name: string; image: string }
export type BottomOption = { id: string; name: string; image: string }
export type JKDesign = { id: string; name: string; image: string }
export type GlyphOption = { id: string; name: string; image: string }

export type DeckComposerConfig = {
  collectionKey: string
  grips: GripOption[]
  bottoms: BottomOption[]
  glyphs?: GlyphOption[]      // Glyph layer 1
  glyphs2?: GlyphOption[]     // Glyph layer 2
  jkDesigns?: JKDesign[]
}

type LayoutMode = 'verticalTail' | 'horizontalLeft'
type BuildMode = 'custom' | 'jk'

/* ---------- Small UI helpers ---------- */
function Field({
  labelText,
  children,
  className,
}: {
  labelText: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`flex flex-col gap-2 ${className ?? ''}`}>
      <span className="text-sm font-medium">{labelText}</span>
      {children}
    </label>
  )
}

function OptionTile({
  image,
  label,
  selected,
  onClick,
}: {
  image: string
  label: string
  selected?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-col items-center justify-start',
        'rounded-xl bg-white border border-neutral-200 p-2',
        'transition hover:border-neutral-300',
        'overflow-hidden',
        selected ? 'shadow-[inset_0_0_0_2px_#111]' : 'shadow-none',
      ].join(' ')}
    >
      <div className="w-14 h-14 rounded-md overflow-hidden bg-neutral-100 relative">
        <Image src={image} alt={label} fill sizes="56px" style={{ objectFit: 'cover' }} />
      </div>
      <div className="mt-2 text-xs text-center leading-tight line-clamp-2 h-[2.25rem]">
        {label}
      </div>
    </button>
  )
}

function OptionsGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
}

/** One-open-at-a-time accordion (controlled) */
export function AccordionSection({
  title,
  children,
  defaultOpen = false,
  open,
  onToggle,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onToggle?: (next: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isControlled = typeof open === 'boolean'
  const isOpen = isControlled ? open : internalOpen
  const toggle = () => {
    if (isControlled) onToggle?.(!open)
    else setInternalOpen((o) => !o)
  }

  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={toggle}
        className={`
          w-full flex items-center justify-between
          rounded-full px-5 py-3 mb-2
          text-sm font-medium
          bg-neutral-300 text-neutral-800
          hover:bg-neutral-400
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-neutral-400/60
        `}
      >
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`
          overflow-hidden transition-[max-height,opacity,transform]
          duration-300 ease-in-out
          ${isOpen ? 'max-h-[1200px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-1'}
        `}
      >
        <div className="bg-neutral-100 rounded-2xl px-4 py-4 shadow-inner">{children}</div>
      </div>
    </div>
  )
}

/* ---------- Env-only bases ---------- */
const ILLU_BASE = (process.env.NEXT_PUBLIC_MOONBIRDS_ILLU_BASE || '').replace(/\/+$/, '')
const PIXEL_BASE = (process.env.NEXT_PUBLIC_MOONBIRDS_PIXEL_BASE || '').replace(/\/+$/, '')

function buildIllustratedUrl(id: string) {
  const n = Number(id)
  if (!Number.isFinite(n) || n < 1 || !ILLU_BASE) return ''
  return `${ILLU_BASE}/${n}.png`
}
function buildPixelUrl(id: string) {
  const n = Number(id)
  if (!Number.isFinite(n) || n < 1 || !PIXEL_BASE) return ''
  return `${PIXEL_BASE}/${n}.png`
}

/* ---------- Image loader (cache + decode) ---------- */
const imgCache = new Map<string, Promise<HTMLImageElement>>()

function loadImageCached(src: string): Promise<HTMLImageElement> {
  if (!src) return Promise.reject(new Error('empty src'))
  if (!imgCache.has(src)) {
    const p = new Promise<HTMLImageElement>((resolve, reject) => {
      if (typeof window === 'undefined' || !window.Image) {
        reject(new Error('Image constructor not available'))
        return
      }
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.referrerPolicy = 'no-referrer'
      img.onload = async () => {
        try {
          // @ ts-expect-error decode may not exist
          if (img.decode) await img.decode()
        } catch { /* ignore */ }
        resolve(img)
      }
      img.onerror = () => reject(new Error(`Failed to load ${src}`))
      img.src = src
    })
    imgCache.set(src, p)
  }
  return imgCache.get(src)!
}

/* ---------- Main component ---------- */
export default function DeckComposer({ config }: { config: DeckComposerConfig }) {
  const { grips, bottoms, jkDesigns = [], glyphs = [], glyphs2 = [] } = config
  const hasJK = jkDesigns.length > 0

  const initialGrip = useMemo(() => grips[0]!, [grips])
  const initialBottomBG = useMemo(() => bottoms[0]!, [bottoms])
  const initialJKId = jkDesigns[0]?.id ?? ''

  // Modes & selections
  const [mode, setMode] = useState<BuildMode>(hasJK ? 'jk' : 'custom')
  const [gripId, setGripId] = useState<string>(initialGrip.id)
  const [bottomBgId, setBottomBgId] = useState<string>(initialBottomBG.id)

  // Glyph layers (with "None")
  const glyphs1WithNone = useMemo<GlyphOption[]>(
    () => [{ id: 'none', name: 'None', image: '/deckAssets/moonbirds/none.png' }, ...glyphs],
    [glyphs]
  )
  const glyphs2WithNone = useMemo<GlyphOption[]>(
    () => [{ id: 'none', name: 'None', image: '/deckAssets/moonbirds/none.png' }, ...glyphs2],
    [glyphs2]
  )
  const [glyphId1, setGlyphId1] = useState<string>('none')
  const [glyphTint1, setGlyphTint1] = useState('#ff1a1a')
  const [glyphId2, setGlyphId2] = useState<string>('none')
  const [glyphTint2, setGlyphTint2] = useState('#ffffff')

  const selectedGlyph1 = glyphs1WithNone.find((g) => g.id === glyphId1) ?? glyphs1WithNone[0]
  const selectedGlyph2 = glyphs2WithNone.find((g) => g.id === glyphId2) ?? glyphs2WithNone[0]

  // Token
  const [tokenId, setTokenId] = useState<string>('') // moonbird ID
  const [style, setStyle] = useState<'illustrated' | 'pixel'>('illustrated')
  const layout: LayoutMode = 'horizontalLeft'
  const [tokenScale, setTokenScale] = useState<number>(3.25)
  const [offsetX, setOffsetX] = useState<number>(-40)
  const [offsetY, setOffsetY] = useState<number>(60)
  const nudgeValue = 100

  // JK selection
  const [jkId, setJkId] = useState<string>(initialJKId)

  // One-open accordion
  const [openId, setOpenId] = useState<string>('grip')

  // Viewer output
  const [bottomPreviewUrl, setBottomPreviewUrl] = useState<string>(initialBottomBG.image)

  // Derived selections
  const selectedGrip = grips.find((g) => g.id === gripId) ?? initialGrip
  const selectedBottomBG = bottoms.find((b) => b.id === bottomBgId) ?? initialBottomBG
  const selectedJK = jkDesigns.find((j) => j.id === jkId) ?? jkDesigns[0]

  // Offscreen canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (!canvasRef.current && typeof document !== 'undefined') {
      canvasRef.current = document.createElement('canvas')
    }
  }, [])

  /* ---------- Warm cache ---------- */
  useEffect(() => {
    const urls: string[] = [selectedBottomBG.image, selectedGrip.image]
    if (glyphId1 !== 'none' && selectedGlyph1.image) urls.push(selectedGlyph1.image)
    if (glyphId2 !== 'none' && selectedGlyph2.image) urls.push(selectedGlyph2.image)
    bottoms.slice(0, 6).forEach((b) => urls.push(b.image))
    glyphs.slice(0, 3).forEach((g) => urls.push(g.image))
    glyphs2.slice(0, 3).forEach((g) => urls.push(g.image))
    urls.forEach((u) => u && loadImageCached(u).catch(() => {}))
  }, [
    bottoms,
    glyphs,
    glyphs2,
    selectedBottomBG.image,
    selectedGrip.image,
    glyphId1,
    selectedGlyph1?.image,
    glyphId2,
    selectedGlyph2?.image,
  ])

  /* ---------- Compositor (restored scaling/positioning) ---------- */
  useEffect(() => {
    let cancelled = false

    const buildBottom = async () => {
      try {
        if (mode === 'jk' && selectedJK?.image) {
          await loadImageCached(selectedJK.image)
          if (!cancelled) setBottomPreviewUrl(selectedJK.image)
          return
        }

        // Sources
        const bgImg = await loadImageCached(selectedBottomBG.image)

        const glyph1Src = glyphId1 !== 'none' ? selectedGlyph1.image : ''
        const glyph2Src = glyphId2 !== 'none' ? selectedGlyph2.image : ''

        const glyph1Img = glyph1Src ? await loadImageCached(glyph1Src) : null
        const glyph2Img = glyph2Src ? await loadImageCached(glyph2Src) : null

        const wantPixel = style === 'pixel'
        const tokenSrc = tokenId
          ? wantPixel
            ? buildPixelUrl(tokenId)
            : buildIllustratedUrl(tokenId)
          : ''
        const tokenImg = tokenSrc ? await loadImageCached(tokenSrc) : null

        // Canvas
        const c = canvasRef.current
        if (!c) return
        const ctx = c.getContext('2d')
        if (!ctx) return

        const W = bgImg.naturalWidth || bgImg.width || 1600
        const H = bgImg.naturalHeight || bgImg.height || 1600
        c.width = W
        c.height = H

        ctx.clearRect(0, 0, W, H)

        // 1) Background
        ctx.drawImage(bgImg, 0, 0, W, H)

        // Helper: COVER fit + tint (original, non-stretched look)
        const drawCoverTinted = (img: HTMLImageElement, tint: string) => {
          const srcW = img.naturalWidth || img.width
          const srcH = img.naturalHeight || img.height
          const scale = Math.max(W / srcW, H / srcH) // COVER
          const gW = Math.round(srcW * scale)
          const gH = Math.round(srcH * scale)
          const gX = Math.round((W - gW) / 2)
          const gY = Math.round((H - gH) / 2)

          const tmp = document.createElement('canvas')
          tmp.width = Math.max(1, gW)
          tmp.height = Math.max(1, gH)
          const tctx = tmp.getContext('2d')
          if (!tctx) return
          tctx.imageSmoothingEnabled = true
          tctx.drawImage(img, 0, 0, gW, gH)
          tctx.globalCompositeOperation = 'source-in'
          tctx.fillStyle = tint
          tctx.fillRect(0, 0, gW, gH)
          tctx.globalCompositeOperation = 'source-over'
          ctx.drawImage(tmp, gX, gY)
        }

        // 2) Glyphs (under then over)
        if (glyph1Img) drawCoverTinted(glyph1Img, glyphTint1)
        if (glyph2Img) drawCoverTinted(glyph2Img, glyphTint2)

        // 3) Token (preserve aspect, original base sizing/position)
        if (tokenImg && tokenSrc) {
          const srcW = tokenImg.naturalWidth || tokenImg.width
          const srcH = tokenImg.naturalHeight || tokenImg.height

          const wantHorizontal = layout === 'horizontalLeft'
          const baseWidthRatio =
            style === 'pixel'
              ? wantHorizontal
                ? 0.5
                : 0.55
              : wantHorizontal
                ? 0.38
                : 0.42

          const scaleMul = Math.max(0.05, Math.min(10, tokenScale))
          const tW = W * baseWidthRatio * scaleMul
          const tH = (srcH / srcW) * tW

          const HSTART = { cx: 675, cy: 700 }

          if (wantHorizontal) {
            const cx = Math.round(HSTART.cx + offsetX)
            const cy = Math.round(HSTART.cy + offsetY)

            const prev = ctx.imageSmoothingEnabled
            ctx.imageSmoothingEnabled = !(style === 'pixel')
            ctx.save()
            ctx.translate(cx, cy)
            ctx.rotate(Math.PI / 2)
            ctx.drawImage(tokenImg, -tW / 2, -tH / 2, tW, tH)
            ctx.restore()
            ctx.imageSmoothingEnabled = prev
          } else {
            const baseDx = Math.round((W - tW) / 2)
            const baseDy = Math.round(H - tH - H * 0.06)
            const dx = baseDx + Math.round(offsetX)
            const dy = baseDy + Math.round(offsetY)

            const prev = ctx.imageSmoothingEnabled
            ctx.imageSmoothingEnabled = !(style === 'pixel')
            ctx.drawImage(tokenImg, dx, dy, tW, tH)
            ctx.imageSmoothingEnabled = prev
          }
        }

        const url = c.toDataURL('image/png')
        if (!cancelled) setBottomPreviewUrl(url)
      } catch {
        if (!cancelled) setBottomPreviewUrl((prev) => prev)
      }
    }

    buildBottom()
    return () => { cancelled = true }
  }, [
    mode,
    selectedJK?.image,
    selectedBottomBG.image,
    // glyphs
    glyphId1, glyphTint1, selectedGlyph1?.image,
    glyphId2, glyphTint2, selectedGlyph2?.image,
    // token
    tokenId, style, tokenScale, offsetX, offsetY,
  ])

  // helpers
  const bump = (setter: React.Dispatch<React.SetStateAction<number>>, delta: number) => {
    setter((v) => v + delta)
  }
  const controlsDisabled = mode === 'jk'

  return (
    <div className="grid gap-6 sm:grid-cols-[380px_minmax(0,1fr)] items-stretch">
      {/* Settings */}
      <aside className="h-full lg:sticky lg:top-6 h-fit p-2 lg:p-4">
        <div className="space-y-3">
          {hasJK && (
            <div className="inline-flex rounded-full bg-neutral-200 p-1">
              <button
                type="button"
                onClick={() => setMode('jk')}
                className={`px-5 py-2 text-sm font-medium rounded-full transition-all duration-200
                  ${mode === 'jk' ? 'bg-[#d12429] text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-300'}
                `}
              >
                JK Designs
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`px-5 py-2 text-sm font-medium rounded-full transition-all duration-200
                  ${mode === 'custom' ? 'bg-[#d12429] text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-300'}
                `}
              >
                Custom
              </button>
            </div>
          )}

          <div key={`accordion-stack-${mode}`}>
            {/* Grip */}
            <AccordionSection
              title="Grip Tape"
              open={openId === 'grip'}
              onToggle={(next) => setOpenId(next ? 'grip' : '')}
            >
              <OptionsGrid>
                {grips.map((g) => (
                  <OptionTile
                    key={g.id}
                    label={g.name}
                    image={g.image}
                    selected={gripId === g.id}
                    onClick={() => setGripId(g.id)}
                  />
                ))}
              </OptionsGrid>
            </AccordionSection>

            {/* Custom-only */}
            {mode === 'custom' && (
              <>
                <AccordionSection
                  title="Bottom Background"
                  open={openId === 'bg'}
                  onToggle={(next) => setOpenId(next ? 'bg' : '')}
                >
                  <OptionsGrid>
                    {bottoms.map((b) => (
                      <OptionTile
                        key={b.id}
                        label={b.name}
                        image={b.image}
                        selected={bottomBgId === b.id}
                        onClick={() => setBottomBgId(b.id)}
                      />
                    ))}
                  </OptionsGrid>
                </AccordionSection>

                {/* Glyph 1 */}
                <AccordionSection
                  title="Glyph Layer 1"
                  open={openId === 'glyph1'}
                  onToggle={(next) => setOpenId(next ? 'glyph1' : '')}
                >
                  <div className="space-y-3">
                    <OptionsGrid>
                      {glyphs1WithNone.map((g) => (
                        <OptionTile
                          key={`g1-${g.id}`}
                          label={g.name}
                          image={g.image}
                          selected={glyphId1 === g.id}
                          onClick={() => setGlyphId1(g.id)}
                        />
                      ))}
                    </OptionsGrid>

                    {glyphId1 !== 'none' && (
                      <Field labelText="Glyph 1 Tint">
                        <input type="color" value={glyphTint1} onChange={(e) => setGlyphTint1(e.target.value)} />
                      </Field>
                    )}
                  </div>
                </AccordionSection>

                {/* Glyph 2 */}
                <AccordionSection
                  title="Glyph Layer 2"
                  open={openId === 'glyph2'}
                  onToggle={(next) => setOpenId(next ? 'glyph2' : '')}
                >
                  <div className="space-y-3">
                    <OptionsGrid>
                      {glyphs2WithNone.map((g) => (
                        <OptionTile
                          key={`g2-${g.id}`}
                          label={g.name}
                          image={g.image}
                          selected={glyphId2 === g.id}
                          onClick={() => setGlyphId2(g.id)}
                        />
                      ))}
                    </OptionsGrid>

                    {glyphId2 !== 'none' && (
                      <Field labelText="Glyph 2 Tint">
                        <input type="color" value={glyphTint2} onChange={(e) => setGlyphTint2(e.target.value)} />
                      </Field>
                    )}
                  </div>
                </AccordionSection>

                {/* Token */}
                <AccordionSection
                  title="Moonbird Token"
                  open={openId === 'token'}
                  onToggle={(next) => setOpenId(next ? 'token' : '')}
                >
                  <div className="space-y-4">
                    <Field labelText="Token ID">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          className="input w-36"
                          type="number"
                          placeholder="e.g. 8209"
                          min={1}
                          value={tokenId}
                          onChange={(e) => setTokenId(e.target.value.trim())}
                          disabled={controlsDisabled}
                        />
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className={`btn ${style === 'illustrated' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setStyle('illustrated')}
                            disabled={!ILLU_BASE || controlsDisabled}
                            title={ILLU_BASE ? 'Use illustrated' : 'Set NEXT_PUBLIC_MOONBIRDS_ILLU_BASE'}
                          >
                            Illustrated
                          </button>
                          <button
                            type="button"
                            className={`btn ${style === 'pixel' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setStyle('pixel')}
                            disabled={!PIXEL_BASE || controlsDisabled}
                            title={PIXEL_BASE ? 'Use pixel' : 'Set NEXT_PUBLIC_MOONBIRDS_PIXEL_BASE'}
                          >
                            Pixel
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-neutral-500">Token is composited onto the selected background.</p>
                    </Field>

                    <Field labelText="Token Scale">
                      <div className="flex items-center gap-2">
                        <input
                          className="input w-28"
                          type="number"
                          step={0.25}
                          min={0.25}
                          max={10}
                          value={tokenScale}
                          onChange={(e) => {
                            const n = Number(e.target.value)
                            setTokenScale(Number.isFinite(n) ? Math.max(0.05, Math.min(10, n)) : 1)
                          }}
                          title="Multiply the base size"
                        />
                        <input
                          className="w-full accent-neutral-800"
                          type="range"
                          min={0.25}
                          max={5}
                          step={0.25}
                          value={tokenScale}
                          onChange={(e) => setTokenScale(Number(e.target.value))}
                          title="Drag to scale"
                        />
                        <button type="button" className="btn btn-ghost" onClick={() => setTokenScale(1)} title="Reset">
                          Reset
                        </button>
                      </div>
                    </Field>

                    <Field labelText="Nudge Position">
                      <div className="grid grid-cols-3 gap-2 w-[220px]">
                        <div />
                        <button type="button" className="btn" onClick={() => bump(setOffsetY, -nudgeValue)} title="Up">↑</button>
                        <div />
                        <button type="button" className="btn" onClick={() => bump(setOffsetX, -nudgeValue)} title="Left">←</button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => { setOffsetX(0); setOffsetY(0) }}
                          title="Center"
                        >•</button>
                        <button type="button" className="btn" onClick={() => bump(setOffsetX, nudgeValue)} title="Right">→</button>
                        <div />
                        <button type="button" className="btn" onClick={() => bump(setOffsetY, nudgeValue)} title="Down">↓</button>
                        <div />
                      </div>
                      <div className="flex items-center gap-3 pt-2 text-xs text-neutral-600">
                        <span>X: {offsetX}px</span>
                        <span>Y: {offsetY}px</span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setOffsetX(0); setOffsetY(0) }}
                        >
                          Reset
                        </button>
                      </div>
                    </Field>
                  </div>
                </AccordionSection>
              </>
            )}

            {/* JK-only */}
            {mode === 'jk' && hasJK && (
              <AccordionSection
                title="JK Design"
                open={openId === 'jk'}
                onToggle={(next) => setOpenId(next ? 'jk' : '')}
              >
                <Field labelText="Design">
                  <select
                    className="input"
                    value={jkId}
                    onChange={(e) => setJkId(e.target.value)}
                  >
                    {jkDesigns.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-neutral-500">Fixed artwork; token and glyph controls are hidden.</p>
                </Field>
              </AccordionSection>
            )}
          </div>

          <div className="text-xs text-neutral-500 pt-2">
            Preview is web-resolution; final print assets are prepared offline.
          </div>
        </div>
      </aside>

      {/* Preview */}
      <section className="rounded-2xl border shadow-sm p-4 lg:p-5">
        <div className="rounded-xl bg-white overflow-hidden">
          <DeckViewerMinimal topUrl={selectedGrip.image} bottomUrl={bottomPreviewUrl} />
        </div>
      </section>
    </div>
  )
}

// // src/components/DeckComposer.tsx
// 'use client'

// import { useEffect, useMemo, useRef, useState } from 'react'
// import Image from 'next/image'
// import DeckViewerMinimal from './DeckViewerMinimal'
// import { ChevronDown } from 'lucide-react'

// /* ---------- Types ---------- */
// export type GripOption = { id: string; name: string; image: string }

// export type BottomImage = { id: string; name: string; type: 'image'; image: string }
// export type BottomColor = { id: string; name: string; type: 'color'; color: string }
// export type BottomOption = BottomImage | BottomColor

// export type JKDesign = { id: string; name: string; image: string }
// export type GlyphOption = { id: string; name: string; image: string }

// export type DeckComposerConfig = {
//   collectionKey: string
//   grips: GripOption[]
//   bottoms: BottomOption[]                 // <- NOTE: bottoms (not bottomsOption)
//   glyphs?: GlyphOption[]                  // Glyph Layer 1
//   glyphs2?: GlyphOption[]                 // Glyph Layer 2
//   jkDesigns?: JKDesign[]
// }

// type LayoutMode = 'verticalTail' | 'horizontalLeft'
// type BuildMode = 'custom' | 'jk'

// /* ---------- Small UI helpers ---------- */
// function Field({
//   labelText,
//   children,
//   className,
// }: {
//   labelText: string
//   children: React.ReactNode
//   className?: string
// }) {
//   return (
//     <label className={`flex flex-col gap-2 ${className ?? ''}`}>
//       <span className="text-sm font-medium">{labelText}</span>
//       {children}
//     </label>
//   )
// }

// function OptionTile({
//   image,
//   color,
//   label,
//   selected,
//   onClick,
// }: {
//   image?: string
//   color?: string
//   label: string
//   selected?: boolean
//   onClick: () => void
// }) {
//   return (
//     <button
//       type="button"
//       onClick={onClick}
//       className={[
//         'flex flex-col items-center justify-start',
//         'rounded-xl bg-white border border-neutral-200 p-2',
//         'transition hover:border-neutral-300',
//         'overflow-hidden',
//         selected ? 'shadow-[inset_0_0_0_2px_#111]' : 'shadow-none',
//       ].join(' ')}
//     >
//       <div className="w-14 h-14 rounded-md overflow-hidden bg-neutral-100 relative">
//         {color ? (
//           <div style={{ width: '100%', height: '100%', background: color }} />
//         ) : (
//           <Image src={image!} alt={label} fill sizes="56px" style={{ objectFit: 'cover' }} />
//         )}
//       </div>
//       <div className="mt-2 text-xs text-center leading-tight line-clamp-2 h-[2.25rem]">
//         {label}
//       </div>
//     </button>
//   )
// }

// function OptionsGrid({ children }: { children: React.ReactNode }) {
//   return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
// }

// /** Minimal accordion — controlled or uncontrolled (we'll use controlled) */
// export function AccordionSection({
//   title,
//   children,
//   defaultOpen = false,
//   open,
//   onToggle,
// }: {
//   title: string
//   children: React.ReactNode
//   defaultOpen?: boolean
//   open?: boolean
//   onToggle?: (next: boolean) => void
// }) {
//   const [internalOpen, setInternalOpen] = useState(defaultOpen)
//   const isControlled = typeof open === 'boolean'
//   const isOpen = isControlled ? open : internalOpen

//   const toggle = () => {
//     if (isControlled) onToggle?.(!open)
//     else setInternalOpen((o) => !o)
//   }

//   return (
//     <div className="w-full">
//       <button
//         type="button"
//         aria-expanded={isOpen}
//         onClick={toggle}
//         className={`
//           w-full flex items-center justify-between
//           rounded-full px-5 py-3 mb-2
//           text-sm font-medium
//           bg-neutral-300 text-neutral-800
//           hover:bg-neutral-400
//           transition-colors duration-200
//           focus:outline-none focus:ring-2 focus:ring-neutral-400/60
//         `}
//       >
//         <span>{title}</span>
//         <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
//       </button>

//       <div
//         className={`
//           overflow-hidden transition-[max-height,opacity,transform]
//           duration-300 ease-in-out
//           ${isOpen ? 'max-h-[1200px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-1'}
//         `}
//       >
//         <div className="bg-neutral-100 rounded-2xl px-4 py-4 shadow-inner">{children}</div>
//       </div>
//     </div>
//   )
// }

// /* ---------- Env-only bases ---------- */
// const ILLU_BASE = (process.env.NEXT_PUBLIC_MOONBIRDS_ILLU_BASE || '').replace(/\/+$/, '')
// const PIXEL_BASE = (process.env.NEXT_PUBLIC_MOONBIRDS_PIXEL_BASE || '').replace(/\/+$/, '')

// function buildIllustratedUrl(id: string) {
//   const n = Number(id)
//   if (!Number.isFinite(n) || n < 1 || !ILLU_BASE) return ''
//   return `${ILLU_BASE}/${n}.png`
// }
// function buildPixelUrl(id: string) {
//   const n = Number(id)
//   if (!Number.isFinite(n) || n < 1 || !PIXEL_BASE) return ''
//   return `${PIXEL_BASE}/${n}.png`
// }

// /* ---------- Image loader (with cache + decode) ---------- */
// const imgCache = new Map<string, Promise<HTMLImageElement>>()

// function loadImageCached(src: string): Promise<HTMLImageElement> {
//   if (!src) return Promise.reject(new Error('empty src'))

//   if (!imgCache.has(src)) {
//     const p = new Promise<HTMLImageElement>((resolve, reject) => {
//       if (typeof window === 'undefined' || !window.Image) {
//         reject(new Error('Image constructor not available'))
//         return
//       }

//       const img = new window.Image()
//       img.crossOrigin = 'anonymous'
//       img.referrerPolicy = 'no-referrer'
//       img.onload = async () => {
//         try {
//           // @ ts-expect-error: decode may be missing
//           if (img.decode) await img.decode()
//         } catch {
//           /* ignore */
//         }
//         resolve(img)
//       }
//       img.onerror = () => reject(new Error(`Failed to load ${src}`))
//       img.src = src
//     })
//     imgCache.set(src, p)
//   }

//   return imgCache.get(src)!
// }

// /* ---------- Main component ---------- */
// export default function DeckComposer({ config }: { config: DeckComposerConfig }) {
//   const { grips, bottoms, jkDesigns = [], glyphs = [], glyphs2 = [] } = config
//   const hasJK = jkDesigns.length > 0

//   const initialGrip = useMemo(() => grips[0]!, [grips])
//   const initialBottomBG = useMemo(() => bottoms[0]!, [bottoms])
//   const initialJKId = jkDesigns[0]?.id ?? ''

//   // Mode: Custom vs JK
//   const [mode, setMode] = useState<BuildMode>(hasJK ? 'jk' : 'custom')

//   // Selections
//   const [gripId, setGripId] = useState<string>(initialGrip.id)
//   const [bottomBgId, setBottomBgId] = useState<string>(initialBottomBG.id)

//   const glyphs1WithNone = useMemo<GlyphOption[]>(
//     () => [{ id: 'none', name: 'None', image: '/deckAssets/moonbirds/none.png' }, ...glyphs],
//     [glyphs]
//   )
//   const glyphs2WithNone = useMemo<GlyphOption[]>(
//     () => [{ id: 'none', name: 'None', image: '/deckAssets/moonbirds/none.png' }, ...glyphs2],
//     [glyphs2]
//   )
//   const [glyphId1, setGlyphId1] = useState<string>('none')
//   const [glyphTint1, setGlyphTint1] = useState('#ff1a1a')

//   const [glyphId2, setGlyphId2] = useState<string>('none')
//   const [glyphTint2, setGlyphTint2] = useState('#ffffff')

//   const selectedGlyph1 = glyphs1WithNone.find((g) => g.id === glyphId1) ?? glyphs1WithNone[0]
//   const selectedGlyph2 = glyphs2WithNone.find((g) => g.id === glyphId2) ?? glyphs2WithNone[0]

//   const [tokenId, setTokenId] = useState<string>('') // moonbird ID
//   const [style, setStyle] = useState<'illustrated' | 'pixel'>('illustrated')
//   const layout: LayoutMode = 'horizontalLeft'

//   const [tokenScale, setTokenScale] = useState<number>(3.25)
//   const [offsetX, setOffsetX] = useState<number>(-40)
//   const [offsetY, setOffsetY] = useState<number>(60)
//   const nudgeValue = 100

//   const [jkId, setJkId] = useState<string>(initialJKId)

//   // One-open-only accordion
//   const [openId, setOpenId] = useState<string>('grip')

//   // Output for viewer
//   const [bottomPreviewUrl, setBottomPreviewUrl] = useState<string>(
//     initialBottomBG.type === 'image' ? initialBottomBG.image : ''
//   )

//   // Derived selections
//   const selectedGrip = grips.find((g) => g.id === gripId) ?? initialGrip
//   const selectedBottomBG = bottoms.find((b) => b.id === bottomBgId) ?? initialBottomBG
//   const selectedJK = jkDesigns.find((j) => j.id === jkId) ?? jkDesigns[0]

//   // Offscreen canvas
//   const canvasRef = useRef<HTMLCanvasElement | null>(null)
//   useEffect(() => {
//     if (!canvasRef.current && typeof document !== 'undefined') {
//       canvasRef.current = document.createElement('canvas')
//     }
//   }, [])

//   /* ---------- WARM THE CACHE ---------- */
//   useEffect(() => {
//     const urls: string[] = []

//     // Only images are preloaded
//     if (selectedBottomBG.type === 'image') urls.push(selectedBottomBG.image)
//     urls.push(selectedGrip.image)
//     if (glyphId1 !== 'none' && selectedGlyph1.image) urls.push(selectedGlyph1.image)
//     if (glyphId2 !== 'none' && selectedGlyph2.image) urls.push(selectedGlyph2.image)

//     bottoms.slice(0, 6).forEach((b) => {
//       if (b.type === 'image' && b.image) urls.push(b.image)
//     })
//     glyphs.slice(0, 3).forEach((g) => urls.push(g.image))
//     glyphs2.slice(0, 3).forEach((g) => urls.push(g.image))

//     urls.forEach((u) => u && loadImageCached(u).catch(() => {}))
//   }, [
//     bottoms,
//     glyphs,
//     glyphs2,
//     selectedBottomBG,
//     selectedGrip.image,
//     glyphId1,
//     selectedGlyph1?.image,
//     glyphId2,
//     selectedGlyph2?.image,
//   ])

//   /* ---------- COMPOSITOR (draw offscreen, swap after ready) ---------- */
//   useEffect(() => {
//     let cancelled = false

//     const buildBottom = async () => {
//       try {
//         // JK mode: use fixed art (preload + swap)
//         if (mode === 'jk' && selectedJK?.image) {
//           await loadImageCached(selectedJK.image)
//           if (!cancelled) setBottomPreviewUrl(selectedJK.image)
//           return
//         }

//         // CUSTOM MODE
//         const c = canvasRef.current
//         if (!c) return
//         const ctx = c.getContext('2d')
//         if (!ctx) return

//         // Start with a size; if we have an image background, we’ll resize to it
//         let W = 1600
//         let H = 1600

//         ctx.clearRect(0, 0, W, H)

//         // 1) Background (image or solid color)
//         if (selectedBottomBG.type === 'image') {
//           const bgImg = await loadImageCached(selectedBottomBG.image)
//           W = bgImg.naturalWidth || bgImg.width || 1600
//           H = bgImg.naturalHeight || bgImg.height || 1600
//           c.width = W
//           c.height = H
//           ctx.clearRect(0, 0, W, H)
//           ctx.drawImage(bgImg, 0, 0, W, H)
//         } else {
//           c.width = W
//           c.height = H
//           ctx.clearRect(0, 0, W, H)
//           ctx.fillStyle = selectedBottomBG.color
//           ctx.fillRect(0, 0, W, H)
//         }

//         // helper to cover-fit + tint
//         const drawTintedGlyph = (img: HTMLImageElement, tint: string) => {
//           const gSrcW = img.naturalWidth || img.width
//           const gSrcH = img.naturalHeight || img.height
//           const scale = Math.max(W / gSrcW, H / gSrcH)
//           const gW = Math.round(gSrcW * scale)
//           const gH = Math.round(gSrcH * scale)
//           const gX = Math.round((W - gW) / 2)
//           const gY = Math.round((H - gH) / 2)

//           const tmp = document.createElement('canvas')
//           tmp.width = Math.max(1, gW)
//           tmp.height = Math.max(1, gH)
//           const tctx = tmp.getContext('2d')
//           if (!tctx) return
//           tctx.imageSmoothingEnabled = true
//           tctx.drawImage(img, 0, 0, gW, gH)
//           tctx.globalCompositeOperation = 'source-in'
//           tctx.fillStyle = tint
//           tctx.fillRect(0, 0, gW, gH)
//           tctx.globalCompositeOperation = 'source-over'
//           ctx.drawImage(tmp, gX, gY)
//         }

//         // 2) Glyph layer 1 (under)
//         if (glyphId1 !== 'none' && selectedGlyph1.image) {
//           const g1 = await loadImageCached(selectedGlyph1.image)
//           drawTintedGlyph(g1, glyphTint1)
//         }

//         // 3) Glyph layer 2 (over)
//         if (glyphId2 !== 'none' && selectedGlyph2.image) {
//           const g2 = await loadImageCached(selectedGlyph2.image)
//           drawTintedGlyph(g2, glyphTint2)
//         }

//         // 4) Token (top)
//         if (tokenId) {
//           const tokenSrc = style === 'pixel' ? buildPixelUrl(tokenId) : buildIllustratedUrl(tokenId)
//           if (tokenSrc) {
//             const tokenImg = await loadImageCached(tokenSrc)
//             const srcW = tokenImg.naturalWidth || tokenImg.width
//             const srcH = tokenImg.naturalHeight || tokenImg.height

//             const wantHorizontal = layout === 'horizontalLeft'
//             const baseWidthRatio =
//               style === 'pixel'
//                 ? wantHorizontal
//                   ? 0.5
//                   : 0.55
//                 : wantHorizontal
//                   ? 0.38
//                   : 0.42

//             const scaleMul = Math.max(0.05, Math.min(10, tokenScale))
//             const tW = W * baseWidthRatio * scaleMul
//             const tH = srcH * (tW / srcW)

//             const HSTART = { cx: 675, cy: 700 }

//             if (wantHorizontal) {
//               const cx = Math.round(HSTART.cx + offsetX)
//               const cy = Math.round(HSTART.cy + offsetY)
//               const prev = ctx.imageSmoothingEnabled
//               ctx.imageSmoothingEnabled = !(style === 'pixel')
//               ctx.save()
//               ctx.translate(cx, cy)
//               ctx.rotate(Math.PI / 2) // 90° clockwise
//               ctx.drawImage(tokenImg, -tW / 2, -tH / 2, tW, tH)
//               ctx.restore()
//               ctx.imageSmoothingEnabled = prev
//             } else {
//               const baseDx = Math.round((W - tW) / 2)
//               const baseDy = Math.round(H - tH - H * 0.06)
//               const dx = baseDx + Math.round(offsetX)
//               const dy = baseDy + Math.round(offsetY)
//               const prev = ctx.imageSmoothingEnabled
//               ctx.imageSmoothingEnabled = !(style === 'pixel')
//               ctx.drawImage(tokenImg, dx, dy, tW, tH)
//               ctx.imageSmoothingEnabled = prev
//             }
//           }
//         }

//         // finalize (swap)
//         const url = c.toDataURL('image/png')
//         if (!cancelled) setBottomPreviewUrl(url)
//       } catch {
//         if (!cancelled) setBottomPreviewUrl((prev) => prev) // keep previous to avoid flicker
//       }
//     }

//     buildBottom()
//     return () => {
//       cancelled = true
//     }
//   }, [
//     mode,
//     selectedJK?.image,
//     bottomBgId,               // react to chosen bottom by id (covers color/image)
//     selectedBottomBG,         // type-safe change detection
//     // glyph 1
//     glyphId1,
//     glyphTint1,
//     selectedGlyph1?.image,
//     // glyph 2
//     glyphId2,
//     glyphTint2,
//     selectedGlyph2?.image,
//     // token & layout
//     tokenId,
//     style,
//     tokenScale,
//     offsetX,
//     offsetY,
//     layout,
//   ])

//   // helpers
//   const bump = (setter: React.Dispatch<React.SetStateAction<number>>, delta: number) => {
//     setter((v) => v + delta)
//   }

//   const controlsDisabled = mode === 'jk'

//   return (
//     <div className="grid gap-6 sm:grid-cols-[380px_minmax(0,1fr)] items-stretch">
//       {/* Settings (left) */}
//       <aside className="h-full lg:sticky lg:top-6 h-fit p-2 lg:p-4">
//         <div className="space-y-3">
//           {/* Mode (JK vs Custom) — always visible */}
//           {hasJK && (
//             <div className="inline-flex rounded-full bg-neutral-200 p-1">
//               <button
//                 type="button"
//                 onClick={() => setMode('jk')}
//                 className={`px-5 py-2 text-sm font-medium rounded-full transition-all duration-200
//                   ${mode === 'jk' ? 'bg-[#d12429] text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-300'}
//                 `}
//               >
//                 JK Designs
//               </button>
//               <button
//                 type="button"
//                 onClick={() => setMode('custom')}
//                 className={`
//                   px-5 py-2 text-sm font-medium rounded-full transition-all duration-200
//                   ${mode === 'custom' ? 'bg-[#d12429] text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-300'}
//                 `}
//               >
//                 Custom
//               </button>
//             </div>
//           )}

//           {/* One-open-only accordions */}
//           <div key={`accordion-stack-${mode}`}>
//             {/* 1) Grip */}
//             <AccordionSection
//               title="Grip Tape"
//               open={openId === 'grip'}
//               onToggle={(next) => setOpenId(next ? 'grip' : '')}
//             >
//               <OptionsGrid>
//                 {grips.map((g) => (
//                   <OptionTile
//                     key={g.id}
//                     label={g.name}
//                     image={g.image}
//                     selected={gripId === g.id}
//                     onClick={() => setGripId(g.id)}
//                   />
//                 ))}
//               </OptionsGrid>
//             </AccordionSection>

//             {/* 2) Custom-only accordions */}
//             {mode === 'custom' && (
//               <>
//                 <AccordionSection
//                   title="Bottom Background"
//                   open={openId === 'bg'}
//                   onToggle={(next) => setOpenId(next ? 'bg' : '')}
//                 >
//                   <OptionsGrid>
//                     {bottoms.map((b) => (
//                       <OptionTile
//                         key={b.id}
//                         label={b.name}
//                         image={b.type === 'image' ? b.image : undefined}
//                         color={b.type === 'color' ? b.color : undefined}
//                         selected={bottomBgId === b.id}
//                         onClick={() => setBottomBgId(b.id)}
//                       />
//                     ))}
//                   </OptionsGrid>
//                 </AccordionSection>

//                 {/* Glyph Layer 1 */}
//                 <AccordionSection
//                   title="Glyph Layer 1"
//                   open={openId === 'glyph1'}
//                   onToggle={(next) => setOpenId(next ? 'glyph1' : '')}
//                 >
//                   <div className="space-y-3">
//                     <OptionsGrid>
//                       {glyphs1WithNone.map((g) => (
//                         <OptionTile
//                           key={`g1-${g.id}`}
//                           label={g.name}
//                           image={g.image}
//                           selected={glyphId1 === g.id}
//                           onClick={() => setGlyphId1(g.id)}
//                         />
//                       ))}
//                     </OptionsGrid>

//                     {glyphId1 !== 'none' && (
//                       <Field labelText="Glyph 1 Tint">
//                         <input type="color" value={glyphTint1} onChange={(e) => setGlyphTint1(e.target.value)} />
//                       </Field>
//                     )}
//                   </div>
//                 </AccordionSection>

//                 {/* Glyph Layer 2 */}
//                 <AccordionSection
//                   title="Glyph Layer 2"
//                   open={openId === 'glyph2'}
//                   onToggle={(next) => setOpenId(next ? 'glyph2' : '')}
//                 >
//                   <div className="space-y-3">
//                     <OptionsGrid>
//                       {glyphs2WithNone.map((g) => (
//                         <OptionTile
//                           key={`g2-${g.id}`}
//                           label={g.name}
//                           image={g.image}
//                           selected={glyphId2 === g.id}
//                           onClick={() => setGlyphId2(g.id)}
//                         />
//                       ))}
//                     </OptionsGrid>

//                     {glyphId2 !== 'none' && (
//                       <Field labelText="Glyph 2 Tint">
//                         <input type="color" value={glyphTint2} onChange={(e) => setGlyphTint2(e.target.value)} />
//                       </Field>
//                     )}
//                   </div>
//                 </AccordionSection>

//                 {/* Token */}
//                 <AccordionSection
//                   title="Moonbird Token"
//                   open={openId === 'token'}
//                   onToggle={(next) => setOpenId(next ? 'token' : '')}
//                 >
//                   <div className="space-y-4">
//                     <Field labelText="Token ID">
//                       <div className="flex flex-wrap items-center gap-2">
//                         <input
//                           className="input w-36"
//                           type="number"
//                           placeholder="e.g. 8209"
//                           min={1}
//                           value={tokenId}
//                           onChange={(e) => setTokenId(e.target.value.trim())}
//                           disabled={controlsDisabled}
//                         />
//                         <div className="flex gap-1">
//                           <button
//                             type="button"
//                             className={`btn ${style === 'illustrated' ? 'btn-primary' : 'btn-ghost'}`}
//                             onClick={() => setStyle('illustrated')}
//                             disabled={!ILLU_BASE || controlsDisabled}
//                             title={ILLU_BASE ? 'Use illustrated' : 'Set NEXT_PUBLIC_MOONBIRDS_ILLU_BASE'}
//                           >
//                             Illustrated
//                           </button>
//                           <button
//                             type="button"
//                             className={`btn ${style === 'pixel' ? 'btn-primary' : 'btn-ghost'}`}
//                             onClick={() => setStyle('pixel')}
//                             disabled={!PIXEL_BASE || controlsDisabled}
//                             title={PIXEL_BASE ? 'Use pixel' : 'Set NEXT_PUBLIC_MOONBIRDS_PIXEL_BASE'}
//                           >
//                             Pixel
//                           </button>
//                         </div>
//                       </div>
//                       <p className="text-xs text-neutral-500">Token is composited onto the selected background.</p>
//                     </Field>

//                     <Field labelText="Token Scale">
//                       <div className="flex items-center gap-2">
//                         <input
//                           className="input w-28"
//                           type="number"
//                           step={0.25}
//                           min={0.25}
//                           max={10}
//                           value={tokenScale}
//                           onChange={(e) => {
//                             const n = Number(e.target.value)
//                             setTokenScale(Number.isFinite(n) ? Math.max(0.05, Math.min(10, n)) : 1)
//                           }}
//                           title="Multiply the base size"
//                         />
//                         <input
//                           className="w-full accent-neutral-800"
//                           type="range"
//                           min={0.25}
//                           max={5}
//                           step={0.25}
//                           value={tokenScale}
//                           onChange={(e) => setTokenScale(Number(e.target.value))}
//                           title="Drag to scale"
//                         />
//                         <button type="button" className="btn btn-ghost" onClick={() => setTokenScale(1)} title="Reset">
//                           Reset
//                         </button>
//                       </div>
//                     </Field>

//                     <Field labelText="Nudge Position">
//                       <div className="grid grid-cols-3 gap-2 w-[220px]">
//                         <div />
//                         {/* Up */}
//                         <button type="button" className="btn" onClick={() => bump(setOffsetY, -nudgeValue)} title="Up">
//                           ↑
//                         </button>
//                         <div />
//                         {/* Left */}
//                         <button type="button" className="btn" onClick={() => bump(setOffsetX, -nudgeValue)} title="Left">
//                           ←
//                         </button>
//                         {/* Center */}
//                         <button
//                           type="button"
//                           className="btn btn-ghost"
//                           onClick={() => {
//                             setOffsetX(0)
//                             setOffsetY(0)
//                           }}
//                           title="Center"
//                         >
//                           •
//                         </button>
//                         {/* Right */}
//                         <button type="button" className="btn" onClick={() => bump(setOffsetX, nudgeValue)} title="Right">
//                           →
//                         </button>
//                         <div />
//                         {/* Down */}
//                         <button type="button" className="btn" onClick={() => bump(setOffsetY, nudgeValue)} title="Down">
//                           ↓
//                         </button>
//                         <div />
//                       </div>
//                       <div className="flex items-center gap-3 pt-2 text-xs text-neutral-600">
//                         <span>X: {offsetX}px</span>
//                         <span>Y: {offsetY}px</span>
//                         <button
//                           type="button"
//                           className="btn btn-ghost btn-sm"
//                           onClick={() => {
//                             setOffsetX(0)
//                             setOffsetY(0)
//                           }}
//                         >
//                           Reset
//                         </button>
//                       </div>
//                     </Field>
//                   </div>
//                 </AccordionSection>
//               </>
//             )}

//             {/* 3) JK-only */}
//             {mode === 'jk' && hasJK && (
//               <AccordionSection
//                 title="JK Design"
//                 open={openId === 'jk'}
//                 onToggle={(next) => setOpenId(next ? 'jk' : '')}
//               >
//                 <Field labelText="Design">
//                   <select className="input" value={jkId} onChange={(e) => setJkId(e.target.value)}>
//                     {jkDesigns.map((d) => (
//                       <option key={d.id} value={d.id}>
//                         {d.name}
//                       </option>
//                     ))}
//                   </select>
//                   <p className="text-xs text-neutral-500">Fixed artwork; token and glyph controls are hidden.</p>
//                 </Field>
//               </AccordionSection>
//             )}
//           </div>

//           <div className="text-xs text-neutral-500 pt-2">
//             Preview is web-resolution; final print assets are prepared offline.
//           </div>
//         </div>
//       </aside>

//       {/* Preview (right) */}
//       <section className="rounded-2xl border shadow-sm p-4 lg:p-5">
//         <div className="rounded-xl bg-white overflow-hidden">
//           <DeckViewerMinimal topUrl={selectedGrip.image} bottomUrl={bottomPreviewUrl} />
//         </div>
//       </section>
//     </div>
//   )
// }






// // src/components/DeckComposer.tsx
// 'use client'

// import { useEffect, useMemo, useRef, useState } from 'react'
// import Image from 'next/image'
// import DeckViewerMinimal from './DeckViewerMinimal'
// import { ChevronDown } from 'lucide-react'

// /* ---------- Types ---------- */
// export type GripOption = { id: string; name: string; image: string }
// // export type BottomOption = { id: string; name: string; image: string }
// export type BottomImage = { id: string; name: string; type: 'image'; image: string }
// export type BottomColor = { id: string; name: string; type: 'color'; color: string }
// export type BottomOption = BottomImage | BottomColor

// /** Fixed designs used as-is (no token overlay) */
// export type JKDesign = { id: string; name: string; image: string }
// export type GlyphOption = { id: string; name: string; image: string }

// export type DeckComposerConfig = {
//     collectionKey: string
//     grips: GripOption[]
//     bottomsOption: BottomOption[]              // backgrounds for Custom mode
//     glyphs?: GlyphOption[]               // Glyph Layer 1
//     glyphs2?: GlyphOption[]              // Glyph Layer 2
//     jkDesigns?: JKDesign[]               // fixed bottoms (no edits)
// }

// type LayoutMode = 'verticalTail' | 'horizontalLeft'
// type BuildMode = 'custom' | 'jk'


// /* ---------- Small UI helpers ---------- */
// function Field({
//     labelText,
//     children,
//     className,
// }: {
//     labelText: string
//     children: React.ReactNode
//     className?: string
// }) {
//     return (
//         <label className={`flex flex-col gap-2 ${className ?? ''}`}>
//             <span className="text-sm font-medium">{labelText}</span>
//             {children}
//         </label>
//     )
// }
// function OptionTile({
//     image,
//     color,
//     label,
//     selected,
//     onClick,
// }: {
//     image?: string
//     color?: string
//     label: string
//     selected?: boolean
//     onClick: () => void
// }) {
//     return (
//         <button
//             type="button"
//             onClick={onClick}
//             className={[
//                 'flex flex-col items-center justify-start',
//                 'rounded-xl bg-white border border-neutral-200 p-2',
//                 'transition hover:border-neutral-300',
//                 'overflow-hidden',
//                 selected ? 'shadow-[inset_0_0_0_2px_#111]' : 'shadow-none',
//             ].join(' ')}
//         >
//             <div className="w-14 h-14 rounded-md overflow-hidden bg-neutral-100 relative">
//                 {color ? (
//                     <div style={{ width: '100%', height: '100%', background: color }} />
//                 ) : (
//                     <Image src={image!} alt={label} fill sizes="56px" style={{ objectFit: 'cover' }} />
//                 )}
//             </div>
//             <div className="mt-2 text-xs text-center leading-tight line-clamp-2 h-[2.25rem]">
//                 {label}
//             </div>
//         </button>
//     )
// }

// function OptionsGrid({ children }: { children: React.ReactNode }) {
//     return (
//         <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
//             {children}
//         </div>
//     )
// }

// /** Minimal accordion — controlled or uncontrolled (we'll use controlled) */
// export function AccordionSection({
//     title,
//     children,
//     defaultOpen = false,
//     open,
//     onToggle,
// }: {
//     title: string
//     children: React.ReactNode
//     defaultOpen?: boolean
//     open?: boolean
//     onToggle?: (next: boolean) => void
// }) {
//     const [internalOpen, setInternalOpen] = useState(defaultOpen)
//     const isControlled = typeof open === 'boolean'
//     const isOpen = isControlled ? open : internalOpen

//     const toggle = () => {
//         if (isControlled) onToggle?.(!open)
//         else setInternalOpen((o) => !o)
//     }

//     return (
//         <div className="w-full">
//             <button
//                 type="button"
//                 aria-expanded={isOpen}
//                 onClick={toggle}
//                 className={`
//           w-full flex items-center justify-between
//           rounded-full px-5 py-3 mb-2
//           text-sm font-medium
//           bg-neutral-300 text-neutral-800
//           hover:bg-neutral-400
//           transition-colors duration-200
//           focus:outline-none focus:ring-2 focus:ring-neutral-400/60
//         `}
//             >
//                 <span>{title}</span>
//                 <ChevronDown
//                     className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
//                 />
//             </button>

//             <div
//                 className={`
//           overflow-hidden transition-[max-height,opacity,transform]
//           duration-300 ease-in-out
//           ${isOpen ? 'max-h-[1200px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-1'}
//         `}
//             >
//                 <div className="bg-neutral-100 rounded-2xl px-4 py-4 shadow-inner">
//                     {children}
//                 </div>
//             </div>
//         </div>
//     )
// }

// /* ---------- Env-only bases (no proxy/fallbacks) ---------- */
// const ILLU_BASE = (process.env.NEXT_PUBLIC_MOONBIRDS_ILLU_BASE || '').replace(/\/+$/, '')
// const PIXEL_BASE = (process.env.NEXT_PUBLIC_MOONBIRDS_PIXEL_BASE || '').replace(/\/+$/, '')

// function buildIllustratedUrl(id: string) {
//     const n = Number(id)
//     if (!Number.isFinite(n) || n < 1 || !ILLU_BASE) return ''
//     return `${ILLU_BASE}/${n}.png`
// }
// function buildPixelUrl(id: string) {
//     const n = Number(id)
//     if (!Number.isFinite(n) || n < 1 || !PIXEL_BASE) return ''
//     return `${PIXEL_BASE}/${n}.png`
// }

// /* ---------- Image loader (with cache + decode) ---------- */
// const imgCache = new Map<string, Promise<HTMLImageElement>>()

// function loadImageCached(src: string): Promise<HTMLImageElement> {
//     if (!src) return Promise.reject(new Error('empty src'))

//     if (!imgCache.has(src)) {
//         const p = new Promise<HTMLImageElement>((resolve, reject) => {
//             if (typeof window === 'undefined' || !window.Image) {
//                 reject(new Error('Image constructor not available'))
//                 return
//             }

//             const img = new window.Image()
//             img.crossOrigin = 'anonymous'
//             img.referrerPolicy = 'no-referrer'
//             img.onload = async () => {
//                 try {
//                     // ensure decoded; ignore if not available
//                     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//                     // @ ts-expect-error decode may not exist on older browsers
//                     if (img.decode) await img.decode()
//                 } catch { /* ignore */ }
//                 resolve(img)
//             }
//             img.onerror = () => reject(new Error(`Failed to load ${src}`))
//             img.src = src
//         })
//         imgCache.set(src, p)
//     }

//     return imgCache.get(src)!
// }

// /* ---------- Main component ---------- */
// export default function DeckComposer({ config }: { config: DeckComposerConfig }) {
//     const { grips, bottoms, jkDesigns = [], glyphs = [], glyphs2 = [] } = config
//     const hasJK = jkDesigns.length > 0

//     const initialGrip = useMemo(() => grips[0]!, [grips])
//     const initialBottomBG = useMemo(() => bottoms[0]!, [bottoms])
//     const initialJKId = jkDesigns[0]?.id ?? ''

//     // Mode: Custom (bg + optional glyph + optional token) vs JK (fixed art)
//     const [mode, setMode] = useState<BuildMode>(hasJK ? 'jk' : 'custom')

//     // Top / Bottom selections
//     const [gripId, setGripId] = useState<string>(initialGrip.id)
//     const [bottomBgId, setBottomBgId] = useState<string>(initialBottomBG.id)

//     // Glyph lists with “None” as first tile
//     const glyphs1WithNone = useMemo<GlyphOption[]>(
//         () => [{ id: 'none', name: 'None', image: '/deckAssets/moonbirds/none.png' }, ...glyphs],
//         [glyphs]
//     )
//     const glyphs2WithNone = useMemo<GlyphOption[]>(
//         () => [{ id: 'none', name: 'None', image: '/deckAssets/moonbirds/none.png' }, ...glyphs2],
//         [glyphs2]
//     )

//     // Glyph selections
//     const [glyphId1, setGlyphId1] = useState<string>('none')
//     const [glyphTint1, setGlyphTint1] = useState('#ff1a1a')

//     const [glyphId2, setGlyphId2] = useState<string>('none')
//     const [glyphTint2, setGlyphTint2] = useState('#ffffff')

//     const selectedGlyph1 = glyphs1WithNone.find((g) => g.id === glyphId1) ?? glyphs1WithNone[0]
//     const selectedGlyph2 = glyphs2WithNone.find((g) => g.id === glyphId2) ?? glyphs2WithNone[0]

//     // Token controls (custom mode)
//     const [tokenId, setTokenId] = useState<string>('') // moonbird ID
//     const [style, setStyle] = useState<'illustrated' | 'pixel'>('illustrated')
//     const layout: LayoutMode = 'horizontalLeft'

//     // Custom controls
//     const [tokenScale, setTokenScale] = useState<number>(3.25)
//     const [offsetX, setOffsetX] = useState<number>(-40)
//     const [offsetY, setOffsetY] = useState<number>(60)
//     const nudgeValue = 100

//     // JK-mode state
//     const [jkId, setJkId] = useState<string>(initialJKId)

//     // Which accordion is open (one-at-a-time)
//     const [openId, setOpenId] = useState<string>('grip')

//     // Output for viewer
//     const [bottomPreviewUrl, setBottomPreviewUrl] = useState<string>(initialBottomBG.image)

//     // Selections
//     const selectedGrip = grips.find((g) => g.id === gripId) ?? initialGrip
//     const selectedBottomBG = bottoms.find((b) => b.id === bottomBgId) ?? initialBottomBG
//     const selectedJK = jkDesigns.find((j) => j.id === jkId) ?? jkDesigns[0]

//     // Offscreen canvas
//     const canvasRef = useRef<HTMLCanvasElement | null>(null)
//     useEffect(() => {
//         if (!canvasRef.current && typeof document !== 'undefined') {
//             canvasRef.current = document.createElement('canvas')
//         }
//     }, [])

//     /* ---------- WARM THE CACHE ---------- */
//     useEffect(() => {
//         const urls: string[] = [selectedBottomBG.image, selectedGrip.image]

//         if (glyphId1 !== 'none' && selectedGlyph1.image) urls.push(selectedGlyph1.image)
//         if (glyphId2 !== 'none' && selectedGlyph2.image) urls.push(selectedGlyph2.image)

//         // Pre-warm a few likely next choices
//         bottoms.slice(0, 4).forEach((b) => urls.push(b.image))
//         glyphs.slice(0, 2).forEach((g) => urls.push(g.image))
//         glyphs2.slice(0, 2).forEach((g) => urls.push(g.image))

//         urls.forEach((u) => {
//             if (u) loadImageCached(u).catch(() => { })
//         })
//     }, [
//         bottoms,
//         glyphs,
//         glyphs2,
//         selectedBottomBG.image,
//         selectedGrip.image,
//         glyphId1,
//         selectedGlyph1?.image,
//         glyphId2,
//         selectedGlyph2?.image,
//     ])

//     /* ---------- COMPOSITOR (draw offscreen, swap after ready) ---------- */
//     useEffect(() => {
//         let cancelled = false

//         const buildBottom = async () => {
//             try {
//                 // JK mode: just use fixed art (preload + swap)
//                 if (mode === 'jk' && selectedJK?.image) {
//                     await loadImageCached(selectedJK.image)
//                     if (!cancelled) setBottomPreviewUrl(selectedJK.image)
//                     return
//                 }

//                 // CUSTOM MODE
//                 const bgSrc = selectedBottomBG.image
//                 const glyph1Src = glyphId1 !== 'none' && selectedGlyph1.image ? selectedGlyph1.image : ''
//                 const glyph2Src = glyphId2 !== 'none' && selectedGlyph2.image ? selectedGlyph2.image : ''

//                 const wantPixel = style === 'pixel'
//                 const tokenSrc =
//                     tokenId ? (wantPixel ? buildPixelUrl(tokenId) : buildIllustratedUrl(tokenId)) : ''

//                 // Load sequentially to keep types simple & clear
//                 const bgImg = await loadImageCached(bgSrc)
//                 const glyph1Img = glyph1Src ? await loadImageCached(glyph1Src) : null
//                 const glyph2Img = glyph2Src ? await loadImageCached(glyph2Src) : null
//                 const tokenImg = tokenSrc ? await loadImageCached(tokenSrc) : null

//                 const c = canvasRef.current
//                 if (!c) return
//                 const ctx = c.getContext('2d')
//                 if (!ctx) return

//                 const W = bgImg.naturalWidth || bgImg.width || 1600
//                 const H = bgImg.naturalHeight || bgImg.height || 1600
//                 c.width = W
//                 c.height = H

//                 ctx.clearRect(0, 0, W, H)

//                 // 1) Background
//                 ctx.drawImage(bgImg, 0, 0, W, H)

//                 // helper to cover-fit + tint
//                 const drawTintedGlyph = (img: HTMLImageElement, tint: string) => {
//                     const gSrcW = img.naturalWidth || img.width
//                     const gSrcH = img.naturalHeight || img.height
//                     const scale = Math.max(W / gSrcW, H / gSrcH)
//                     const gW = Math.round(gSrcW * scale)
//                     const gH = Math.round(gSrcH * scale)
//                     const gX = Math.round((W - gW) / 2)
//                     const gY = Math.round((H - gH) / 2)

//                     const tmp = document.createElement('canvas')
//                     tmp.width = Math.max(1, gW)
//                     tmp.height = Math.max(1, gH)
//                     const tctx = tmp.getContext('2d')
//                     if (!tctx) return
//                     tctx.imageSmoothingEnabled = true
//                     tctx.drawImage(img, 0, 0, gW, gH)
//                     tctx.globalCompositeOperation = 'source-in'
//                     tctx.fillStyle = tint
//                     tctx.fillRect(0, 0, gW, gH)
//                     tctx.globalCompositeOperation = 'source-over'
//                     ctx.drawImage(tmp, gX, gY)
//                 }

//                 // 2) Glyph layer 1 (under)
//                 if (glyph1Src && glyph1Img) drawTintedGlyph(glyph1Img, glyphTint1)
//                 // 3) Glyph layer 2 (over)
//                 if (glyph2Src && glyph2Img) drawTintedGlyph(glyph2Img, glyphTint2)

//                 // 4) Token (top)
//                 if (tokenSrc && tokenImg) {
//                     const srcW = tokenImg.naturalWidth || tokenImg.width
//                     const srcH = tokenImg.naturalHeight || tokenImg.height

//                     const wantHorizontal = layout === 'horizontalLeft'
//                     const baseWidthRatio =
//                         style === 'pixel'
//                             ? wantHorizontal
//                                 ? 0.5
//                                 : 0.55
//                             : wantHorizontal
//                                 ? 0.38
//                                 : 0.42

//                     const scaleMul = Math.max(0.05, Math.min(10, tokenScale))
//                     const tW = W * baseWidthRatio * scaleMul
//                     const tH = srcH * (tW / srcW)

//                     const HSTART = { cx: 675, cy: 700 }

//                     if (wantHorizontal) {
//                         const cx = Math.round(HSTART.cx + offsetX)
//                         const cy = Math.round(HSTART.cy + offsetY)

//                         const prev = ctx.imageSmoothingEnabled
//                         ctx.imageSmoothingEnabled = !(style === 'pixel')
//                         ctx.save()
//                         ctx.translate(cx, cy)
//                         ctx.rotate(Math.PI / 2) // 90° clockwise
//                         ctx.drawImage(tokenImg, -tW / 2, -tH / 2, tW, tH)
//                         ctx.restore()
//                         ctx.imageSmoothingEnabled = prev
//                     } else {
//                         const baseDx = Math.round((W - tW) / 2)
//                         const baseDy = Math.round(H - tH - H * 0.06)
//                         const dx = baseDx + Math.round(offsetX)
//                         const dy = baseDy + Math.round(offsetY)

//                         const prev = ctx.imageSmoothingEnabled
//                         ctx.imageSmoothingEnabled = !(style === 'pixel')
//                         ctx.drawImage(tokenImg, dx, dy, tW, tH)
//                         ctx.imageSmoothingEnabled = prev
//                     }
//                 }

//                 // finalize (swap)
//                 const url = c.toDataURL('image/png')
//                 if (!cancelled) setBottomPreviewUrl(url)
//             } catch {
//                 // keep previous image to avoid flicker
//                 if (!cancelled) setBottomPreviewUrl((prev) => prev)
//             }
//         }

//         buildBottom()
//         return () => {
//             cancelled = true
//         }
//     }, [
//         mode,
//         selectedJK?.image,
//         selectedBottomBG.image,
//         // glyph 1
//         glyphId1,
//         glyphTint1,
//         selectedGlyph1?.image,
//         // glyph 2
//         glyphId2,
//         glyphTint2,
//         selectedGlyph2?.image,
//         // token & layout
//         tokenId,
//         style,
//         tokenScale,
//         offsetX,
//         offsetY,
//         layout,
//     ])

//     // helpers
//     const bump = (setter: React.Dispatch<React.SetStateAction<number>>, delta: number) => {
//         setter((v) => v + delta)
//     }

//     const controlsDisabled = mode === 'jk'

//     return (
//         <div className="grid gap-6 sm:grid-cols-[380px_minmax(0,1fr)] items-stretch">
//             {/* Settings (left) */}
//             <aside className="h-full lg:sticky lg:top-6 h-fit p-2 lg:p-4">
//                 <div className="space-y-3">
//                     {/* Mode (JK vs Custom) — always visible */}
//                     {hasJK && (
//                         <div className="inline-flex rounded-full bg-neutral-200 p-1">
//                             <button
//                                 type="button"
//                                 onClick={() => setMode('jk')}
//                                 className={`px-5 py-2 text-sm font-medium rounded-full transition-all duration-200
//                   ${mode === 'jk' ? 'bg-[#d12429] text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-300'}
//                 `}
//                             >
//                                 JK Designs
//                             </button>
//                             <button
//                                 type="button"
//                                 onClick={() => setMode('custom')}
//                                 className={`
//                   px-5 py-2 text-sm font-medium rounded-full transition-all duration-200
//                   ${mode === 'custom' ? 'bg-[#d12429] text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-300'}
//                 `}
//                             >
//                                 Custom
//                             </button>
//                         </div>
//                     )}

//                     {/* One-open-only accordions */}
//                     <div key={`accordion-stack-${mode}`}>
//                         {/* 1) Grip */}
//                         <AccordionSection
//                             title="Grip Tape"
//                             open={openId === 'grip'}
//                             onToggle={(next) => setOpenId(next ? 'grip' : '')}
//                         >
//                             <OptionsGrid>
//                                 {bottoms.map((b) => (
//                                     <OptionTile
//                                         key={b.id}
//                                         label={b.name}
//                                         image={b.type === 'image' ? b.image : undefined}
//                                         color={b.type === 'color' ? b.color : undefined}
//                                         selected={bottomBgId === b.id}
//                                         onClick={() => setBottomBgId(b.id)}
//                                     />
//                                 ))}
//                             </OptionsGrid>
//                         </AccordionSection>

//                         {/* 2) Custom-only accordions */}
//                         {mode === 'custom' && (
//                             <>
//                                 <AccordionSection
//                                     title="Bottom Background"
//                                     open={openId === 'bg'}
//                                     onToggle={(next) => setOpenId(next ? 'bg' : '')}
//                                 >
//                                     <OptionsGrid>
//                                         {bottoms.map((b) => (
//                                             <OptionTile
//                                                 key={b.id}
//                                                 label={b.name}
//                                                 image={b.image}
//                                                 selected={bottomBgId === b.id}
//                                                 onClick={() => setBottomBgId(b.id)}
//                                             />
//                                         ))}
//                                     </OptionsGrid>
//                                 </AccordionSection>

//                                 {/* Glyph Layer 1 */}
//                                 <AccordionSection
//                                     title="Glyph Layer 1"
//                                     open={openId === 'glyph1'}
//                                     onToggle={(next) => setOpenId(next ? 'glyph1' : '')}
//                                 >
//                                     <div className="space-y-3">
//                                         <OptionsGrid>
//                                             {glyphs1WithNone.map((g) => (
//                                                 <OptionTile
//                                                     key={`g1-${g.id}`}
//                                                     label={g.name}
//                                                     image={g.image}
//                                                     selected={glyphId1 === g.id}
//                                                     onClick={() => setGlyphId1(g.id)}
//                                                 />
//                                             ))}
//                                         </OptionsGrid>

//                                         {glyphId1 !== 'none' && (
//                                             <Field labelText="Glyph 1 Tint">
//                                                 <input
//                                                     type="color"
//                                                     value={glyphTint1}
//                                                     onChange={(e) => setGlyphTint1(e.target.value)}
//                                                 />
//                                             </Field>
//                                         )}
//                                     </div>
//                                 </AccordionSection>

//                                 {/* Glyph Layer 2 */}
//                                 <AccordionSection
//                                     title="Glyph Layer 2"
//                                     open={openId === 'glyph2'}
//                                     onToggle={(next) => setOpenId(next ? 'glyph2' : '')}
//                                 >
//                                     <div className="space-y-3">
//                                         <OptionsGrid>
//                                             {glyphs2WithNone.map((g) => (
//                                                 <OptionTile
//                                                     key={`g2-${g.id}`}
//                                                     label={g.name}
//                                                     image={g.image}
//                                                     selected={glyphId2 === g.id}
//                                                     onClick={() => setGlyphId2(g.id)}
//                                                 />
//                                             ))}
//                                         </OptionsGrid>

//                                         {glyphId2 !== 'none' && (
//                                             <Field labelText="Glyph 2 Tint">
//                                                 <input
//                                                     type="color"
//                                                     value={glyphTint2}
//                                                     onChange={(e) => setGlyphTint2(e.target.value)}
//                                                 />
//                                             </Field>
//                                         )}
//                                     </div>
//                                 </AccordionSection>

//                                 {/* Token */}
//                                 <AccordionSection
//                                     title="Moonbird Token"
//                                     open={openId === 'token'}
//                                     onToggle={(next) => setOpenId(next ? 'token' : '')}
//                                 >
//                                     <div className="space-y-4">
//                                         <Field labelText="Token ID">
//                                             <div className="flex flex-wrap items-center gap-2">
//                                                 <input
//                                                     className="input w-36"
//                                                     type="number"
//                                                     placeholder="e.g. 8209"
//                                                     min={1}
//                                                     value={tokenId}
//                                                     onChange={(e) => setTokenId(e.target.value.trim())}
//                                                     disabled={controlsDisabled}
//                                                 />
//                                                 <div className="flex gap-1">
//                                                     <button
//                                                         type="button"
//                                                         className={`btn ${style === 'illustrated' ? 'btn-primary' : 'btn-ghost'}`}
//                                                         onClick={() => setStyle('illustrated')}
//                                                         disabled={!ILLU_BASE || controlsDisabled}
//                                                         title={ILLU_BASE ? 'Use illustrated' : 'Set NEXT_PUBLIC_MOONBIRDS_ILLU_BASE'}
//                                                     >
//                                                         Illustrated
//                                                     </button>
//                                                     <button
//                                                         type="button"
//                                                         className={`btn ${style === 'pixel' ? 'btn-primary' : 'btn-ghost'}`}
//                                                         onClick={() => setStyle('pixel')}
//                                                         disabled={!PIXEL_BASE || controlsDisabled}
//                                                         title={PIXEL_BASE ? 'Use pixel' : 'Set NEXT_PUBLIC_MOONBIRDS_PIXEL_BASE'}
//                                                     >
//                                                         Pixel
//                                                     </button>
//                                                 </div>
//                                             </div>
//                                             <p className="text-xs text-neutral-500">
//                                                 Token is composited onto the selected background.
//                                             </p>
//                                         </Field>

//                                         <Field labelText="Token Scale">
//                                             <div className="flex items-center gap-2">
//                                                 <input
//                                                     className="input w-28"
//                                                     type="number"
//                                                     step={0.25}
//                                                     min={0.25}
//                                                     max={10}
//                                                     value={tokenScale}
//                                                     onChange={(e) => {
//                                                         const n = Number(e.target.value)
//                                                         setTokenScale(Number.isFinite(n) ? Math.max(0.05, Math.min(10, n)) : 1)
//                                                     }}
//                                                     title="Multiply the base size"
//                                                 />
//                                                 <input
//                                                     className="w-full accent-neutral-800"
//                                                     type="range"
//                                                     min={0.25}
//                                                     max={5}
//                                                     step={0.25}
//                                                     value={tokenScale}
//                                                     onChange={(e) => setTokenScale(Number(e.target.value))}
//                                                     title="Drag to scale"
//                                                 />
//                                                 <button
//                                                     type="button"
//                                                     className="btn btn-ghost"
//                                                     onClick={() => setTokenScale(1)}
//                                                     title="Reset"
//                                                 >
//                                                     Reset
//                                                 </button>
//                                             </div>
//                                         </Field>

//                                         <Field labelText="Nudge Position">
//                                             <div className="grid grid-cols-3 gap-2 w-[220px]">
//                                                 <div />
//                                                 {/* Up */}
//                                                 <button
//                                                     type="button"
//                                                     className="btn"
//                                                     onClick={() => bump(setOffsetY, -nudgeValue)}
//                                                     title="Up"
//                                                 >
//                                                     ↑
//                                                 </button>
//                                                 <div />
//                                                 {/* Left */}
//                                                 <button
//                                                     type="button"
//                                                     className="btn"
//                                                     onClick={() => bump(setOffsetX, -nudgeValue)}
//                                                     title="Left"
//                                                 >
//                                                     ←
//                                                 </button>
//                                                 {/* Center */}
//                                                 <button
//                                                     type="button"
//                                                     className="btn btn-ghost"
//                                                     onClick={() => {
//                                                         setOffsetX(0)
//                                                         setOffsetY(0)
//                                                     }}
//                                                     title="Center"
//                                                 >
//                                                     •
//                                                 </button>
//                                                 {/* Right */}
//                                                 <button
//                                                     type="button"
//                                                     className="btn"
//                                                     onClick={() => bump(setOffsetX, nudgeValue)}
//                                                     title="Right"
//                                                 >
//                                                     →
//                                                 </button>
//                                                 <div />
//                                                 {/* Down */}
//                                                 <button
//                                                     type="button"
//                                                     className="btn"
//                                                     onClick={() => bump(setOffsetY, nudgeValue)}
//                                                     title="Down"
//                                                 >
//                                                     ↓
//                                                 </button>
//                                                 <div />
//                                             </div>
//                                             <div className="flex items-center gap-3 pt-2 text-xs text-neutral-600">
//                                                 <span>X: {offsetX}px</span>
//                                                 <span>Y: {offsetY}px</span>
//                                                 <button
//                                                     type="button"
//                                                     className="btn btn-ghost btn-sm"
//                                                     onClick={() => {
//                                                         setOffsetX(0)
//                                                         setOffsetY(0)
//                                                     }}
//                                                 >
//                                                     Reset
//                                                 </button>
//                                             </div>
//                                         </Field>
//                                     </div>
//                                 </AccordionSection>
//                             </>
//                         )}

//                         {/* 3) JK-only */}
//                         {mode === 'jk' && hasJK && (
//                             <AccordionSection
//                                 title="JK Design"
//                                 open={openId === 'jk'}
//                                 onToggle={(next) => setOpenId(next ? 'jk' : '')}
//                             >
//                                 <Field labelText="Design">
//                                     <select
//                                         className="input"
//                                         value={jkId}
//                                         onChange={(e) => setJkId(e.target.value)}
//                                     >
//                                         {jkDesigns.map((d) => (
//                                             <option key={d.id} value={d.id}>
//                                                 {d.name}
//                                             </option>
//                                         ))}
//                                     </select>
//                                     <p className="text-xs text-neutral-500">
//                                         Fixed artwork; token and glyph controls are hidden.
//                                     </p>
//                                 </Field>
//                             </AccordionSection>
//                         )}
//                     </div>

//                     <div className="text-xs text-neutral-500 pt-2">
//                         Preview is web-resolution; final print assets are prepared offline.
//                     </div>
//                 </div>
//             </aside>

//             {/* Preview (right) */}
//             <section className="rounded-2xl border shadow-sm p-4 lg:p-5">
//                 <div className="rounded-xl bg-white overflow-hidden">
//                     <DeckViewerMinimal topUrl={selectedGrip.image} bottomUrl={bottomPreviewUrl} />
//                 </div>
//             </section>
//         </div>
//     )
// }

// // // src/components/DeckComposer.tsx
// // 'use client'

// // import { useEffect, useMemo, useRef, useState } from 'react'
// // import Image from 'next/image'
// // import NextImage from 'next/image'
// // import DeckViewerMinimal from './DeckViewerMinimal'
// // import { ChevronDown } from 'lucide-react'

// // /* ---------- Types ---------- */
// // export type GripOption = { id: string; name: string; image: string }
// // export type BottomOption = { id: string; name: string; image: string }

// // /** Fixed designs used as-is (no token overlay) */
// // export type JKDesign = { id: string; name: string; image: string }
// // export type GlyphOption = { id: string; name: string; image: string }

// // export type DeckComposerConfig = {
// //     collectionKey: string
// //     grips: GripOption[]
// //     bottoms: BottomOption[]              // backgrounds for Custom mode
// //     glyphs?: GlyphOption[]               // optional glyph overlay choices (PNG with transparency)
// //     jkDesigns?: JKDesign[]               // fixed bottoms (no edits)
// // }

// // type LayoutMode = 'verticalTail' | 'horizontalLeft'
// // type BuildMode = 'custom' | 'jk'

// // /* ---------- Small UI helpers ---------- */
// // function Field({
// //     labelText,
// //     children,
// //     className,
// // }: {
// //     labelText: string
// //     children: React.ReactNode
// //     className?: string
// // }) {
// //     return (
// //         <label className={`flex flex-col gap-2 ${className ?? ''}`}>
// //             <span className="text-sm font-medium">{labelText}</span>
// //             {children}
// //         </label>
// //     )
// // }

// // function OptionTile({
// //     image,
// //     label,
// //     selected,
// //     onClick,
// // }: {
// //     image: string
// //     label: string
// //     selected?: boolean
// //     onClick: () => void
// // }) {
// //     return (
// //         <button
// //             type="button"
// //             onClick={onClick}
// //             className={[
// //                 'flex flex-col items-center justify-start',
// //                 'rounded-xl bg-white border border-neutral-200 p-2',
// //                 'transition hover:border-neutral-300',
// //                 'overflow-hidden',
// //                 selected ? 'shadow-[inset_0_0_0_2px_#111]' : 'shadow-none',
// //             ].join(' ')}
// //         >
// //             {/* inset thumbnail box */}
// //             <div className="w-14 h-14 rounded-md overflow-hidden bg-neutral-100 relative">
// //                 <Image
// //                     src={image}
// //                     alt={label}
// //                     fill
// //                     sizes="56px"
// //                     style={{ objectFit: 'cover' }}
// //                     priority={false}
// //                 />
// //             </div>

// //             {/* consistent label spacing */}
// //             <div className="mt-2 text-xs text-center leading-tight line-clamp-2 h-[2.25rem]">
// //                 {label}
// //             </div>
// //         </button>
// //     )
// // }

// // function OptionsGrid({ children }: { children: React.ReactNode }) {
// //     return (
// //         <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
// //             {children}
// //         </div>
// //     )
// // }

// // /** Minimal accordion (Apple-like “pill” behavior) */

// // /** Minimal accordion (Apple-like “pill” behavior) — controlled or uncontrolled */
// // export function AccordionSection({
// //     title,
// //     children,
// //     defaultOpen = false,
// //     open,                 // <- optional controlled
// //     onToggle,             // <- optional controlled
// // }: {
// //     title: string
// //     children: React.ReactNode
// //     defaultOpen?: boolean
// //     open?: boolean
// //     onToggle?: (next: boolean) => void
// // }) {
// //     const [internalOpen, setInternalOpen] = useState(defaultOpen)
// //     const isControlled = typeof open === 'boolean'
// //     const isOpen = isControlled ? open : internalOpen

// //     const toggle = () => {
// //         if (isControlled) onToggle?.(!open)
// //         else setInternalOpen(o => !o)
// //     }

// //     return (
// //         <div className="w-full">
// //             <button
// //                 type="button"
// //                 aria-expanded={isOpen}
// //                 onClick={toggle}
// //                 className={`
// //           w-full flex items-center justify-between
// //           rounded-full px-5 py-3 mb-2
// //           text-sm font-medium
// //           bg-neutral-300 text-neutral-800
// //           hover:bg-neutral-400
// //           transition-colors duration-200
// //           focus:outline-none focus:ring-2 focus:ring-neutral-400/60
// //         `}
// //             >
// //                 <span>{title}</span>
// //                 <ChevronDown
// //                     className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
// //                 />
// //             </button>

// //             <div
// //                 className={`
// //           overflow-hidden transition-[max-height,opacity,transform]
// //           duration-300 ease-in-out
// //           ${isOpen ? 'max-h-[1200px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-1'}
// //         `}
// //             >
// //                 <div className="bg-neutral-100 rounded-2xl px-4 py-4 shadow-inner">
// //                     {children}
// //                 </div>
// //             </div>
// //         </div>
// //     )
// // }
// // // export function AccordionSection({
// // //     title,
// // //     children,
// // //     defaultOpen = false,
// // // }: {
// // //     title: string
// // //     children: React.ReactNode
// // //     defaultOpen?: boolean
// // // }) {
// // //     const [open, setOpen] = useState(defaultOpen)

// // //     return (
// // //         <div className="w-full">
// // //             {/* Header: darker gray, full pill */}
// // //             <button
// // //                 type="button"
// // //                 aria-expanded={open}
// // //                 onClick={() => setOpen((o) => !o)}
// // //                 className={`
// // //           w-full flex items-center justify-between
// // //           rounded-full px-5 py-3 mb-2
// // //           text-sm font-medium
// // //           bg-neutral-300 text-neutral-800
// // //           hover:bg-neutral-400
// // //           transition-colors duration-200
// // //           focus:outline-none focus:ring-2 focus:ring-neutral-400/60
// // //         `}
// // //             >
// // //                 <span>{title}</span>
// // //                 <ChevronDown
// // //                     className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
// // //                 />
// // //             </button>

// // //             {/* Content */}
// // //             <div
// // //                 className={`
// // //           overflow-hidden transition-[max-height,opacity,transform]
// // //           duration-300 ease-in-out
// // //           ${open ? 'max-h-[1200px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-1'}
// // //         `}
// // //             >
// // //                 <div
// // //                     className={`
// // //             bg-neutral-100 rounded-2xl
// // //             px-4 py-4
// // //             shadow-inner
// // //           `}
// // //                 >
// // //                     {children}
// // //                 </div>
// // //             </div>
// // //         </div>
// // //     )
// // // }

// // /* ---------- Env-only bases (no proxy/fallbacks) ---------- */
// // const ILLU_BASE = (process.env.NEXT_PUBLIC_MOONBIRDS_ILLU_BASE || '').replace(/\/+$/, '')
// // const PIXEL_BASE = (process.env.NEXT_PUBLIC_MOONBIRDS_PIXEL_BASE || '').replace(/\/+$/, '')

// // function buildIllustratedUrl(id: string) {
// //     const n = Number(id)
// //     if (!Number.isFinite(n) || n < 1 || !ILLU_BASE) return ''
// //     return `${ILLU_BASE}/${n}.png`
// // }
// // function buildPixelUrl(id: string) {
// //     const n = Number(id)
// //     if (!Number.isFinite(n) || n < 1 || !PIXEL_BASE) return ''
// //     return `${PIXEL_BASE}/${n}.png`
// // }

// // /* ---------- Image loader (with cache + decode) ---------- */
// // const imgCache = new Map<string, Promise<HTMLImageElement>>()

// // function loadImageCached(src: string): Promise<HTMLImageElement> {
// //     if (!src) return Promise.reject(new Error('empty src'))

// //     if (!imgCache.has(src)) {
// //         const p = new Promise<HTMLImageElement>((resolve, reject) => {
// //             if (typeof window === 'undefined' || !window.Image) {
// //                 reject(new Error('Image constructor not available'))
// //                 return
// //             }

// //             const img = new window.Image() // <— use the DOM constructor explicitly
// //             img.crossOrigin = 'anonymous'
// //             img.referrerPolicy = 'no-referrer'
// //             img.onload = async () => {
// //                 try {
// //                     if (img.decode) await img.decode()
// //                 } catch {
// //                     // ignore decode errors; the image is still usable after onload
// //                 }
// //                 resolve(img)
// //             }
// //             img.onerror = reject
// //             img.src = src
// //         })
// //         imgCache.set(src, p)
// //     }

// //     return imgCache.get(src)!
// // }

// // /* ---------- Main component ---------- */
// // export default function DeckComposer({ config }: { config: DeckComposerConfig }) {
// //     const { grips, bottoms, jkDesigns = [], glyphs = [] } = config
// //     const hasJK = jkDesigns.length > 0

// //     const initialGrip = useMemo(() => grips[0]!, [grips])
// //     const initialBottomBG = useMemo(() => bottoms[0]!, [bottoms])
// //     const initialJKId = jkDesigns[0]?.id ?? ''

// //     // Mode: Custom (bg + optional glyph + optional token) vs JK (fixed art)
// //     const [mode, setMode] = useState<BuildMode>(hasJK ? 'jk' : 'custom')

// //     // Top / Bottom selections
// //     const [gripId, setGripId] = useState<string>(initialGrip.id)
// //     const [bottomBgId, setBottomBgId] = useState<string>(initialBottomBG.id)

// //     // Glyph choice
// //     const glyphsWithNone = useMemo<GlyphOption[]>(
// //         () => [{ id: 'none', name: 'None', image: '/deckAssets/moonbirds/none.png' }, ...glyphs],
// //         [glyphs]
// //     )
// //     const [glyphId, setGlyphId] = useState<string>('none')
// //     const [glyphTint, setGlyphTint] = useState('#ff1a1a')

// //     // Token controls (custom mode)
// //     const [tokenId, setTokenId] = useState<string>('') // moonbird ID
// //     // We don’t expose layout controls right now; keep a fixed layout:
// //     const layout: LayoutMode = 'horizontalLeft'

// //     // Custom controls
// //     const [tokenScale, setTokenScale] = useState<number>(3.25)
// //     const [offsetX, setOffsetX] = useState<number>(-40)
// //     const [offsetY, setOffsetY] = useState<number>(60)
// //     const nudgeValue = 100
// //     const [style, setStyle] = useState<'illustrated' | 'pixel'>('illustrated')

// //     // JK-mode state
// //     const [jkId, setJkId] = useState<string>(initialJKId)

// //     const [openId, setOpenId] = useState<string>('grip')

// //     // Output for viewer
// //     const [bottomPreviewUrl, setBottomPreviewUrl] = useState<string>(initialBottomBG.image)

// //     // Selections
// //     const selectedGrip = grips.find((g) => g.id === gripId) ?? initialGrip
// //     const selectedBottomBG = bottoms.find((b) => b.id === bottomBgId) ?? initialBottomBG
// //     const selectedJK = jkDesigns.find((j) => j.id === jkId) ?? jkDesigns[0]
// //     const selectedGlyph = glyphsWithNone.find((g) => g.id === glyphId) ?? glyphsWithNone[0]

// //     // Offscreen canvas
// //     const canvasRef = useRef<HTMLCanvasElement | null>(null)
// //     if (!canvasRef.current && typeof document !== 'undefined') {
// //         canvasRef.current = document.createElement('canvas')
// //     }

// //     /* ---------- WARM THE CACHE ---------- */
// //     useEffect(() => {
// //         const urls: string[] = [selectedBottomBG.image, selectedGrip.image]
// //         if (glyphId !== 'none' && selectedGlyph.image) urls.push(selectedGlyph.image)

// //         // Pre-warm a few likely next choices
// //         bottoms.slice(0, 4).forEach((b) => urls.push(b.image))
// //         glyphs.slice(0, 2).forEach((g) => urls.push(g.image))

// //         urls.forEach((u) => {
// //             if (u) loadImageCached(u).catch(() => { })
// //         })
// //     }, [bottoms, glyphs, selectedBottomBG.image, selectedGrip.image, glyphId, selectedGlyph?.image])

// //     /* ---------- COMPOSITOR ---------- */
// //     useEffect(() => {
// //         let cancelled = false

// //         async function buildBottom() {
// //             try {
// //                 // JK mode: preload + swap
// //                 if (mode === 'jk' && selectedJK?.image) {
// //                     await loadImageCached(selectedJK.image)
// //                     if (!cancelled) setBottomPreviewUrl(selectedJK.image)
// //                     return
// //                 }

// //                 // CUSTOM mode: determine sources first
// //                 const bgSrc = selectedBottomBG.image
// //                 const glyphSrc = glyphId !== 'none' && selectedGlyph.image ? selectedGlyph.image : ''

// //                 const wantPixel = style === 'pixel'
// //                 const tokenSrc = tokenId
// //                     ? wantPixel
// //                         ? buildPixelUrl(tokenId)
// //                         : buildIllustratedUrl(tokenId)
// //                     : ''

// //                 // Load all in parallel (allow nullables cleanly)
// //                 const [bgImg, glyphImg, tokenImg] = await Promise.all([
// //                     loadImageCached(bgSrc),
// //                     glyphSrc ? loadImageCached(glyphSrc) : Promise.resolve(null),
// //                     tokenSrc ? loadImageCached(tokenSrc) : Promise.resolve(null),
// //                 ]) as [HTMLImageElement, HTMLImageElement | null, HTMLImageElement | null]
// //                 // Draw offscreen
// //                 const c = canvasRef.current
// //                 if (!c) return
// //                 const ctx = c.getContext('2d')
// //                 if (!ctx) return

// //                 const W = bgImg.naturalWidth || bgImg.width || 1600
// //                 const H = bgImg.naturalHeight || bgImg.height || 1600
// //                 c.width = W
// //                 c.height = H

// //                 ctx.clearRect(0, 0, W, H)

// //                 // 1) Background
// //                 ctx.drawImage(bgImg, 0, 0, W, H)

// //                 // 2) Glyph (tinted), if any
// //                 if (glyphSrc && glyphImg) {
// //                     const gSrcW = glyphImg.naturalWidth || glyphImg.width
// //                     const gSrcH = glyphImg.naturalHeight || glyphImg.height

// //                     // cover fit
// //                     const scale = Math.max(W / gSrcW, H / gSrcH)
// //                     const gW = Math.round(gSrcW * scale)
// //                     const gH = Math.round(gSrcH * scale)
// //                     const gX = Math.round((W - gW) / 2)
// //                     const gY = Math.round((H - gH) / 2)

// //                     // tint on temp canvas
// //                     const tmp = document.createElement('canvas')
// //                     tmp.width = Math.max(1, gW)
// //                     tmp.height = Math.max(1, gH)
// //                     const tctx = tmp.getContext('2d')
// //                     if (tctx) {
// //                         tctx.imageSmoothingEnabled = true
// //                         tctx.drawImage(glyphImg, 0, 0, gW, gH)
// //                         tctx.globalCompositeOperation = 'source-in'
// //                         tctx.fillStyle = glyphTint
// //                         tctx.fillRect(0, 0, gW, gH)
// //                         tctx.globalCompositeOperation = 'source-over'
// //                         ctx.drawImage(tmp, gX, gY)
// //                     }
// //                 }

// //                 // 3) Token, if any
// //                 if (tokenSrc && tokenImg) {
// //                     const srcW = tokenImg.naturalWidth || tokenImg.width
// //                     const srcH = tokenImg.naturalHeight || tokenImg.height

// //                     const wantHorizontal = layout === 'horizontalLeft'
// //                     const baseWidthRatio =
// //                         style === 'pixel'
// //                             ? wantHorizontal
// //                                 ? 0.5
// //                                 : 0.55
// //                             : wantHorizontal
// //                                 ? 0.38
// //                                 : 0.42

// //                     const scaleMul = Math.max(0.05, Math.min(10, tokenScale))
// //                     const tW = W * baseWidthRatio * scaleMul
// //                     const tH = srcH * (tW / srcW)

// //                     const HSTART = { cx: 675, cy: 700 }

// //                     if (wantHorizontal) {
// //                         const cx = Math.round(HSTART.cx + offsetX)
// //                         const cy = Math.round(HSTART.cy + offsetY)

// //                         const prev = ctx.imageSmoothingEnabled
// //                         ctx.imageSmoothingEnabled = !(style === 'pixel')
// //                         ctx.save()
// //                         ctx.translate(cx, cy)
// //                         ctx.rotate(Math.PI / 2) // 90° clockwise
// //                         ctx.drawImage(tokenImg, -tW / 2, -tH / 2, tW, tH)
// //                         ctx.restore()
// //                         ctx.imageSmoothingEnabled = prev
// //                     } else {
// //                         const baseDx = Math.round((W - tW) / 2)
// //                         const baseDy = Math.round(H - tH - H * 0.06)
// //                         const dx = baseDx + Math.round(offsetX)
// //                         const dy = baseDy + Math.round(offsetY)

// //                         const prev = ctx.imageSmoothingEnabled
// //                         ctx.imageSmoothingEnabled = !(style === 'pixel')
// //                         ctx.drawImage(tokenImg, dx, dy, tW, tH)
// //                         ctx.imageSmoothingEnabled = prev
// //                     }
// //                 }

// //                 // finalize
// //                 const url = c.toDataURL('image/png')
// //                 if (!cancelled) setBottomPreviewUrl(url)
// //             } catch {
// //                 if (!cancelled) setBottomPreviewUrl((prev) => prev) // keep previous to avoid flicker
// //             }
// //         }

// //         buildBottom()
// //         return () => {
// //             cancelled = true
// //         }
// //     }, [
// //         mode,
// //         selectedJK?.image,
// //         selectedBottomBG.image,
// //         glyphId,
// //         glyphTint,
// //         selectedGlyph?.image,
// //         tokenId,
// //         style,
// //         tokenScale,
// //         offsetX,
// //         offsetY,
// //         layout,
// //     ])

// //     // helpers
// //     const bump = (setter: React.Dispatch<React.SetStateAction<number>>, delta: number) => {
// //         setter((v) => v + delta)
// //     }

// //     const controlsDisabled = mode === 'jk'

// //     return (
// //         <div className="grid gap-6 sm:grid-cols-[380px_minmax(0,1fr)] items-stretch">
// //             {/* Settings (left) */}
// //             <aside className="h-full lg:sticky lg:top-6 h-fit p-2 lg:p-4">
// //                 <div className="space-y-3">
// //                     {/* Mode (JK vs Custom) — always visible */}
// //                     {hasJK && (
// //                         <div className="inline-flex rounded-full bg-neutral-200 p-1">
// //                             <button
// //                                 type="button"
// //                                 onClick={() => setMode('jk')}
// //                                 className={`px-5 py-2 text-sm font-medium rounded-full transition-all duration-200
// //                   ${mode === 'jk' ? 'bg-[#d12429] text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-300'}
// //                 `}
// //                             >
// //                                 JK Designs
// //                             </button>
// //                             <button
// //                                 type="button"
// //                                 onClick={() => setMode('custom')}
// //                                 className={`
// //                   px-5 py-2 text-sm font-medium rounded-full transition-all duration-200
// //                   ${mode === 'custom' ? 'bg-[#d12429] text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-300'}
// //                 `}
// //                             >
// //                                 Custom
// //                             </button>
// //                         </div>
// //                     )}

// //                     {/* Key the accordion stack by `mode` */}
// //                     <div key={`accordion-stack-${mode}`}>
// //                         {/* 1) Grip (open by default unless in JK mode you prefer closed) */}
// //                         <AccordionSection
// //                             title="Grip Tape"
// //                             open={openId === 'grip'}
// //                             onToggle={(next) => setOpenId(next ? 'grip' : '')}
// //                         >
// //                             <OptionsGrid>
// //                                 {grips.map((g) => (
// //                                     <OptionTile
// //                                         key={g.id}
// //                                         label={g.name}
// //                                         image={g.image}
// //                                         selected={gripId === g.id}
// //                                         onClick={() => setGripId(g.id)}
// //                                     />
// //                                 ))}
// //                             </OptionsGrid>
// //                         </AccordionSection>

// //                         {/* 2) Custom-only accordions */}
// //                         {mode === 'custom' && (
// //                             <>
// //                                 <AccordionSection title="Bottom Background"
// //                                     open={openId === 'bg'}
// //                                     onToggle={(next) => setOpenId(next ? 'bg' : '')}>
// //                                     <OptionsGrid>
// //                                         {bottoms.map((b) => (
// //                                             <OptionTile
// //                                                 key={b.id}
// //                                                 label={b.name}
// //                                                 image={b.image}
// //                                                 selected={bottomBgId === b.id}
// //                                                 onClick={() => setBottomBgId(b.id)}
// //                                             />
// //                                         ))}
// //                                     </OptionsGrid>
// //                                 </AccordionSection>

// //                                 <AccordionSection title="Glyph Layer"
// //                                     open={openId === 'glyph'}
// //                                     onToggle={(next) => setOpenId(next ? 'glyph' : '')}>
// //                                     <div className="space-y-3">
// //                                         <OptionsGrid>
// //                                             {glyphsWithNone.map((g) => (
// //                                                 <OptionTile
// //                                                     key={g.id}
// //                                                     label={g.name}
// //                                                     image={g.image}
// //                                                     selected={glyphId === g.id}
// //                                                     onClick={() => setGlyphId(g.id)}
// //                                                 />
// //                                             ))}
// //                                         </OptionsGrid>

// //                                         {glyphId !== 'none' && (
// //                                             <Field labelText="Glyph Tint">
// //                                                 <input
// //                                                     type="color"
// //                                                     value={glyphTint}
// //                                                     onChange={(e) => setGlyphTint(e.target.value)}
// //                                                 />
// //                                             </Field>
// //                                         )}
// //                                     </div>
// //                                 </AccordionSection>

// //                                 <AccordionSection title="Moonbird Token"
// //                                     open={openId === 'token'}
// //                                     onToggle={(next) => setOpenId(next ? 'token' : '')}>
// //                                     <div className="space-y-4">
// //                                         <Field labelText="Token ID">
// //                                             <div className="flex flex-wrap items-center gap-2">
// //                                                 <input
// //                                                     className="input w-36"
// //                                                     type="number"
// //                                                     placeholder="e.g. 8209"
// //                                                     min={1}
// //                                                     value={tokenId}
// //                                                     onChange={(e) => setTokenId(e.target.value.trim())}
// //                                                     disabled={controlsDisabled}
// //                                                 />
// //                                                 <div className="flex gap-1">
// //                                                     <button
// //                                                         type="button"
// //                                                         className={`btn ${style === 'illustrated' ? 'btn-primary' : 'btn-ghost'}`}
// //                                                         onClick={() => setStyle('illustrated')}
// //                                                         disabled={!ILLU_BASE || controlsDisabled}
// //                                                         title={ILLU_BASE ? 'Use illustrated' : 'Set NEXT_PUBLIC_MOONBIRDS_ILLU_BASE'}
// //                                                     >
// //                                                         Illustrated
// //                                                     </button>
// //                                                     <button
// //                                                         type="button"
// //                                                         className={`btn ${style === 'pixel' ? 'btn-primary' : 'btn-ghost'}`}
// //                                                         onClick={() => setStyle('pixel')}
// //                                                         disabled={!PIXEL_BASE || controlsDisabled}
// //                                                         title={PIXEL_BASE ? 'Use pixel' : 'Set NEXT_PUBLIC_MOONBIRDS_PIXEL_BASE'}
// //                                                     >
// //                                                         Pixel
// //                                                     </button>
// //                                                 </div>
// //                                             </div>
// //                                             <p className="text-xs text-neutral-500">
// //                                                 Token is composited onto the selected background.
// //                                             </p>
// //                                         </Field>

// //                                         <Field labelText="Token Scale">
// //                                             <div className="flex items-center gap-2">
// //                                                 <input
// //                                                     className="input w-28"
// //                                                     type="number"
// //                                                     step={0.25}
// //                                                     min={0.25}
// //                                                     max={10}
// //                                                     value={tokenScale}
// //                                                     onChange={(e) => {
// //                                                         const n = Number(e.target.value)
// //                                                         setTokenScale(Number.isFinite(n) ? Math.max(0.05, Math.min(10, n)) : 1)
// //                                                     }}
// //                                                     title="Multiply the base size"
// //                                                 />
// //                                                 <input
// //                                                     className="w-full accent-neutral-800"
// //                                                     type="range"
// //                                                     min={0.25}
// //                                                     max={5}
// //                                                     step={0.25}
// //                                                     value={tokenScale}
// //                                                     onChange={(e) => setTokenScale(Number(e.target.value))}
// //                                                     title="Drag to scale"
// //                                                 />
// //                                                 <button
// //                                                     type="button"
// //                                                     className="btn btn-ghost"
// //                                                     onClick={() => setTokenScale(1)}
// //                                                     title="Reset"
// //                                                 >
// //                                                     Reset
// //                                                 </button>
// //                                             </div>
// //                                         </Field>

// //                                         <Field labelText="Nudge Position">
// //                                             <div className="grid grid-cols-3 gap-2 w-[220px]">
// //                                                 <div />
// //                                                 {/* Up */}
// //                                                 <button
// //                                                     type="button"
// //                                                     className="btn"
// //                                                     onClick={() => bump(setOffsetX, nudgeValue)}
// //                                                     title="Up"
// //                                                 >
// //                                                     ↑
// //                                                 </button>
// //                                                 <div />
// //                                                 {/* Left */}
// //                                                 <button
// //                                                     type="button"
// //                                                     className="btn"
// //                                                     onClick={() => bump(setOffsetY, -nudgeValue)}
// //                                                     title="Left"
// //                                                 >
// //                                                     ←
// //                                                 </button>
// //                                                 {/* Center */}
// //                                                 <button
// //                                                     type="button"
// //                                                     className="btn btn-ghost"
// //                                                     onClick={() => {
// //                                                         setOffsetX(0)
// //                                                         setOffsetY(0)
// //                                                     }}
// //                                                     title="Center"
// //                                                 >
// //                                                     •
// //                                                 </button>
// //                                                 {/* Right */}
// //                                                 <button
// //                                                     type="button"
// //                                                     className="btn"
// //                                                     onClick={() => bump(setOffsetY, nudgeValue)}
// //                                                     title="Right"
// //                                                 >
// //                                                     →
// //                                                 </button>
// //                                                 <div />
// //                                                 {/* Down */}
// //                                                 <button
// //                                                     type="button"
// //                                                     className="btn"
// //                                                     onClick={() => bump(setOffsetX, -nudgeValue)}
// //                                                     title="Down"
// //                                                 >
// //                                                     ↓
// //                                                 </button>
// //                                                 <div />
// //                                             </div>
// //                                             <div className="flex items-center gap-3 pt-2 text-xs text-neutral-600">
// //                                                 <span>X: {offsetX}px</span>
// //                                                 <span>Y: {offsetY}px</span>
// //                                                 <button
// //                                                     type="button"
// //                                                     className="btn btn-ghost btn-sm"
// //                                                     onClick={() => {
// //                                                         setOffsetX(0)
// //                                                         setOffsetY(0)
// //                                                     }}
// //                                                 >
// //                                                     Reset
// //                                                 </button>
// //                                             </div>
// //                                         </Field>
// //                                     </div>
// //                                 </AccordionSection>
// //                             </>
// //                         )}

// //                         {/* 3) JK-only */}
// //                         {mode === 'jk' && hasJK && (
// //                             <AccordionSection title="JK Design"
// //                                 open={openId === 'jk'}
// //                                 onToggle={(next) => setOpenId(next ? 'jk' : '')}>
// //                                 <Field labelText="Design">
// //                                     <select
// //                                         className="input"
// //                                         value={jkId}
// //                                         onChange={(e) => setJkId(e.target.value)}
// //                                     >
// //                                         {jkDesigns.map((d) => (
// //                                             <option key={d.id} value={d.id}>
// //                                                 {d.name}
// //                                             </option>
// //                                         ))}
// //                                     </select>
// //                                     <p className="text-xs text-neutral-500">
// //                                         Fixed artwork; token and glyph controls are hidden.
// //                                     </p>
// //                                 </Field>
// //                             </AccordionSection>
// //                         )}
// //                     </div>

// //                     <div className="text-xs text-neutral-500 pt-2">
// //                         Preview is web-resolution; final print assets are prepared offline.
// //                     </div>
// //                 </div>
// //             </aside>

// //             {/* Preview (right) */}
// //             <section className="rounded-2xl border shadow-sm p-4 lg:p-5">
// //                 <div className="rounded-xl bg-white overflow-hidden">
// //                     <DeckViewerMinimal topUrl={selectedGrip.image} bottomUrl={bottomPreviewUrl} />
// //                 </div>
// //             </section>
// //         </div>
// //     )
// // }

