'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import DeckViewerMinimal from './DeckViewerMinimal'

/* ---------- Types ---------- */
export type GripOption = { id: string; name: string; image: string }
export type BottomOption = { id: string; name: string; image: string }

/** Fixed designs that should be used as-is (no token overlay) */
export type JKDesign = { id: string; name: string; image: string }

export type DeckComposerConfig = {
    collectionKey: string
    grips: GripOption[]
    bottoms: BottomOption[]              // backgrounds for Custom mode
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
    const { grips, bottoms, jkDesigns = [] } = config
    const hasJK = jkDesigns.length > 0

    const initialGrip = useMemo(() => grips[0]!, [grips])
    const initialBottomBG = useMemo(() => bottoms[0]!, [bottoms])

    const [gripId, setGripId] = useState<string>(initialGrip.id)

    // Mode: Custom (background + optional token) vs JK (fixed art)
    const [mode, setMode] = useState<BuildMode>('jk')

    // Custom-mode state
    const [bottomBgId, setBottomBgId] = useState<string>(initialBottomBG.id)
    const [tokenId, setTokenId] = useState<string>('') // moonbird ID
    const [style, setStyle] = useState<'illustrated' | 'pixel'>('illustrated')
    const [layout, setLayout] = useState<LayoutMode>('horizontalLeft')

    // Custom controls
    const [tokenScale, setTokenScale] = useState<number>(3.25) // multiplies base size
    const [offsetX, setOffsetX] = useState<number>(-40)        // px relative to center
    const [offsetY, setOffsetY] = useState<number>(60)         // px down is positive
    const nudgeValue = 100

    // JK-mode state
    const initialJK = jkDesigns[0]?.id ?? ''
    const [jkId, setJkId] = useState<string>(initialJK)

    // Output for viewer
    const [bottomPreviewUrl, setBottomPreviewUrl] = useState<string>(initialBottomBG.image)

    // Selections
    const selectedGrip = grips.find((g) => g.id === gripId) ?? initialGrip
    const selectedBottomBG = bottoms.find((b) => b.id === bottomBgId) ?? initialBottomBG
    const selectedJK = jkDesigns.find((j) => j.id === jkId) ?? jkDesigns[0]

    // Offscreen canvas for bottom composite (custom mode)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    if (!canvasRef.current && typeof document !== 'undefined') {
        canvasRef.current = document.createElement('canvas')
    }

    useEffect(() => {
        let cancelled = false

        async function buildBottom() {
            // JK mode: use fixed art directly and bail
            if (mode === 'jk' && selectedJK?.image) {
                if (!cancelled) setBottomPreviewUrl(selectedJK.image)
                return
            }

            // CUSTOM mode logic (your existing builder)
            try {
                const bgImg = await loadImage(selectedBottomBG.image)

                const wantPixel = style === 'pixel'
                const tokenSrc = tokenId
                    ? (wantPixel ? buildPixelUrl(tokenId) : buildIllustratedUrl(tokenId))
                    : ''

                // If no token (or no base configured), just pass through the background
                if (!tokenSrc) {
                    if (!cancelled) setBottomPreviewUrl(selectedBottomBG.image)
                    return
                }

                const tokenImg = await loadImage(tokenSrc)

                // --- Canvas set up ---
                const c = canvasRef.current!
                const ctx = c.getContext('2d')
                if (!ctx) return

                const W = bgImg.naturalWidth || bgImg.width || 1600
                const H = bgImg.naturalHeight || bgImg.height || 1600
                c.width = W
                c.height = H

                ctx.clearRect(0, 0, W, H)
                ctx.drawImage(bgImg, 0, 0, W, H)

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

                // ---- MANUAL START POSITION for HORIZONTAL layout (in canvas pixels) ----
                // Change these two numbers to put the token exactly where you want it.
                // They are interpreted in the output canvas coordinate space.
                const HSTART = {
                    cx: 675,  // X pixel where the *center* of the rotated token should start
                    cy: 700,  // Y pixel where the *center* of the rotated token should start
                };
                // ------------------------------------------------------------------------

                if (wantHorizontal) {
                    // Final token size (already computed): tW, tH
                    // We’ll draw rotated 90° clockwise around its center at (cx, cy)
                    const cx = Math.round(HSTART.cx + offsetX);
                    const cy = Math.round(HSTART.cy + offsetY);

                    const prev = ctx.imageSmoothingEnabled;
                    ctx.imageSmoothingEnabled = !(style === 'pixel');

                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(Math.PI / 2);            // 90° clockwise
                    ctx.drawImage(tokenImg, -tW / 2, -tH / 2, tW, tH);
                    ctx.restore();

                    ctx.imageSmoothingEnabled = prev;

                    const url = c.toDataURL('image/png');
                    if (!cancelled) setBottomPreviewUrl(url);
                    return; // IMPORTANT: stop here so the vertical-tail branch doesn't also draw
                }
                else {
                    // Original tail placement
                    const baseDx = Math.round((W - tW) / 2)
                    const baseDy = Math.round(H - tH - H * 0.06)
                    const dx = baseDx + Math.round(offsetX)
                    const dy = baseDy + Math.round(offsetY)

                    ctx.imageSmoothingEnabled = !(style === 'pixel')
                    ctx.drawImage(tokenImg, dx, dy, tW, tH)
                }

                const url = c.toDataURL('image/png')
                if (!cancelled) setBottomPreviewUrl(url)
            } catch {
                if (!cancelled) setBottomPreviewUrl(selectedBottomBG.image)
            }
        }

        buildBottom()
        return () => {
            cancelled = true
        }
    }, [
        mode,
        selectedJK?.image,
        selectedBottomBG.image,
        tokenId,
        style,
        tokenScale,
        offsetX,
        offsetY,
        layout,
    ])

    // helpers
    const bump = (setter: React.Dispatch<React.SetStateAction<number>>, delta: number) => {
        setter((v) => v + delta)
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
                        </Field>
                    )}

                    {/* Grip (top) */}
                    <Field labelText="Grip (Top)">
                        <select
                            className="input"
                            value={gripId}
                            onChange={(e) => setGripId(e.target.value)}
                        >
                            {grips.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.name}
                                </option>
                            ))}
                        </select>
                    </Field>

                    {/* Custom-mode: Background */}
                    {mode === 'custom' && (
                        <Field labelText="Bottom Background">
                            <select
                                className="input"
                                value={bottomBgId}
                                onChange={(e) => setBottomBgId(e.target.value)}
                            >
                                {bottoms.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    )}

                    {/* JK-mode: choose a fixed design */}
                    {mode === 'jk' && hasJK && (
                        <Field labelText="JK Design">
                            <select
                                className="input"
                                value={jkId}
                                onChange={(e) => setJkId(e.target.value)}
                            >
                                {jkDesigns.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-neutral-500">
                                Fixed artwork; token overlay and positioning controls are disabled.
                            </p>
                        </Field>
                    )}

                    {/* Layout (custom only) */}
                    {/* {mode === 'custom' && (
                        <Field labelText="Layout">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className={`btn ${layout === 'horizontalLeft' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setLayout('horizontalLeft')}
                                    disabled={controlsDisabled}
                                >
                                    Horizontal (left)
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${layout === 'verticalTail' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setLayout('verticalTail')}
                                    disabled={controlsDisabled}
                                >
                                    Vertical (tail)
                                </button>
                            </div>
                        </Field>
                    )} */}

                    {/* Token ID + style (custom only) */}
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
                                    title="Multiply the base size"
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
                                    title="Drag to scale"
                                    disabled={controlsDisabled}
                                />
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => setTokenScale(1)}
                                    title="Reset"
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
                                <button type="button" className="btn" onClick={() => bump(setOffsetX, nudgeValue)} title="Up">↑</button>
                                <div />
                                <button type="button" className="btn" onClick={() => bump(setOffsetY, -nudgeValue)} title="Left">←</button>
                                <button type="button" className="btn btn-ghost" onClick={() => { setOffsetX(0); setOffsetY(0) }} title="Center">•</button>
                                <button type="button" className="btn" onClick={() => bump(setOffsetY, nudgeValue)} title="Right">→</button>
                                <div />
                                <button type="button" className="btn" onClick={() => bump(setOffsetX, -nudgeValue)} title="Down">↓</button>
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

