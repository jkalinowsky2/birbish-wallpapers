// src/components/DeckComposer.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import DeckViewerMinimal from './DeckViewerMinimal'

/* ---------- Types ---------- */
export type GripOption = { id: string; name: string; image: string }
export type BottomOption = { id: string; name: string; image: string }
export type JKDesign = { id: string; name: string; image: string }
export type GlyphOption = { id: string; name: string; image: string }

export type DeckComposerConfig = {
    collectionKey: string
    grips: GripOption[]
    bottoms: BottomOption[]              // backgrounds for Custom mode
    glyphs?: GlyphOption[]               // PNGs with transparency
    jkDesigns?: JKDesign[]               // fixed bottoms (no edits)
}

type LayoutMode = 'verticalTail' | 'horizontalLeft'
type BuildMode = 'custom' | 'jk'

/* ---------- Small UI helper ---------- */
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

/* ---------- Env-only bases (no proxy/fallbacks) ---------- */
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

/* ---------- Image loader ---------- */
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
    })
}

/* ---------- Main component ---------- */
export default function DeckComposer({ config }: { config: DeckComposerConfig }) {
    const { grips, bottoms, jkDesigns = [], glyphs = [] } = config
    const hasJK = jkDesigns.length > 0

    const initialGrip = useMemo(() => grips[0]!, [grips])
    const initialBottomBG = useMemo(() => bottoms[0]!, [bottoms])
    const [mode, setMode] = useState<BuildMode>(hasJK ? 'jk' : 'custom')

    // Selections
    const [gripId, setGripId] = useState<string>(initialGrip.id)
    const [bottomBgId, setBottomBgId] = useState<string>(initialBottomBG.id)
    const glyphsWithNone = useMemo<GlyphOption[]>(
        () => [{ id: 'none', name: 'None', image: '' }, ...glyphs],
        [glyphs]
    )
    const [glyphId, setGlyphId] = useState<string>('none')
    const [glyphTint, setGlyphTint] = useState<string>('#9c1d2a')

    // Token controls (custom)
    const [tokenId, setTokenId] = useState<string>('')
    const [style, setStyle] = useState<'illustrated' | 'pixel'>('illustrated')
    const [layout, setLayout] = useState<LayoutMode>('horizontalLeft')
    const [tokenScale, setTokenScale] = useState<number>(3.25)
    const [offsetX, setOffsetX] = useState<number>(-40)
    const [offsetY, setOffsetY] = useState<number>(60)
    const nudgeValue = 100

    // JK mode
    const initialJK = jkDesigns[0]?.id ?? ''
    const [jkId, setJkId] = useState<string>(initialJK)

    // Derived selections
    const selectedGrip = grips.find(g => g.id === gripId) ?? initialGrip
    const selectedBottomBG = bottoms.find(b => b.id === bottomBgId) ?? initialBottomBG
    const selectedJK = jkDesigns.find(j => j.id === jkId) ?? jkDesigns[0]
    const selectedGlyph = glyphsWithNone.find(g => g.id === glyphId) ?? glyphsWithNone[0]

    // Output for viewer
    const [bottomPreviewUrl, setBottomPreviewUrl] = useState<string>(initialBottomBG.image)

    // Offscreen canvas
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    if (!canvasRef.current && typeof document !== 'undefined') {
        canvasRef.current = document.createElement('canvas')
    }

    useEffect(() => {
        let cancelled = false

        async function buildBottom() {
            // JK mode: use fixed art directly
            if (mode === 'jk' && selectedJK?.image) {
                if (!cancelled) setBottomPreviewUrl(selectedJK.image)
                return
            }

            // CUSTOM mode
            try {
                const bgImg = await loadImage(selectedBottomBG.image)

                const c = canvasRef.current!
                const ctx = c.getContext('2d')
                if (!ctx) return

                const W = bgImg.naturalWidth || bgImg.width || 1600
                const H = bgImg.naturalHeight || bgImg.height || 1600
                c.width = W
                c.height = H

                ctx.clearRect(0, 0, W, H)

                // 1) Background
                ctx.drawImage(bgImg, 0, 0, W, H)

                // 2) Glyph (between background and token)
                if (selectedGlyph.id !== 'none' && selectedGlyph.image) {
                    try {
                        const glyphImg = await loadImage(selectedGlyph.image)

                        // Fit the glyph to COVER the canvas (like background-size: cover)
                        const gSrcW = glyphImg.naturalWidth || glyphImg.width;
                        const gSrcH = glyphImg.naturalHeight || glyphImg.height;

                        const scale = Math.max(W / gSrcW, H / gSrcH); // cover
                        const gW = gSrcW * scale;
                        const gH = gSrcH * scale;

                        const gX = Math.round((W - gW) / 2);
                        const gY = Math.round((H - gH) / 2);

                        // tint on an offscreen canvas
                        const tmp = document.createElement('canvas')
                        tmp.width = Math.max(1, Math.round(gW))
                        tmp.height = Math.max(1, Math.round(gH))
                        const tctx = tmp.getContext('2d')
                        if (tctx) {
                            tctx.imageSmoothingEnabled = true
                            tctx.drawImage(glyphImg, 0, 0, tmp.width, tmp.height)
                            tctx.globalCompositeOperation = 'source-in'
                            tctx.fillStyle = glyphTint
                            tctx.fillRect(0, 0, tmp.width, tmp.height)
                            tctx.globalCompositeOperation = 'source-over'
                            ctx.drawImage(tmp, gX, gY, gW, gH)
                        }
                    } catch (err) {
                        console.warn('Glyph draw error:', err)
                    }
                }

                // 3) Token
                const wantPixel = style === 'pixel'
                const tokenSrc = tokenId
                    ? (wantPixel ? buildPixelUrl(tokenId) : buildIllustratedUrl(tokenId))
                    : ''

                if (tokenSrc) {
                    try {
                        const tokenImg = await loadImage(tokenSrc)
                        const srcW = tokenImg.naturalWidth || tokenImg.width
                        const srcH = tokenImg.naturalHeight || tokenImg.height

                        const wantHorizontal = layout === 'horizontalLeft'
                        const baseWidthRatio =
                            style === 'pixel'
                                ? (wantHorizontal ? 0.50 : 0.55)
                                : (wantHorizontal ? 0.38 : 0.42)

                        const scaleMul = Math.max(0.05, Math.min(10, tokenScale))
                        const tW = W * baseWidthRatio * scaleMul
                        const tH = srcH * (tW / srcW)

                        // manual start position for horizontal layout
                        const HSTART = { cx: 675, cy: 700 }

                        if (wantHorizontal) {
                            const cx = Math.round(HSTART.cx + offsetX)
                            const cy = Math.round(HSTART.cy + offsetY)

                            const prev = ctx.imageSmoothingEnabled
                            ctx.imageSmoothingEnabled = !wantPixel
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
                            ctx.imageSmoothingEnabled = !wantPixel
                            ctx.drawImage(tokenImg, dx, dy, tW, tH)
                            ctx.imageSmoothingEnabled = prev
                        }
                    } catch {
                        // ignore token errors
                    }
                }

                const url = c.toDataURL('image/png')
                if (!cancelled) setBottomPreviewUrl(url)
            } catch {
                if (!cancelled) setBottomPreviewUrl(selectedBottomBG.image)
            }
        }

        buildBottom()
        return () => { cancelled = true }
    }, [
        mode,
        selectedJK?.image,
        selectedBottomBG.image,
        selectedGlyph.image,  // watch glyph image
        glyphId,              // and which glyph is chosen
        glyphTint,            // update on tint change
        tokenId,
        style,
        tokenScale,
        offsetX,
        offsetY,
        layout,
    ])

    // helpers
    const bump = (setter: React.Dispatch<React.SetStateAction<number>>, delta: number) => {
        setter(v => v + delta)
    }

    const controlsDisabled = mode === 'jk'

    return (
        <div className="grid gap-6 sm:grid-cols-[380px_minmax(0,1fr)] items-stretch">
            {/* Settings (left) */}
            <aside className="h-full lg:sticky lg:top-6 h-fit rounded-2xl border bg-white shadow-sm p-4 lg:p-5">
                <h2 className="text-sm font-semibold mb-3">Settings</h2>
                <div className="space-y-4">
                    {/* Mode */}
                    {hasJK && (
                        <Field labelText="Choose design mode...">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className={`btn ${mode === 'jk' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setMode('jk')}
                                >
                                    JK Designs
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${mode === 'custom' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setMode('custom')}
                                >
                                    Custom
                                </button>
                            </div>
    {/* ✅ Description goes here */}
    <p className="text-xs text-neutral-500 mt-2">
      Choose <strong>JK Designs</strong> for preset artwork or <strong>Custom</strong> to build your own deck.
    </p>
                        </Field>

                    )}

                    {/* Grip (top) */}
                    <Field labelText="Grip Tape">
                        <select className="input" value={gripId} onChange={(e) => setGripId(e.target.value)}>
                            {grips.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </Field>

                    {/* Custom-mode: Background */}
                    {mode === 'custom' && (
                        <Field labelText="Bottom Background">
                            <select className="input" value={bottomBgId} onChange={(e) => setBottomBgId(e.target.value)}>
                                {bottoms.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </Field>
                    )}

                    {/* Glyph (custom only) */}
                    <div className="flex flex-wrap items-center gap-2">
                        {mode === 'custom' && glyphsWithNone.length > 0 && (
                            <>
                                <Field labelText="Glyph Layer">
                                    <select className="input" value={glyphId} onChange={(e) => setGlyphId(e.target.value)}>
                                        {glyphsWithNone.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                    {/* <p className="text-xs text-neutral-500">
                                    Drawn between background and token. Use “None” to disable.
                                </p> */}
                                </Field>

                                {/* Tint picker – visible only in Custom mode */}
                                <Field labelText="Glyph Tint">
                                    <input
                                        type="color"
                                        value={glyphTint}
                                        onChange={(e) => setGlyphTint(e.target.value)}
                                        disabled={glyphId === 'none'}
                                    />
                                </Field>
                            </>
                        )}
                    </div>

                    {/* JK-mode: fixed design */}
                    {mode === 'jk' && hasJK && (
                        <Field labelText="JK Design">
                            <select className="input" value={jkId} onChange={(e) => setJkId(e.target.value)}>
                                {jkDesigns.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-neutral-500">
                                Fixed artwork; token and positioning controls are disabled.
                            </p>
                        </Field>
                    )}

                    {/* Token (custom only) */}
                    {mode === 'custom' && (
                        <Field labelText="Moonbird Token ID">
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
                            <p className="text-xs text-neutral-500">
                                Token is composited onto the selected background (custom mode only).
                            </p>
                        </Field>
                    )}

                    {/* Scale (custom only) */}
                    {mode === 'custom' && (
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
                                    disabled={controlsDisabled}
                                />
                                <input
                                    className="w-full accent-neutral-800"
                                    type="range"
                                    min={0.25}
                                    max={5}
                                    step={0.25}
                                    value={tokenScale}
                                    onChange={(e) => setTokenScale(Number(e.target.value))}
                                    disabled={controlsDisabled}
                                />
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => setTokenScale(1)}
                                    disabled={controlsDisabled}
                                >
                                    Reset
                                </button>
                            </div>
                        </Field>
                    )}

                    {/* Nudge (custom only) */}
                    {mode === 'custom' && (
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
                                >
                                    •
                                </button>
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
                                    disabled={controlsDisabled}
                                >
                                    Reset
                                </button>
                            </div>
                        </Field>
                    )}

                    <div className="text-xs text-neutral-500 pt-2">
                        Preview is web-resolution; final print assets are prepared offline.
                    </div>
                </div>
            </aside>

            {/* Preview (right) */}
            <section className="rounded-2xl border bg-white shadow-sm p-4 lg:p-5">
                <h2 className="text-sm font-semibold mb-3">Preview</h2>
                <div className="rounded-xl bg-white overflow-hidden">
                    <DeckViewerMinimal
                        topUrl={selectedGrip.image}
                        bottomUrl={bottomPreviewUrl}
                    />
                </div>
            </section>
        </div>
    )
}


