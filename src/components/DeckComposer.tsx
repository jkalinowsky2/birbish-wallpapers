'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import DeckViewerMinimal from './DeckViewerMinimal'

/* ---------- Types ---------- */
export type GripOption = { id: string; name: string; image: string }
export type BottomOption = { id: string; name: string; image: string }

export type DeckComposerConfig = {
    collectionKey: string
    grips: GripOption[]
    bottoms: BottomOption[] // bottom BACKGROUNDS
}

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
    const { grips, bottoms } = config

    const initialGrip = useMemo(() => grips[0]!, [grips])
    const initialBottomBG = useMemo(() => bottoms[0]!, [bottoms])

    const [gripId, setGripId] = useState<string>(initialGrip.id)

    // Bottom builder state
    const [bottomBgId, setBottomBgId] = useState<string>(initialBottomBG.id)
    const [tokenId, setTokenId] = useState<string>('') // moonbird ID
    const [style, setStyle] = useState<'illustrated' | 'pixel'>('illustrated')

    // NEW: user controls
    const [tokenScale, setTokenScale] = useState<number>(3.55) // multiplies base size
    const [offsetX, setOffsetX] = useState<number>(-40)         // px relative to center
    const [offsetY, setOffsetY] = useState<number>(60)         // px down is positive

    const [bottomPreviewUrl, setBottomPreviewUrl] = useState<string>(initialBottomBG.image)

    // derived selections
    const selectedGrip = grips.find((g) => g.id === gripId) ?? initialGrip
    const selectedBottomBG = bottoms.find((b) => b.id === bottomBgId) ?? initialBottomBG

    // Offscreen canvas for bottom composite
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    if (!canvasRef.current && typeof document !== 'undefined') {
        canvasRef.current = document.createElement('canvas')
    }

    useEffect(() => {
        let cancelled = false

        async function buildBottom() {
            try {
                const bgImg = await loadImage(selectedBottomBG.image)

                // If no token or base not configured, just use background
                const wantPixel = style === 'pixel'
                const tokenSrc = tokenId
                    ? (wantPixel ? buildPixelUrl(tokenId) : buildIllustratedUrl(tokenId))
                    : ''

                if (!tokenSrc) {
                    if (!cancelled) setBottomPreviewUrl(selectedBottomBG.image)
                    return
                }

                const tokenImg = await loadImage(tokenSrc)

                // Compose: background full, token near the tail
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

                // Base ratios (same as before), then multiply by user tokenScale
                const baseRatio = wantPixel ? 0.55 : 0.42
                const tW = W * baseRatio * Math.max(0.05, Math.min(10, tokenScale))
                const tH = srcH * (tW / srcW)

                // Centered horizontally, near the tail vertically; apply nudges
                const baseDx = Math.round((W - tW) / 2)
                const baseDy = Math.round(H - tH - H * 0.06)

                const dx = baseDx + Math.round(offsetX)
                const dy = baseDy + Math.round(offsetY)

                const prev = ctx.imageSmoothingEnabled
                ctx.imageSmoothingEnabled = !wantPixel // keep pixel art crisp
                ctx.drawImage(tokenImg, dx, dy, tW, tH)
                ctx.imageSmoothingEnabled = prev

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
        // include controls in deps so preview updates live
    }, [selectedBottomBG.image, tokenId, style, tokenScale, offsetX, offsetY])

    // helpers
    const bump = (setter: React.Dispatch<React.SetStateAction<number>>, delta: number) => {
        setter((v) => v + delta)
    }
    return (
        <div className="grid gap-6 sm:grid-cols-[380px_minmax(0,1fr)] items-stretch">
            {/* Settings (left) */}
            <aside className="h-full lg:sticky lg:top-6 h-fit rounded-2xl border bg-white shadow-sm p-4 lg:p-5">
                <h2 className="text-sm font-semibold mb-3">Settings</h2>

                <div className="space-y-4">
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

                    {/* Bottom background */}
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

                    {/* Token ID + style */}
                    <Field labelText="Moonbird Token ID">
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                className="input w-36"
                                type="number"
                                placeholder="e.g. 8209"
                                min={1}
                                value={tokenId}
                                onChange={(e) => setTokenId(e.target.value.trim())}
                            />
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    className={`btn ${style === 'illustrated' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setStyle('illustrated')}
                                    disabled={!ILLU_BASE}
                                    title={ILLU_BASE ? 'Use illustrated' : 'Set NEXT_PUBLIC_MOONBIRDS_ILLU_BASE'}
                                >
                                    Illustrated
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${style === 'pixel' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setStyle('pixel')}
                                    disabled={!PIXEL_BASE}
                                    title={PIXEL_BASE ? 'Use pixel' : 'Set NEXT_PUBLIC_MOONBIRDS_PIXEL_BASE'}
                                >
                                    Pixel
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-neutral-500">
                            Token is composited near the tail on top of the selected background.
                        </p>
                    </Field>

                    {/* NEW: Scale */}
                    <Field labelText="Token Scale">
                        <div className="flex items-center gap-2">
                            <input
                                className="input w-28"
                                type="number"
                                step={0.05}
                                min={0.05}
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
                                min={0.05}
                                max={5}
                                step={0.05}
                                value={tokenScale}
                                onChange={(e) => setTokenScale(Number(e.target.value))}
                                title="Drag to scale"
                            />
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => setTokenScale(1)}
                                title="Reset"
                            >
                                Reset
                            </button>
                        </div>
                    </Field>

                    {/* NEW: Nudge controls */}
                    <Field labelText="Nudge Position">
                        <div className="grid grid-cols-3 gap-2 w-[220px]">
                            <div />
                            <button type="button" className="btn" onClick={() => bump(setOffsetY, -20)} title="Up">↑</button>
                            <div />
                            <button type="button" className="btn" onClick={() => bump(setOffsetX, -20)} title="Left">←</button>
                            <button type="button" className="btn btn-ghost" onClick={() => { setOffsetX(0); setOffsetY(0) }} title="Center">•</button>
                            <button type="button" className="btn" onClick={() => bump(setOffsetX, 20)} title="Right">→</button>
                            <div />
                            <button type="button" className="btn" onClick={() => bump(setOffsetY, 20)} title="Down">↓</button>
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

                    <div className="text-xs text-neutral-500 pt-2">
                        Preview is web-resolution; final print assets are prepared offline.
                    </div>
                </div>
            </aside>

            {/* Preview (right) */}
            <section className="rounded-2xl border bg-white shadow-sm p-4 lg:p-5">
                <h2 className="text-sm font-semibold mb-3">Preview</h2>
                <div className="rounded-xl bg-white overflow-hidden">
                    {/* Give the Canvas a real height */}
                    <DeckViewerMinimal
                        topUrl={selectedGrip.image}
                        bottomUrl={bottomPreviewUrl}
                    />
                </div>
            </section>
        </div>
    )
}