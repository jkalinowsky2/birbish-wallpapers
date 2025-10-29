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
    glyphs?: GlyphOption[]      // Layer 1
    glyphs2?: GlyphOption[]     // Layer 2
    glyphs3?: GlyphOption[]     // Layer 3 (new)
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

            {/* When closed: collapse; when open: let content size naturally and rely on sidebar scroll */}
            <div
                className={`
          transition-[opacity,transform] duration-300 ease-in-out
          ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'}
        `}
                style={{
                    maxHeight: isOpen ? 'none' : 0,
                    overflow: isOpen ? 'visible' : 'hidden',
                }}
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
                    // Narrow to a type that may have decode()
                    const withDecode = img as HTMLImageElement & { decode?: () => Promise<void> };
                    if (typeof withDecode.decode === 'function') {
                        await withDecode.decode();
                    }
                } catch {
                    /* ignore */
                }
                resolve(img);
            };
            img.onerror = () => reject(new Error(`Failed to load ${src}`))
            img.src = src
        })
        imgCache.set(src, p)
    }
    return imgCache.get(src)!
}

/* ---------- Main component ---------- */
export default function DeckComposer({ config }: { config: DeckComposerConfig }) {
    const { grips, bottoms, jkDesigns = [], glyphs = [], glyphs2 = [], glyphs3 = [] } = config
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
    const glyphs3WithNone = useMemo<GlyphOption[]>(
        () => [{ id: 'none', name: 'None', image: '/deckAssets/moonbirds/none.png' }, ...glyphs3],
        [glyphs3]
    )

    // Layer 1 state
    const [glyphId1, setGlyphId1] = useState<string>('none')
    const [glyphTint1, setGlyphTint1] = useState('#ff1a1a')
    const [glyph1Scale, setGlyph1Scale] = useState<number>(1)
    const [glyph1OffsetX, setGlyph1OffsetX] = useState<number>(0)
    const [glyph1OffsetY, setGlyph1OffsetY] = useState<number>(0)

    // Layer 2 state
    const [glyphId2, setGlyphId2] = useState<string>('none')
    const [glyphTint2, setGlyphTint2] = useState('#ffffff')
    const [glyph2Scale, setGlyph2Scale] = useState<number>(1)
    const [glyph2OffsetX, setGlyph2OffsetX] = useState<number>(0)
    const [glyph2OffsetY, setGlyph2OffsetY] = useState<number>(0)

    // Layer 3 state (NEW)
    const [glyphId3, setGlyphId3] = useState<string>('none')
    const [glyphTint3, setGlyphTint3] = useState('#ffffff')
    const [glyph3Scale, setGlyph3Scale] = useState<number>(1)
    const [glyph3OffsetX, setGlyph3OffsetX] = useState<number>(0)
    const [glyph3OffsetY, setGlyph3OffsetY] = useState<number>(0)

    const selectedGlyph1 = glyphs1WithNone.find((g) => g.id === glyphId1) ?? glyphs1WithNone[0]
    const selectedGlyph2 = glyphs2WithNone.find((g) => g.id === glyphId2) ?? glyphs2WithNone[0]
    const selectedGlyph3 = glyphs3WithNone.find((g) => g.id === glyphId3) ?? glyphs3WithNone[0]

    const BLEND_MODES: GlobalCompositeOperation[] = [
        'source-over',   // default
        'multiply',
        'screen',
        'overlay',
        'darken',
        'lighten',
        'color-dodge',
        'color-burn',
        'hard-light',
        'soft-light',
        'difference',
        'exclusion',
        'hue',
        'saturation',
        'color',
        'luminosity',
    ];
    const [glyph1Blend, setGlyph1Blend] = useState<GlobalCompositeOperation>('source-over');
    const [glyph2Blend, setGlyph2Blend] = useState<GlobalCompositeOperation>('source-over');
    const [glyph3Blend, setGlyph3Blend] = useState<GlobalCompositeOperation>('source-over'); // if you have a 3rd layer

    // Token transform
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
        if (glyphId3 !== 'none' && selectedGlyph3.image) urls.push(selectedGlyph3.image)
        bottoms.slice(0, 6).forEach((b) => urls.push(b.image))
        glyphs.slice(0, 3).forEach((g) => urls.push(g.image))
        glyphs2.slice(0, 3).forEach((g) => urls.push(g.image))
        glyphs3.slice(0, 3).forEach((g) => urls.push(g.image))
        urls.forEach((u) => u && loadImageCached(u).catch(() => { }))
    }, [
        bottoms,
        glyphs, glyphs2, glyphs3,
        selectedBottomBG.image,
        selectedGrip.image,
        glyphId1, selectedGlyph1?.image,
        glyphId2, selectedGlyph2?.image,
        glyphId3, selectedGlyph3?.image,
    ])

    /* ---------- Compositor ---------- */
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
                const glyph3Src = glyphId3 !== 'none' ? selectedGlyph3.image : ''

                const glyph1Img = glyph1Src ? await loadImageCached(glyph1Src) : null
                const glyph2Img = glyph2Src ? await loadImageCached(glyph2Src) : null
                const glyph3Img = glyph3Src ? await loadImageCached(glyph3Src) : null

                const wantPixel = style === 'pixel'
                const tokenSrc = tokenId
                    ? wantPixel ? buildPixelUrl(tokenId) : buildIllustratedUrl(tokenId)
                    : ''
                const tokenImg = tokenSrc ? await loadImageCached(tokenSrc) : null

                // Canvas
                // ---- Canvas setup ----
                const c = canvasRef.current
                if (!c) return

                const ctxRaw = c.getContext('2d')
                if (!ctxRaw) return
                const ctx: CanvasRenderingContext2D = ctxRaw

                const W = bgImg.naturalWidth || bgImg.width || 1600
                const H = bgImg.naturalHeight || bgImg.height || 1600
                c.width = W
                c.height = H

                ctx.clearRect(0, 0, W, H)

                // 1) Background
                ctx.drawImage(bgImg, 0, 0, W, H)

                // Helper: cover-fit + tint + per-glyph transforms (scale & nudge)
                const drawGlyph = (
                    img: HTMLImageElement,
                    tint: string,
                    userScale: number, // 1 = base cover size
                    offX: number,      // px
                    offY: number,      // px
                    blend: GlobalCompositeOperation // blend mode
                ) => {
                    const srcW = img.naturalWidth || img.width;
                    const srcH = img.naturalHeight || img.height;

                    const baseScale = Math.max(W / srcW, H / srcH);
                    const s = baseScale * Math.max(0.05, Math.min(10, userScale));
                    const gW = Math.round(srcW * s);
                    const gH = Math.round(srcH * s);

                    const gX = Math.round((W - gW) / 2 + offX);
                    const gY = Math.round((H - gH) / 2 + offY);

                    const tmp = document.createElement('canvas');
                    tmp.width = Math.max(1, gW);
                    tmp.height = Math.max(1, gH);
                    const tctx = tmp.getContext('2d');
                    if (!tctx) return;

                    tctx.imageSmoothingEnabled = true;
                    tctx.drawImage(img, 0, 0, gW, gH);
                    tctx.globalCompositeOperation = 'source-in';
                    tctx.fillStyle = tint;
                    tctx.fillRect(0, 0, gW, gH);
                    tctx.globalCompositeOperation = 'source-over';

                    ctx.save();
                    const prev = ctx.globalCompositeOperation;
                    ctx.globalCompositeOperation = blend;
                    ctx.drawImage(tmp, gX, gY);
                    ctx.globalCompositeOperation = prev;
                    ctx.restore();
                };

                // 2) Glyphs: under → over
                if (glyph1Img) drawGlyph(glyph1Img, glyphTint1, glyph1Scale, glyph1OffsetX, glyph1OffsetY, glyph1Blend);
                if (glyph2Img) drawGlyph(glyph2Img, glyphTint2, glyph2Scale, glyph2OffsetX, glyph2OffsetY, glyph2Blend);
                if (glyph3Img) drawGlyph(glyph3Img, glyphTint3, glyph3Scale, glyph3OffsetX, glyph3OffsetY, glyph3Blend);

                // 3) Token
                if (tokenImg && tokenSrc) {
                    const srcW = tokenImg.naturalWidth || tokenImg.width
                    const srcH = tokenImg.naturalHeight || tokenImg.height

                    const wantHorizontal = layout === 'horizontalLeft'
                    const baseWidthRatio =
                        style === 'pixel'
                            ? (wantHorizontal ? 0.5 : 0.55)
                            : (wantHorizontal ? 0.38 : 0.42)

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
        glyphId1, glyphTint1, selectedGlyph1?.image, glyph1Scale, glyph1OffsetX, glyph1OffsetY, glyph1Blend,
        glyphId2, glyphTint2, selectedGlyph2?.image, glyph2Scale, glyph2OffsetX, glyph2OffsetY, glyph2Blend,
        glyphId3, glyphTint3, selectedGlyph3?.image, glyph3Scale, glyph3OffsetX, glyph3OffsetY, glyph3Blend,
        tokenId, style, tokenScale, offsetX, offsetY,
    ])

    // helpers
    const controlsDisabled = mode === 'jk'
    const nudge = (setter: React.Dispatch<React.SetStateAction<number>>, delta: number) =>
        setter((v) => v + delta)

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
                                                <button type="button" className="btn" onClick={() => setOffsetX(v => v + nudgeValue)} title="Up">↑</button>
                                                <div />
                                                <button type="button" className="btn" onClick={() => setOffsetY(v => v - nudgeValue)} title="Left">←</button>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost"
                                                    onClick={() => { setOffsetX(0); setOffsetY(0) }}
                                                    title="Center"
                                                >•</button>
                                                <button type="button" className="btn" onClick={() => setOffsetY(v => v + nudgeValue)} title="Right">→</button>
                                                <div />
                                                <button type="button" className="btn" onClick={() => setOffsetX(v => v - nudgeValue)} title="Down">↓</button>
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
                                            <>
                                                <Field labelText="Glyph 1 Tint">
                                                    <input type="color" value={glyphTint1} onChange={(e) => setGlyphTint1(e.target.value)} />
                                                </Field>
                                                <Field labelText="Glyph 1 Blend">
                                                    <select
                                                        className="input"
                                                        value={glyph1Blend}
                                                        onChange={(e) => setGlyph1Blend(e.target.value as GlobalCompositeOperation)}
                                                        title="How the tinted glyph mixes with the background"
                                                    >
                                                        {BLEND_MODES.map((m) => (
                                                            <option key={m} value={m}>{m}</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-xs text-neutral-500">
                                                        Tip: <code>multiply</code> darkens (ink look), <code>screen</code> brightens (glow), <code>overlay</code> boosts contrast.
                                                    </p>
                                                </Field>

                                                <Field labelText="Glyph 1 Scale">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            className="input w-28"
                                                            type="number"
                                                            step={0.25}
                                                            min={0.1}
                                                            max={5}
                                                            value={glyph1Scale}
                                                            onChange={(e) =>
                                                                setGlyph1Scale(Math.max(0.1, Math.min(5, Number(e.target.value) || 1)))
                                                            }
                                                            title="Multiply the base size"
                                                        />
                                                        <input
                                                            className="w-full accent-neutral-800"
                                                            type="range"
                                                            min={0.1}
                                                            max={5}
                                                            step={0.25}
                                                            value={glyph1Scale}
                                                            onChange={(e) => setGlyph1Scale(Number(e.target.value))}
                                                            title="Drag to scale"
                                                        />
                                                        <button type="button" className="btn btn-ghost" onClick={() => setGlyph1Scale(1)}>
                                                            Reset
                                                        </button>
                                                    </div>
                                                </Field>

                                                <Field labelText="Glyph 1 Nudge">
                                                    <div className="grid grid-cols-3 gap-2 w-[220px]">
                                                        <div />
                                                        <button type="button" className="btn" onClick={() => setGlyph1OffsetX(v => v +nudgeValue)}>↑</button>
                                                        <div />
                                                        <button type="button" className="btn" onClick={() => setGlyph1OffsetY(v => v - nudgeValue)}>←</button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost"
                                                            onClick={() => { setGlyph1OffsetX(0); setGlyph1OffsetY(0) }}
                                                        >
                                                            •
                                                        </button>
                                                        <button type="button" className="btn" onClick={() => setGlyph1OffsetY(v => v + nudgeValue)}>→</button>
                                                        <div />
                                                        <button type="button" className="btn" onClick={() => setGlyph1OffsetX(v => v - nudgeValue)}>↓</button>
                                                        <div />
                                                    </div>
                                                    <div className="flex items-center gap-3 pt-2 text-xs text-neutral-600">
                                                        <span>X: {glyph1OffsetX}px</span>
                                                        <span>Y: {glyph1OffsetY}px</span>
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => { setGlyph1OffsetX(0); setGlyph1OffsetY(0) }}
                                                        >
                                                            Reset
                                                        </button>
                                                    </div>
                                                </Field>
                                            </>
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
                                            <>
                                                <Field labelText="Glyph 2 Tint">
                                                    <input type="color" value={glyphTint2} onChange={(e) => setGlyphTint2(e.target.value)} />
                                                </Field>
                                                <Field labelText="Glyph 2 Blend">
                                                    <select
                                                        className="input"
                                                        value={glyph2Blend}
                                                        onChange={(e) => setGlyph2Blend(e.target.value as GlobalCompositeOperation)}
                                                        title="How the tinted glyph mixes with the background"
                                                    >
                                                        {BLEND_MODES.map((m) => (
                                                            <option key={m} value={m}>{m}</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-xs text-neutral-500">
                                                        Tip: <code>multiply</code> darkens (ink look), <code>screen</code> brightens (glow), <code>overlay</code> boosts contrast.
                                                    </p>
                                                </Field>
                                                <Field labelText="Glyph 2 Scale">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            className="input w-28"
                                                            type="number"
                                                            step={0.25}
                                                            min={0.1}
                                                            max={5}
                                                            value={glyph2Scale}
                                                            onChange={(e) =>
                                                                setGlyph2Scale(Math.max(0.1, Math.min(5, Number(e.target.value) || 1)))
                                                            }
                                                            title="Multiply the base size"
                                                        />
                                                        <input
                                                            className="w-full accent-neutral-800"
                                                            type="range"
                                                            min={0.1}
                                                            max={5}
                                                            step={0.25}
                                                            value={glyph2Scale}
                                                            onChange={(e) => setGlyph2Scale(Number(e.target.value))}
                                                            title="Drag to scale"
                                                        />
                                                        <button type="button" className="btn btn-ghost" onClick={() => setGlyph2Scale(1)}>
                                                            Reset
                                                        </button>
                                                    </div>
                                                </Field>

                                                <Field labelText="Glyph 2 Nudge">
                                                    <div className="grid grid-cols-3 gap-2 w-[220px]">
                                                        <div />
                                                        <button type="button" className="btn" onClick={() => setGlyph2OffsetX(v => v + nudgeValue)}>↑</button>
                                                        <div />
                                                        <button type="button" className="btn" onClick={() => setGlyph2OffsetY(v => v - nudgeValue)}>←</button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost"
                                                            onClick={() => { setGlyph2OffsetX(0); setGlyph2OffsetY(0) }}
                                                        >
                                                            •
                                                        </button>
                                                        <button type="button" className="btn" onClick={() => setGlyph2OffsetY(v => v + nudgeValue)}>→</button>
                                                        <div />
                                                        <button type="button" className="btn" onClick={() => setGlyph2OffsetX(v => v - nudgeValue)}>↓</button>
                                                        <div />
                                                    </div>
                                                    <div className="flex items-center gap-3 pt-2 text-xs text-neutral-600">
                                                        <span>X: {glyph2OffsetX}px</span>
                                                        <span>Y: {glyph2OffsetY}px</span>
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => { setGlyph2OffsetX(0); setGlyph2OffsetY(0) }}
                                                        >
                                                            Reset
                                                        </button>
                                                    </div>
                                                </Field>
                                            </>
                                        )}
                                    </div>
                                </AccordionSection>

                                {/* Glyph 3 (NEW) */}
                                <AccordionSection
                                    title="Glyph Layer 3"
                                    open={openId === 'glyph3'}
                                    onToggle={(next) => setOpenId(next ? 'glyph3' : '')}
                                >
                                    <div className="space-y-3">
                                        <OptionsGrid>
                                            {glyphs3WithNone.map((g) => (
                                                <OptionTile
                                                    key={`g3-${g.id}`}
                                                    label={g.name}
                                                    image={g.image}
                                                    selected={glyphId3 === g.id}
                                                    onClick={() => setGlyphId3(g.id)}
                                                />
                                            ))}
                                        </OptionsGrid>

                                        {glyphId3 !== 'none' && (
                                            <>
                                                <div className="flex items-end gap-4">
                                                    <Field labelText="Tint" className="w-[88px]">
                                                        <input
                                                            type="color"
                                                            value={glyphTint3}
                                                            onChange={(e) => setGlyphTint3(e.target.value)}
                                                            className="
        h-11 w-full rounded-md border border-neutral-300 p-0 cursor-pointer
        [&::-webkit-color-swatch-wrapper]:p-0
        [&::-webkit-color-swatch]:border-0
        [&::-moz-color-swatch]:border-0
      "
                                                            title="Pick tint"
                                                        />
                                                    </Field>

                                                    <Field labelText="Blend Mode" className="flex-1">
                                                        <select
                                                            className="input h-11"
                                                            value={glyph3Blend}
                                                            onChange={(e) => setGlyph3Blend(e.target.value as GlobalCompositeOperation)}
                                                            title="How the tinted glyph mixes with the background"
                                                        >
                                                            {BLEND_MODES.map((m) => (
                                                                <option key={m} value={m}>{m}</option>
                                                            ))}
                                                        </select>
                                                    </Field>
                                                </div>
                                                <Field labelText="Scale">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            className="input w-28"
                                                            type="number"
                                                            step={0.25}
                                                            min={0.1}
                                                            max={5}
                                                            value={glyph3Scale}
                                                            onChange={(e) =>
                                                                setGlyph3Scale(Math.max(0.1, Math.min(5, Number(e.target.value) || 1)))
                                                            }
                                                            title="Multiply the base size"
                                                        />
                                                        <input
                                                            className="w-full accent-neutral-800"
                                                            type="range"
                                                            min={0.1}
                                                            max={5}
                                                            step={0.25}
                                                            value={glyph3Scale}
                                                            onChange={(e) => setGlyph3Scale(Number(e.target.value))}
                                                            title="Drag to scale"
                                                        />
                                                        <button type="button" className="btn btn-ghost" onClick={() => setGlyph3Scale(1)}>
                                                            Reset
                                                        </button>
                                                    </div>
                                                </Field>

                                                <Field labelText="Nudge">
                                                    <div className="grid grid-cols-3 gap-2 w-[220px]">
                                                        <div />
                                                        <button type="button" className="btn" onClick={() => setGlyph3OffsetX(v => v + nudgeValue)}>↑</button>
                                                        <div />
                                                        <button type="button" className="btn" onClick={() => setGlyph3OffsetY(v => v - nudgeValue)}>←</button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost"
                                                            onClick={() => { setGlyph3OffsetX(0); setGlyph3OffsetY(0) }}
                                                        >
                                                            •
                                                        </button>
                                                        <button type="button" className="btn" onClick={() => setGlyph3OffsetY(v => v + nudgeValue)}>→</button>
                                                        <div />
                                                        <button type="button" className="btn" onClick={() => setGlyph3OffsetX(v => v - nudgeValue)}>↓</button>
                                                        <div />
                                                    </div>
                                                    <div className="flex items-center gap-3 pt-2 text-xs text-neutral-600">
                                                        <span>X: {glyph3OffsetX}px</span>
                                                        <span>Y: {glyph3OffsetY}px</span>
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => { setGlyph3OffsetX(0); setGlyph3OffsetY(0) }}
                                                        >
                                                            Reset
                                                        </button>
                                                    </div>
                                                </Field>
                                            </>
                                        )}
                                    </div>
                                </AccordionSection>

                                {/* <AccordionSection
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
                                                <button type="button" className="btn" onClick={() => setOffsetY(v => v - nudgeValue)} title="Up">↑</button>
                                                <div />
                                                <button type="button" className="btn" onClick={() => setOffsetX(v => v - nudgeValue)} title="Left">←</button>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost"
                                                    onClick={() => { setOffsetX(0); setOffsetY(0) }}
                                                    title="Center"
                                                >•</button>
                                                <button type="button" className="btn" onClick={() => setOffsetX(v => v + nudgeValue)} title="Right">→</button>
                                                <div />
                                                <button type="button" className="btn" onClick={() => setOffsetY(v => v + nudgeValue)} title="Down">↓</button>
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
                                </AccordionSection> */}
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
}// // src/components/DeckComposer.tsx
// 'use client'

// import { useEffect, useMemo, useRef, useState } from 'react'
// import Image from 'next/image'
// import DeckViewerMinimal from './DeckViewerMinimal'
// import { ChevronDown } from 'lucide-react'

// /* ---------- Types (image-only bottoms) ---------- */
// export type GripOption = { id: string; name: string; image: string }
// export type BottomOption = { id: string; name: string; image: string }
// export type JKDesign = { id: string; name: string; image: string }
// export type GlyphOption = { id: string; name: string; image: string }

// export type DeckComposerConfig = {
//     collectionKey: string
//     grips: GripOption[]
//     bottoms: BottomOption[]
//     glyphs?: GlyphOption[]      // Layer 1
//     glyphs2?: GlyphOption[]     // Layer 2
//     glyphs3?: GlyphOption[]     // Layer 3 (new)
//     jkDesigns?: JKDesign[]
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
//     label,
//     selected,
//     onClick,
// }: {
//     image: string
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
//                 <Image src={image} alt={label} fill sizes="56px" style={{ objectFit: 'cover' }} />
//             </div>
//             <div className="mt-2 text-xs text-center leading-tight line-clamp-2 h-[2.25rem]">
//                 {label}
//             </div>
//         </button>
//     )
// }

// function OptionsGrid({ children }: { children: React.ReactNode }) {
//     return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
// }

// /** One-open-at-a-time accordion (controlled) */
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
//                 <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
//             </button>

//             <div
//                 className={`
//           overflow-hidden transition-[max-height,opacity,transform]
//           duration-300 ease-in-out
//           ${isOpen ? 'max-h-[1200px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-1'}
//         `}
//             >
//                 <div className="bg-neutral-100 rounded-2xl px-4 py-4 shadow-inner">{children}</div>
//             </div>
//         </div>
//     )
// }

// /* ---------- Env-only bases ---------- */
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

// /* ---------- Image loader (cache + decode) ---------- */
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
//                     // @ ts-expect-error decode may not exist
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
//     const { grips, bottoms, jkDesigns = [], glyphs = [], glyphs2 = [], glyphs3 = [] } = config
//     const hasJK = jkDesigns.length > 0

//     const initialGrip = useMemo(() => grips[0]!, [grips])
//     const initialBottomBG = useMemo(() => bottoms[0]!, [bottoms])
//     const initialJKId = jkDesigns[0]?.id ?? ''

//     // Modes & selections
//     const [mode, setMode] = useState<BuildMode>(hasJK ? 'jk' : 'custom')
//     const [gripId, setGripId] = useState<string>(initialGrip.id)
//     const [bottomBgId, setBottomBgId] = useState<string>(initialBottomBG.id)

//     // Glyph layers (with "None")
//     const glyphs1WithNone = useMemo<GlyphOption[]>(
//         () => [{ id: 'none', name: 'None', image: '/deckAssets/moonbirds/none.png' }, ...glyphs],
//         [glyphs]
//     )
//     const glyphs2WithNone = useMemo<GlyphOption[]>(
//         () => [{ id: 'none', name: 'None', image: '/deckAssets/moonbirds/none.png' }, ...glyphs2],
//         [glyphs2]
//     )
//     const glyphs3WithNone = useMemo<GlyphOption[]>(
//         () => [{ id: 'none', name: 'None', image: '/deckAssets/moonbirds/none.png' }, ...glyphs3],
//         [glyphs3]
//     )

//     // Layer 1 state
//     const [glyphId1, setGlyphId1] = useState<string>('none')
//     const [glyphTint1, setGlyphTint1] = useState('#ff1a1a')
//     const [glyph1Scale, setGlyph1Scale] = useState<number>(1)
//     const [glyph1OffsetX, setGlyph1OffsetX] = useState<number>(0)
//     const [glyph1OffsetY, setGlyph1OffsetY] = useState<number>(0)

//     // Layer 2 state
//     const [glyphId2, setGlyphId2] = useState<string>('none')
//     const [glyphTint2, setGlyphTint2] = useState('#ffffff')
//     const [glyph2Scale, setGlyph2Scale] = useState<number>(1)
//     const [glyph2OffsetX, setGlyph2OffsetX] = useState<number>(0)
//     const [glyph2OffsetY, setGlyph2OffsetY] = useState<number>(0)

//     // Layer 3 state (NEW)
//     const [glyphId3, setGlyphId3] = useState<string>('none')
//     const [glyphTint3, setGlyphTint3] = useState('#ffffff')
//     const [glyph3Scale, setGlyph3Scale] = useState<number>(1)
//     const [glyph3OffsetX, setGlyph3OffsetX] = useState<number>(0)
//     const [glyph3OffsetY, setGlyph3OffsetY] = useState<number>(0)

//     const selectedGlyph1 = glyphs1WithNone.find((g) => g.id === glyphId1) ?? glyphs1WithNone[0]
//     const selectedGlyph2 = glyphs2WithNone.find((g) => g.id === glyphId2) ?? glyphs2WithNone[0]
//     const selectedGlyph3 = glyphs3WithNone.find((g) => g.id === glyphId3) ?? glyphs3WithNone[0]

//     const BLEND_MODES: GlobalCompositeOperation[] = [
//         'source-over',   // default
//         'multiply',
//         'screen',
//         'overlay',
//         'darken',
//         'lighten',
//         'color-dodge',
//         'color-burn',
//         'hard-light',
//         'soft-light',
//         'difference',
//         'exclusion',
//         'hue',
//         'saturation',
//         'color',
//         'luminosity',
//     ];
//     const [glyph1Blend, setGlyph1Blend] = useState<GlobalCompositeOperation>('source-over');
//     const [glyph2Blend, setGlyph2Blend] = useState<GlobalCompositeOperation>('source-over');
//     const [glyph3Blend, setGlyph3Blend] = useState<GlobalCompositeOperation>('source-over'); // if you have a 3rd layer

//     // Token transform
//     const [tokenId, setTokenId] = useState<string>('') // moonbird ID
//     const [style, setStyle] = useState<'illustrated' | 'pixel'>('illustrated')
//     const layout: LayoutMode = 'horizontalLeft'
//     const [tokenScale, setTokenScale] = useState<number>(3.25)
//     const [offsetX, setOffsetX] = useState<number>(-40)
//     const [offsetY, setOffsetY] = useState<number>(60)
//     const nudgeValue = 100

//     // JK selection
//     const [jkId, setJkId] = useState<string>(initialJKId)

//     // One-open accordion
//     const [openId, setOpenId] = useState<string>('grip')

//     // Viewer output
//     const [bottomPreviewUrl, setBottomPreviewUrl] = useState<string>(initialBottomBG.image)

//     // Derived selections
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

//     /* ---------- Warm cache ---------- */
//     useEffect(() => {
//         const urls: string[] = [selectedBottomBG.image, selectedGrip.image]
//         if (glyphId1 !== 'none' && selectedGlyph1.image) urls.push(selectedGlyph1.image)
//         if (glyphId2 !== 'none' && selectedGlyph2.image) urls.push(selectedGlyph2.image)
//         if (glyphId3 !== 'none' && selectedGlyph3.image) urls.push(selectedGlyph3.image)
//         bottoms.slice(0, 6).forEach((b) => urls.push(b.image))
//         glyphs.slice(0, 3).forEach((g) => urls.push(g.image))
//         glyphs2.slice(0, 3).forEach((g) => urls.push(g.image))
//         glyphs3.slice(0, 3).forEach((g) => urls.push(g.image))
//         urls.forEach((u) => u && loadImageCached(u).catch(() => { }))
//     }, [
//         bottoms,
//         glyphs, glyphs2, glyphs3,
//         selectedBottomBG.image,
//         selectedGrip.image,
//         glyphId1, selectedGlyph1?.image,
//         glyphId2, selectedGlyph2?.image,
//         glyphId3, selectedGlyph3?.image,
//     ])

//     /* ---------- Compositor ---------- */
//     useEffect(() => {
//         let cancelled = false

//         const buildBottom = async () => {
//             try {
//                 if (mode === 'jk' && selectedJK?.image) {
//                     await loadImageCached(selectedJK.image)
//                     if (!cancelled) setBottomPreviewUrl(selectedJK.image)
//                     return
//                 }

//                 // Sources
//                 const bgImg = await loadImageCached(selectedBottomBG.image)

//                 const glyph1Src = glyphId1 !== 'none' ? selectedGlyph1.image : ''
//                 const glyph2Src = glyphId2 !== 'none' ? selectedGlyph2.image : ''
//                 const glyph3Src = glyphId3 !== 'none' ? selectedGlyph3.image : ''

//                 const glyph1Img = glyph1Src ? await loadImageCached(glyph1Src) : null
//                 const glyph2Img = glyph2Src ? await loadImageCached(glyph2Src) : null
//                 const glyph3Img = glyph3Src ? await loadImageCached(glyph3Src) : null

//                 const wantPixel = style === 'pixel'
//                 const tokenSrc = tokenId
//                     ? wantPixel ? buildPixelUrl(tokenId) : buildIllustratedUrl(tokenId)
//                     : ''
//                 const tokenImg = tokenSrc ? await loadImageCached(tokenSrc) : null

//                 // Canvas
//                 // ---- Canvas setup ----
//                 const c = canvasRef.current
//                 if (!c) return

//                 const ctxRaw = c.getContext('2d')
//                 if (!ctxRaw) return
//                 const ctx: CanvasRenderingContext2D = ctxRaw // <-- non-null, use this below

//                 const W = bgImg.naturalWidth || bgImg.width || 1600
//                 const H = bgImg.naturalHeight || bgImg.height || 1600
//                 c.width = W
//                 c.height = H

//                 ctx.clearRect(0, 0, W, H)

//                 // 1) Background
//                 ctx.drawImage(bgImg, 0, 0, W, H)

//                 // Helper: cover-fit + tint + per-glyph transforms (scale & nudge)
//                 const drawGlyph = (
//                     img: HTMLImageElement,
//                     tint: string,
//                     userScale: number, // 1 = base cover size
//                     offX: number,      // px
//                     offY: number,      // px
//                     blend: GlobalCompositeOperation // blend mode
//                 ) => {
//                     const srcW = img.naturalWidth || img.width;
//                     const srcH = img.naturalHeight || img.height;

//                     const baseScale = Math.max(W / srcW, H / srcH);
//                     const s = baseScale * Math.max(0.05, Math.min(10, userScale));
//                     const gW = Math.round(srcW * s);
//                     const gH = Math.round(srcH * s);

//                     const gX = Math.round((W - gW) / 2 + offX);
//                     const gY = Math.round((H - gH) / 2 + offY);

//                     const tmp = document.createElement('canvas');
//                     tmp.width = Math.max(1, gW);
//                     tmp.height = Math.max(1, gH);
//                     const tctx = tmp.getContext('2d');
//                     if (!tctx) return;

//                     tctx.imageSmoothingEnabled = true;
//                     tctx.drawImage(img, 0, 0, gW, gH);
//                     tctx.globalCompositeOperation = 'source-in';
//                     tctx.fillStyle = tint;
//                     tctx.fillRect(0, 0, gW, gH);
//                     tctx.globalCompositeOperation = 'source-over';

//                     // ✅ Apply the blend mode here
//                     ctx.save();
//                     const prev = ctx.globalCompositeOperation;
//                     ctx.globalCompositeOperation = blend;
//                     ctx.drawImage(tmp, gX, gY);
//                     ctx.globalCompositeOperation = prev;
//                     ctx.restore();
//                 };

//                 // 2) Glyphs: under → over
//                 if (glyph1Img) drawGlyph(glyph1Img, glyphTint1, glyph1Scale, glyph1OffsetX, glyph1OffsetY, glyph1Blend);
//                 if (glyph2Img) drawGlyph(glyph2Img, glyphTint2, glyph2Scale, glyph2OffsetX, glyph2OffsetY, glyph2Blend);
//                 if (glyph3Img) drawGlyph(glyph3Img, glyphTint3, glyph3Scale, glyph3OffsetX, glyph3OffsetY, glyph3Blend);

//                 // 3) Token
//                 if (tokenImg && tokenSrc) {
//                     const srcW = tokenImg.naturalWidth || tokenImg.width
//                     const srcH = tokenImg.naturalHeight || tokenImg.height

//                     const wantHorizontal = layout === 'horizontalLeft'
//                     const baseWidthRatio =
//                         style === 'pixel'
//                             ? (wantHorizontal ? 0.5 : 0.55)
//                             : (wantHorizontal ? 0.38 : 0.42)

//                     const scaleMul = Math.max(0.05, Math.min(10, tokenScale))
//                     const tW = W * baseWidthRatio * scaleMul
//                     const tH = (srcH / srcW) * tW

//                     const HSTART = { cx: 675, cy: 700 }

//                     if (wantHorizontal) {
//                         const cx = Math.round(HSTART.cx + offsetX)
//                         const cy = Math.round(HSTART.cy + offsetY)

//                         const prev = ctx.imageSmoothingEnabled
//                         ctx.imageSmoothingEnabled = !(style === 'pixel')
//                         ctx.save()
//                         ctx.translate(cx, cy)
//                         ctx.rotate(Math.PI / 2)
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

//                 const url = c.toDataURL('image/png')
//                 if (!cancelled) setBottomPreviewUrl(url)
//             } catch {
//                 if (!cancelled) setBottomPreviewUrl((prev) => prev)
//             }
//         }

//         buildBottom()
//         return () => { cancelled = true }
//     }, [
//         mode,
//         selectedJK?.image,
//         selectedBottomBG.image,
//         glyphId1, glyphTint1, selectedGlyph1?.image, glyph1Scale, glyph1OffsetX, glyph1OffsetY, glyph1Blend,
//         glyphId2, glyphTint2, selectedGlyph2?.image, glyph2Scale, glyph2OffsetX, glyph2OffsetY, glyph2Blend,
//         glyphId3, glyphTint3, selectedGlyph3?.image, glyph3Scale, glyph3OffsetX, glyph3OffsetY, glyph3Blend,
//         tokenId, style, tokenScale, offsetX, offsetY,
//     ])

//     // helpers
//     const controlsDisabled = mode === 'jk'
//     const nudge = (setter: React.Dispatch<React.SetStateAction<number>>, delta: number) =>
//         setter((v) => v + delta)

//     return (
//         <div className="grid gap-6 sm:grid-cols-[380px_minmax(0,1fr)] items-stretch">
//             {/* Settings */}
//             <aside className="h-full lg:sticky lg:top-6 h-fit p-2 lg:p-4">
//                 <div className="space-y-3">
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
//                                 className={`px-5 py-2 text-sm font-medium rounded-full transition-all duration-200
//                   ${mode === 'custom' ? 'bg-[#d12429] text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-300'}
//                 `}
//                             >
//                                 Custom
//                             </button>
//                         </div>
//                     )}

//                     <div key={`accordion-stack-${mode}`}>
//                         {/* Grip */}
//                         <AccordionSection
//                             title="Grip Tape"
//                             open={openId === 'grip'}
//                             onToggle={(next) => setOpenId(next ? 'grip' : '')}
//                         >
//                             <OptionsGrid>
//                                 {grips.map((g) => (
//                                     <OptionTile
//                                         key={g.id}
//                                         label={g.name}
//                                         image={g.image}
//                                         selected={gripId === g.id}
//                                         onClick={() => setGripId(g.id)}
//                                     />
//                                 ))}
//                             </OptionsGrid>
//                         </AccordionSection>

//                         {/* Custom-only */}
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

//                                 {/* Glyph 1 */}
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
//                                             <>
//                                                 <Field labelText="Glyph 1 Tint">
//                                                     <input type="color" value={glyphTint1} onChange={(e) => setGlyphTint1(e.target.value)} />
//                                                 </Field>
//                                                 <Field labelText="Glyph 1 Blend">
//                                                     <select
//                                                         className="input"
//                                                         value={glyph1Blend}
//                                                         onChange={(e) => setGlyph1Blend(e.target.value as GlobalCompositeOperation)}
//                                                         title="How the tinted glyph mixes with the background"
//                                                     >
//                                                         {BLEND_MODES.map((m) => (
//                                                             <option key={m} value={m}>{m}</option>
//                                                         ))}
//                                                     </select>
//                                                     <p className="text-xs text-neutral-500">
//                                                         Tip: <code>multiply</code> darkens (ink look), <code>screen</code> brightens (glow), <code>overlay</code> boosts contrast.
//                                                     </p>
//                                                 </Field>

//                                                 <Field labelText="Glyph 1 Scale">
//                                                     <div className="flex items-center gap-2">
//                                                         <input
//                                                             className="input w-28"
//                                                             type="number"
//                                                             step={0.25}
//                                                             min={0.1}
//                                                             max={5}
//                                                             value={glyph1Scale}
//                                                             onChange={(e) =>
//                                                                 setGlyph1Scale(Math.max(0.1, Math.min(5, Number(e.target.value) || 1)))
//                                                             }
//                                                             title="Multiply the base size"
//                                                         />
//                                                         <input
//                                                             className="w-full accent-neutral-800"
//                                                             type="range"
//                                                             min={0.1}
//                                                             max={5}
//                                                             step={0.25}
//                                                             value={glyph1Scale}
//                                                             onChange={(e) => setGlyph1Scale(Number(e.target.value))}
//                                                             title="Drag to scale"
//                                                         />
//                                                         <button type="button" className="btn btn-ghost" onClick={() => setGlyph1Scale(1)}>
//                                                             Reset
//                                                         </button>
//                                                     </div>
//                                                 </Field>

//                                                 <Field labelText="Glyph 1 Nudge">
//                                                     <div className="grid grid-cols-3 gap-2 w-[220px]">
//                                                         <div />
//                                                         <button type="button" className="btn" onClick={() => setGlyph1OffsetY(v => v - nudgeValue)}>↑</button>
//                                                         <div />
//                                                         <button type="button" className="btn" onClick={() => setGlyph1OffsetX(v => v - nudgeValue)}>←</button>
//                                                         <button
//                                                             type="button"
//                                                             className="btn btn-ghost"
//                                                             onClick={() => { setGlyph1OffsetX(0); setGlyph1OffsetY(0) }}
//                                                         >
//                                                             •
//                                                         </button>
//                                                         <button type="button" className="btn" onClick={() => setGlyph1OffsetX(v => v + nudgeValue)}>→</button>
//                                                         <div />
//                                                         <button type="button" className="btn" onClick={() => setGlyph1OffsetY(v => v + nudgeValue)}>↓</button>
//                                                         <div />
//                                                     </div>
//                                                     <div className="flex items-center gap-3 pt-2 text-xs text-neutral-600">
//                                                         <span>X: {glyph1OffsetX}px</span>
//                                                         <span>Y: {glyph1OffsetY}px</span>
//                                                         <button
//                                                             type="button"
//                                                             className="btn btn-ghost btn-sm"
//                                                             onClick={() => { setGlyph1OffsetX(0); setGlyph1OffsetY(0) }}
//                                                         >
//                                                             Reset
//                                                         </button>
//                                                     </div>
//                                                 </Field>
//                                             </>
//                                         )}
//                                     </div>
//                                 </AccordionSection>

//                                 {/* Glyph 2 */}
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
//                                             <>
//                                                 <Field labelText="Glyph 2 Tint">
//                                                     <input type="color" value={glyphTint2} onChange={(e) => setGlyphTint2(e.target.value)} />
//                                                 </Field>
//                                                 <Field labelText="Glyph 2 Blend">
//                                                     <select
//                                                         className="input"
//                                                         value={glyph2Blend}
//                                                         onChange={(e) => setGlyph2Blend(e.target.value as GlobalCompositeOperation)}
//                                                         title="How the tinted glyph mixes with the background"
//                                                     >
//                                                         {BLEND_MODES.map((m) => (
//                                                             <option key={m} value={m}>{m}</option>
//                                                         ))}
//                                                     </select>
//                                                     <p className="text-xs text-neutral-500">
//                                                         Tip: <code>multiply</code> darkens (ink look), <code>screen</code> brightens (glow), <code>overlay</code> boosts contrast.
//                                                     </p>
//                                                 </Field>
//                                                 <Field labelText="Glyph 2 Scale">
//                                                     <div className="flex items-center gap-2">
//                                                         <input
//                                                             className="input w-28"
//                                                             type="number"
//                                                             step={0.25}
//                                                             min={0.1}
//                                                             max={5}
//                                                             value={glyph2Scale}
//                                                             onChange={(e) =>
//                                                                 setGlyph2Scale(Math.max(0.1, Math.min(5, Number(e.target.value) || 1)))
//                                                             }
//                                                             title="Multiply the base size"
//                                                         />
//                                                         <input
//                                                             className="w-full accent-neutral-800"
//                                                             type="range"
//                                                             min={0.1}
//                                                             max={5}
//                                                             step={0.25}
//                                                             value={glyph2Scale}
//                                                             onChange={(e) => setGlyph2Scale(Number(e.target.value))}
//                                                             title="Drag to scale"
//                                                         />
//                                                         <button type="button" className="btn btn-ghost" onClick={() => setGlyph2Scale(1)}>
//                                                             Reset
//                                                         </button>
//                                                     </div>
//                                                 </Field>

//                                                 <Field labelText="Glyph 2 Nudge">
//                                                     <div className="grid grid-cols-3 gap-2 w-[220px]">
//                                                         <div />
//                                                         <button type="button" className="btn" onClick={() => setGlyph2OffsetY(v => v - nudgeValue)}>↑</button>
//                                                         <div />
//                                                         <button type="button" className="btn" onClick={() => setGlyph2OffsetX(v => v - nudgeValue)}>←</button>
//                                                         <button
//                                                             type="button"
//                                                             className="btn btn-ghost"
//                                                             onClick={() => { setGlyph2OffsetX(0); setGlyph2OffsetY(0) }}
//                                                         >
//                                                             •
//                                                         </button>
//                                                         <button type="button" className="btn" onClick={() => setGlyph2OffsetX(v => v + nudgeValue)}>→</button>
//                                                         <div />
//                                                         <button type="button" className="btn" onClick={() => setGlyph2OffsetY(v => v + nudgeValue)}>↓</button>
//                                                         <div />
//                                                     </div>
//                                                     <div className="flex items-center gap-3 pt-2 text-xs text-neutral-600">
//                                                         <span>X: {glyph2OffsetX}px</span>
//                                                         <span>Y: {glyph2OffsetY}px</span>
//                                                         <button
//                                                             type="button"
//                                                             className="btn btn-ghost btn-sm"
//                                                             onClick={() => { setGlyph2OffsetX(0); setGlyph2OffsetY(0) }}
//                                                         >
//                                                             Reset
//                                                         </button>
//                                                     </div>
//                                                 </Field>
//                                             </>
//                                         )}
//                                     </div>
//                                 </AccordionSection>

//                                 {/* Glyph 3 (NEW) */}
//                                 <AccordionSection
//                                     title="Glyph Layer 3"
//                                     open={openId === 'glyph3'}
//                                     onToggle={(next) => setOpenId(next ? 'glyph3' : '')}
//                                 >
//                                     <div className="space-y-3">
//                                         <OptionsGrid>
//                                             {glyphs3WithNone.map((g) => (
//                                                 <OptionTile
//                                                     key={`g3-${g.id}`}
//                                                     label={g.name}
//                                                     image={g.image}
//                                                     selected={glyphId3 === g.id}
//                                                     onClick={() => setGlyphId3(g.id)}
//                                                 />
//                                             ))}
//                                         </OptionsGrid>

//                                         {glyphId3 !== 'none' && (
//                                             <>
//                                                 <div className="flex items-end gap-4">
//                                                     <Field labelText="Tint" className="w-[88px]">
//                                                         <input
//                                                             type="color"
//                                                             value={glyphTint3}
//                                                             onChange={(e) => setGlyphTint3(e.target.value)}
//                                                             className="
//         h-11 w-full rounded-md border border-neutral-300 p-0 cursor-pointer
//         [&::-webkit-color-swatch-wrapper]:p-0
//         [&::-webkit-color-swatch]:border-0
//         [&::-moz-color-swatch]:border-0
//       "
//                                                             title="Pick tint"
//                                                         />
//                                                     </Field>

//                                                     <Field labelText="Blend Mode" className="flex-1">
//                                                         <select
//                                                             className="input h-11"
//                                                             value={glyph3Blend}
//                                                             onChange={(e) => setGlyph3Blend(e.target.value as GlobalCompositeOperation)}
//                                                             title="How the tinted glyph mixes with the background"
//                                                         >
//                                                             {BLEND_MODES.map((m) => (
//                                                                 <option key={m} value={m}>{m}</option>
//                                                             ))}
//                                                         </select>
//                                                     </Field>
//                                                 </div>
//                                                 <Field labelText="Scale">
//                                                     <div className="flex items-center gap-2">
//                                                         <input
//                                                             className="input w-28"
//                                                             type="number"
//                                                             step={0.25}
//                                                             min={0.1}
//                                                             max={5}
//                                                             value={glyph3Scale}
//                                                             onChange={(e) =>
//                                                                 setGlyph3Scale(Math.max(0.1, Math.min(5, Number(e.target.value) || 1)))
//                                                             }
//                                                             title="Multiply the base size"
//                                                         />
//                                                         <input
//                                                             className="w-full accent-neutral-800"
//                                                             type="range"
//                                                             min={0.1}
//                                                             max={5}
//                                                             step={0.25}
//                                                             value={glyph3Scale}
//                                                             onChange={(e) => setGlyph3Scale(Number(e.target.value))}
//                                                             title="Drag to scale"
//                                                         />
//                                                         <button type="button" className="btn btn-ghost" onClick={() => setGlyph3Scale(1)}>
//                                                             Reset
//                                                         </button>
//                                                     </div>
//                                                 </Field>

//                                                 <Field labelText="Nudge">
//                                                     <div className="grid grid-cols-3 gap-2 w-[220px]">
//                                                         <div />
//                                                         <button type="button" className="btn" onClick={() => setGlyph3OffsetY(v => v - nudgeValue)}>↑</button>
//                                                         <div />
//                                                         <button type="button" className="btn" onClick={() => setGlyph3OffsetX(v => v - nudgeValue)}>←</button>
//                                                         <button
//                                                             type="button"
//                                                             className="btn btn-ghost"
//                                                             onClick={() => { setGlyph3OffsetX(0); setGlyph3OffsetY(0) }}
//                                                         >
//                                                             •
//                                                         </button>
//                                                         <button type="button" className="btn" onClick={() => setGlyph3OffsetX(v => v + nudgeValue)}>→</button>
//                                                         <div />
//                                                         <button type="button" className="btn" onClick={() => setGlyph3OffsetY(v => v + nudgeValue)}>↓</button>
//                                                         <div />
//                                                     </div>
//                                                     <div className="flex items-center gap-3 pt-2 text-xs text-neutral-600">
//                                                         <span>X: {glyph3OffsetX}px</span>
//                                                         <span>Y: {glyph3OffsetY}px</span>
//                                                         <button
//                                                             type="button"
//                                                             className="btn btn-ghost btn-sm"
//                                                             onClick={() => { setGlyph3OffsetX(0); setGlyph3OffsetY(0) }}
//                                                         >
//                                                             Reset
//                                                         </button>
//                                                     </div>
//                                                 </Field>
//                                             </>
//                                         )}
//                                     </div>
//                                 </AccordionSection>

//                                 Token
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
//                                             <p className="text-xs text-neutral-500">Token is composited onto the selected background.</p>
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
//                                                 <button type="button" className="btn btn-ghost" onClick={() => setTokenScale(1)} title="Reset">
//                                                     Reset
//                                                 </button>
//                                             </div>
//                                         </Field>

//                                         <Field labelText="Nudge Position">
//                                             <div className="grid grid-cols-3 gap-2 w-[220px]">
//                                                 <div />
//                                                 <button type="button" className="btn" onClick={() => setOffsetY(v => v - nudgeValue)} title="Up">↑</button>
//                                                 <div />
//                                                 <button type="button" className="btn" onClick={() => setOffsetX(v => v - nudgeValue)} title="Left">←</button>
//                                                 <button
//                                                     type="button"
//                                                     className="btn btn-ghost"
//                                                     onClick={() => { setOffsetX(0); setOffsetY(0) }}
//                                                     title="Center"
//                                                 >•</button>
//                                                 <button type="button" className="btn" onClick={() => setOffsetX(v => v + nudgeValue)} title="Right">→</button>
//                                                 <div />
//                                                 <button type="button" className="btn" onClick={() => setOffsetY(v => v + nudgeValue)} title="Down">↓</button>
//                                                 <div />
//                                             </div>
//                                             <div className="flex items-center gap-3 pt-2 text-xs text-neutral-600">
//                                                 <span>X: {offsetX}px</span>
//                                                 <span>Y: {offsetY}px</span>
//                                                 <button
//                                                     type="button"
//                                                     className="btn btn-ghost btn-sm"
//                                                     onClick={() => { setOffsetX(0); setOffsetY(0) }}
//                                                 >
//                                                     Reset
//                                                 </button>
//                                             </div>
//                                         </Field>
//                                     </div>
//                                 </AccordionSection>
//                             </>
//                         )}

//                         {/* JK-only */}
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
//                                             <option key={d.id} value={d.id}>{d.name}</option>
//                                         ))}
//                                     </select>
//                                     <p className="text-xs text-neutral-500">Fixed artwork; token and glyph controls are hidden.</p>
//                                 </Field>
//                             </AccordionSection>
//                         )}
//                     </div>

//                     <div className="text-xs text-neutral-500 pt-2">
//                         Preview is web-resolution; final print assets are prepared offline.
//                     </div>
//                 </div>
//             </aside>

//             {/* Preview */}
//             <section className="rounded-2xl border shadow-sm p-4 lg:p-5">
//                 <div className="rounded-xl bg-white overflow-hidden">
//                     <DeckViewerMinimal topUrl={selectedGrip.image} bottomUrl={bottomPreviewUrl} />
//                 </div>
//             </section>
//         </div>
//     )
// }


// // src/components/DeckComposer.tsx
// 'use client'

// import { useEffect, useMemo, useRef, useState } from 'react'
// import Image from 'next/image'
// import DeckViewerMinimal from './DeckViewerMinimal'
// import { ChevronDown } from 'lucide-react'

// /* ---------- Types (image-only bottoms) ---------- */
// export type GripOption = { id: string; name: string; image: string }
// export type BottomOption = { id: string; name: string; image: string }
// export type JKDesign = { id: string; name: string; image: string }
// export type GlyphOption = { id: string; name: string; image: string }

// export type DeckComposerConfig = {
//     collectionKey: string
//     grips: GripOption[]
//     bottoms: BottomOption[]
//     glyphs?: GlyphOption[]      // Glyph layer 1
//     glyphs2?: GlyphOption[]     // Glyph layer 2
//     jkDesigns?: JKDesign[]
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
//     label,
//     selected,
//     onClick,
// }: {
//     image: string
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
//                 <Image src={image} alt={label} fill sizes="56px" style={{ objectFit: 'cover' }} />
//             </div>
//             <div className="mt-2 text-xs text-center leading-tight line-clamp-2 h-[2.25rem]">
//                 {label}
//             </div>
//         </button>
//     )
// }

// function OptionsGrid({ children }: { children: React.ReactNode }) {
//     return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
// }

// /** One-open-at-a-time accordion (controlled) */
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
//                 <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
//             </button>

//             <div
//                 className={`
//           overflow-hidden transition-[max-height,opacity,transform]
//           duration-300 ease-in-out
//           ${isOpen ? 'max-h-[1200px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-1'}
//         `}
//             >
//                 <div className="bg-neutral-100 rounded-2xl px-4 py-4 shadow-inner">{children}</div>
//             </div>
//         </div>
//     )
// }

// /* ---------- Env-only bases ---------- */
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

// /* ---------- Image loader (cache + decode) ---------- */
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
//                     // @ ts-expect-error decode may not exist
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

//     // Modes & selections
//     const [mode, setMode] = useState<BuildMode>(hasJK ? 'jk' : 'custom')
//     const [gripId, setGripId] = useState<string>(initialGrip.id)
//     const [bottomBgId, setBottomBgId] = useState<string>(initialBottomBG.id)

//     // Glyph layers (with "None")
//     const glyphs1WithNone = useMemo<GlyphOption[]>(
//         () => [{ id: 'none', name: 'None', image: '/deckAssets/moonbirds/none.png' }, ...glyphs],
//         [glyphs]
//     )
//     const glyphs2WithNone = useMemo<GlyphOption[]>(
//         () => [{ id: 'none', name: 'None', image: '/deckAssets/moonbirds/none.png' }, ...glyphs2],
//         [glyphs2]
//     )
//     const [glyphId1, setGlyphId1] = useState<string>('none')
//     const [glyphTint1, setGlyphTint1] = useState('#ff1a1a')
//     const [glyphId2, setGlyphId2] = useState<string>('none')
//     const [glyphTint2, setGlyphTint2] = useState('#ffffff')

//     const selectedGlyph1 = glyphs1WithNone.find((g) => g.id === glyphId1) ?? glyphs1WithNone[0]
//     const selectedGlyph2 = glyphs2WithNone.find((g) => g.id === glyphId2) ?? glyphs2WithNone[0]

//     // Token transform
//     const [tokenId, setTokenId] = useState<string>('') // moonbird ID
//     const [style, setStyle] = useState<'illustrated' | 'pixel'>('illustrated')
//     const layout: LayoutMode = 'horizontalLeft'
//     const [tokenScale, setTokenScale] = useState<number>(3.25)
//     const [offsetX, setOffsetX] = useState<number>(-40)
//     const [offsetY, setOffsetY] = useState<number>(60)
//     const nudgeValue = 50

//     // --- Glyph 1 transforms ---
//     const [glyph1Scale, setGlyph1Scale] = useState<number>(1);
//     const [glyph1OffsetX, setGlyph1OffsetX] = useState<number>(0);
//     const [glyph1OffsetY, setGlyph1OffsetY] = useState<number>(0);

//     // --- Glyph 2 transforms ---
//     const [glyph2Scale, setGlyph2Scale] = useState<number>(1);
//     const [glyph2OffsetX, setGlyph2OffsetX] = useState<number>(0);
//     const [glyph2OffsetY, setGlyph2OffsetY] = useState<number>(0);



//     // JK selection
//     const [jkId, setJkId] = useState<string>(initialJKId)

//     // One-open accordion
//     const [openId, setOpenId] = useState<string>('grip')

//     // Viewer output
//     const [bottomPreviewUrl, setBottomPreviewUrl] = useState<string>(initialBottomBG.image)

//     // Derived selections
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

//     /* ---------- Warm cache ---------- */
//     useEffect(() => {
//         const urls: string[] = [selectedBottomBG.image, selectedGrip.image]
//         if (glyphId1 !== 'none' && selectedGlyph1.image) urls.push(selectedGlyph1.image)
//         if (glyphId2 !== 'none' && selectedGlyph2.image) urls.push(selectedGlyph2.image)
//         bottoms.slice(0, 6).forEach((b) => urls.push(b.image))
//         glyphs.slice(0, 3).forEach((g) => urls.push(g.image))
//         glyphs2.slice(0, 3).forEach((g) => urls.push(g.image))
//         urls.forEach((u) => u && loadImageCached(u).catch(() => { }))
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

//     /* ---------- Compositor (restored scaling/positioning) ---------- */
//     useEffect(() => {
//         let cancelled = false

//         const buildBottom = async () => {
//             try {
//                 // JK mode = fixed artwork
//                 if (mode === 'jk' && selectedJK?.image) {
//                     await loadImageCached(selectedJK.image)
//                     if (!cancelled) setBottomPreviewUrl(selectedJK.image)
//                     return
//                 }

//                 // ---- Load sources ----
//                 const bgImg = await loadImageCached(selectedBottomBG.image)

//                 const glyph1Src = glyphId1 !== 'none' ? selectedGlyph1.image : ''
//                 const glyph2Src = glyphId2 !== 'none' ? selectedGlyph2.image : ''

//                 const glyph1Img = glyph1Src ? await loadImageCached(glyph1Src) : null
//                 const glyph2Img = glyph2Src ? await loadImageCached(glyph2Src) : null

//                 const wantPixel = style === 'pixel'
//                 const tokenSrc = tokenId
//                     ? wantPixel
//                         ? buildPixelUrl(tokenId)
//                         : buildIllustratedUrl(tokenId)
//                     : ''
//                 const tokenImg = tokenSrc ? await loadImageCached(tokenSrc) : null

//                 // ---- Canvas setup ----
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

//                 // Helper: cover-fit + tint + per-glyph transforms (scale & nudge)
//                 function drawGlyph(
//                     img: HTMLImageElement,
//                     tint: string,
//                     userScale: number, // 1 = base cover size
//                     offX: number,      // px
//                     offY: number       // px
//                 ) {
//                     const srcW = img.naturalWidth || img.width
//                     const srcH = img.naturalHeight || img.height

//                     // Base = COVER fit to canvas
//                     const baseScale = Math.max(W / srcW, H / srcH)
//                     const s = baseScale * Math.max(0.05, Math.min(10, userScale)) // guardrails
//                     const gW = Math.round(srcW * s)
//                     const gH = Math.round(srcH * s)

//                     // Center, then apply nudges
//                     const gX = Math.round((W - gW) / 2 + offX)
//                     const gY = Math.round((H - gH) / 2 + offY)

//                     // Tint via temp canvas (keeps original look)
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

//                     if (!ctx) return
//                     ctx.drawImage(tmp, gX, gY)
//                 }

//                 // 2) Glyphs (under then over)
//                 if (glyph1Img) drawGlyph(glyph1Img, glyphTint1, glyph1Scale, glyph1OffsetX, glyph1OffsetY)
//                 if (glyph2Img) drawGlyph(glyph2Img, glyphTint2, glyph2Scale, glyph2OffsetX, glyph2OffsetY)

//                 // 3) Token (preserve aspect, original base sizing/position)
//                 if (tokenImg && tokenSrc) {
//                     const srcW = tokenImg.naturalWidth || tokenImg.width
//                     const srcH = tokenImg.naturalHeight || tokenImg.height

//                     const wantHorizontal = layout === 'horizontalLeft'
//                     const baseWidthRatio =
//                         style === 'pixel'
//                             ? (wantHorizontal ? 0.5 : 0.55)
//                             : (wantHorizontal ? 0.38 : 0.42)

//                     const scaleMul = Math.max(0.05, Math.min(10, tokenScale))
//                     const tW = W * baseWidthRatio * scaleMul
//                     const tH = (srcH / srcW) * tW

//                     const HSTART = { cx: 675, cy: 700 }

//                     if (wantHorizontal) {
//                         const cx = Math.round(HSTART.cx + offsetX)
//                         const cy = Math.round(HSTART.cy + offsetY)

//                         const prev = ctx.imageSmoothingEnabled
//                         ctx.imageSmoothingEnabled = !(style === 'pixel')
//                         ctx.save()
//                         ctx.translate(cx, cy)
//                         ctx.rotate(Math.PI / 2)
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

//                 // 4) Swap
//                 const url = c.toDataURL('image/png')
//                 if (!cancelled) setBottomPreviewUrl(url)
//             } catch {
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
//         // glyphs (layer 1)
//         glyphId1,
//         glyphTint1,
//         selectedGlyph1?.image,
//         glyph1Scale,
//         glyph1OffsetX,
//         glyph1OffsetY,
//         // glyphs (layer 2)
//         glyphId2,
//         glyphTint2,
//         selectedGlyph2?.image,
//         glyph2Scale,
//         glyph2OffsetX,
//         glyph2OffsetY,
//         // token
//         tokenId,
//         style,
//         tokenScale,
//         offsetX,
//         offsetY,
//     ])

//     // helpers
//     const bump = (setter: React.Dispatch<React.SetStateAction<number>>, delta: number) => {
//         setter((v) => v + delta)
//     }
//     const controlsDisabled = mode === 'jk'

//     return (
//         <div className="grid gap-6 sm:grid-cols-[380px_minmax(0,1fr)] items-stretch">
//             {/* Settings */}
//             <aside className="h-full lg:sticky lg:top-6 h-fit p-2 lg:p-4">
//                 <div className="space-y-3">
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
//                                 className={`px-5 py-2 text-sm font-medium rounded-full transition-all duration-200
//                   ${mode === 'custom' ? 'bg-[#d12429] text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-300'}
//                 `}
//                             >
//                                 Custom
//                             </button>
//                         </div>
//                     )}

//                     <div key={`accordion-stack-${mode}`}>
//                         {/* Grip */}
//                         <AccordionSection
//                             title="Grip Tape"
//                             open={openId === 'grip'}
//                             onToggle={(next) => setOpenId(next ? 'grip' : '')}
//                         >
//                             <OptionsGrid>
//                                 {grips.map((g) => (
//                                     <OptionTile
//                                         key={g.id}
//                                         label={g.name}
//                                         image={g.image}
//                                         selected={gripId === g.id}
//                                         onClick={() => setGripId(g.id)}
//                                     />
//                                 ))}
//                             </OptionsGrid>
//                         </AccordionSection>

//                         {/* Custom-only */}
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

//                                 {/* Glyph 1 */}
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
//                                                 <input type="color" value={glyphTint1} onChange={(e) => setGlyphTint1(e.target.value)} />
//                                             </Field>
//                                         )}
//                                         {/* Scale */}
//                                         <Field labelText="Glyph 1 Scale">
//                                             <div className="flex items-center gap-2">
//                                                 <input
//                                                     className="input w-28"
//                                                     type="number"
//                                                     step={0.1}
//                                                     min={0.1}
//                                                     max={3}
//                                                     value={glyph1Scale}
//                                                     onChange={(e) =>
//                                                         setGlyph1Scale(Math.max(0.1, Math.min(3, Number(e.target.value) || 1)))
//                                                     }
//                                                     title="Multiply the base size"
//                                                 />
//                                                 <input
//                                                     className="w-full accent-neutral-800"
//                                                     type="range"
//                                                     min={0.1}
//                                                     max={5}
//                                                     step={0.1}
//                                                     value={glyph1Scale}
//                                                     onChange={(e) => setGlyph1Scale(Number(e.target.value))}
//                                                     title="Drag to scale"
//                                                 />
//                                                 <button type="button" className="btn btn-ghost" onClick={() => setGlyph1Scale(1)}>
//                                                     Reset
//                                                 </button>
//                                             </div>
//                                         </Field>

//                                         {/* Nudge */}
//                                         <Field labelText="Glyph 1 Nudge">
//                                             <div className="grid grid-cols-3 gap-2 w-[220px]">
//                                                 <div />
//                                                 <button type="button" className="btn" onClick={() => setGlyph1OffsetX(glyph1OffsetX + nudgeValue)}>↑</button>
//                                                 <div />
//                                                 <button type="button" className="btn" onClick={() => setGlyph1OffsetY(glyph1OffsetY - nudgeValue)}>←</button>
//                                                 <button
//                                                     type="button"
//                                                     className="btn btn-ghost"
//                                                     onClick={() => { setGlyph1OffsetX(0); setGlyph1OffsetY(0) }}
//                                                 >
//                                                     •
//                                                 </button>
//                                                 <button type="button" className="btn" onClick={() => setGlyph1OffsetY(glyph1OffsetY+ nudgeValue)}>→</button>
//                                                 <div />
//                                                 <button type="button" className="btn" onClick={() => setGlyph1OffsetX(glyph1OffsetX - nudgeValue)}>↓</button>
//                                                 <div />
//                                             </div>
//                                             <div className="flex items-center gap-3 pt-2 text-xs text-neutral-600">
//                                                 <span>X: {glyph1OffsetX}px</span>
//                                                 <span>Y: {glyph1OffsetY}px</span>
//                                                 <button
//                                                     type="button"
//                                                     className="btn btn-ghost btn-sm"
//                                                     onClick={() => { setGlyph1OffsetX(0); setGlyph1OffsetY(0) }}
//                                                 >
//                                                     Reset
//                                                 </button>
//                                             </div>
//                                         </Field>
//                                     </div>
//                                 </AccordionSection>

//                                 {/* Glyph 2 */}
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
//                                                 <input type="color" value={glyphTint2} onChange={(e) => setGlyphTint2(e.target.value)} />
//                                             </Field>
//                                         )}
//                                         {/* Scale */}
//                                         <Field labelText="Glyph 2 Scale">
//                                             <div className="flex items-center gap-2">
//                                                 <input
//                                                     className="input w-28"
//                                                     type="number"
//                                                     step={0.1}
//                                                     min={0.1}
//                                                     max={3}
//                                                     value={glyph2Scale}
//                                                     onChange={(e) =>
//                                                         setGlyph2Scale(Math.max(0.1, Math.min(3, Number(e.target.value) || 1)))
//                                                     }
//                                                     title="Multiply the base size"
//                                                 />
//                                                 <input
//                                                     className="w-full accent-neutral-800"
//                                                     type="range"
//                                                     min={0.1}
//                                                     max={3}
//                                                     step={0.1}
//                                                     value={glyph2Scale}
//                                                     onChange={(e) => setGlyph2Scale(Number(e.target.value))}
//                                                     title="Drag to scale"
//                                                 />
//                                                 <button type="button" className="btn btn-ghost" onClick={() => setGlyph2Scale(1)}>
//                                                     Reset
//                                                 </button>
//                                             </div>
//                                         </Field>

//                                         {/* Nudge */}
//                                         <Field labelText="Glyph 1 Nudge">
//                                             <div className="grid grid-cols-3 gap-2 w-[220px]">
//                                                 <div />
//                                                 <button type="button" className="btn" onClick={() => setGlyph2OffsetX(glyph2OffsetX + nudgeValue)}>↑</button>
//                                                 <div />
//                                                 <button type="button" className="btn" onClick={() => setGlyph2OffsetY(glyph2OffsetY - nudgeValue)}>←</button>
//                                                 <button
//                                                     type="button"
//                                                     className="btn btn-ghost"
//                                                     onClick={() => { setGlyph2OffsetX(0); setGlyph2OffsetY(0) }}
//                                                 >
//                                                     •
//                                                 </button>
//                                                 <button type="button" className="btn" onClick={() => setGlyph2OffsetY(glyph2OffsetY + nudgeValue)}>→</button>
//                                                 <div />
//                                                 <button type="button" className="btn" onClick={() => setGlyph2OffsetX(glyph2OffsetX - nudgeValue)}>↓</button>
//                                                 <div />
//                                             </div>
//                                             <div className="flex items-center gap-3 pt-2 text-xs text-neutral-600">
//                                                 <span>X: {glyph1OffsetX}px</span>
//                                                 <span>Y: {glyph1OffsetY}px</span>
//                                                 <button
//                                                     type="button"
//                                                     className="btn btn-ghost btn-sm"
//                                                     onClick={() => { setGlyph1OffsetX(0); setGlyph1OffsetY(0) }}
//                                                 >
//                                                     Reset
//                                                 </button>
//                                             </div>
//                                         </Field>
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
//                                             <p className="text-xs text-neutral-500">Token is composited onto the selected background.</p>
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
//                                                 <button type="button" className="btn btn-ghost" onClick={() => setTokenScale(1)} title="Reset">
//                                                     Reset
//                                                 </button>
//                                             </div>
//                                         </Field>

//                                         <Field labelText="Nudge Position">
//                                             <div className="grid grid-cols-3 gap-2 w-[220px]">
//                                                 <div />
//                                                 <button type="button" className="btn" onClick={() => bump(setOffsetX, nudgeValue)} title="Up">↑</button>
//                                                 <div />
//                                                 <button type="button" className="btn" onClick={() => bump(setOffsetY, -nudgeValue)} title="Left">←</button>
//                                                 <button
//                                                     type="button"
//                                                     className="btn btn-ghost"
//                                                     onClick={() => { setOffsetX(0); setOffsetY(0) }}
//                                                     title="Center"
//                                                 >•</button>
//                                                 <button type="button" className="btn" onClick={() => bump(setOffsetY, nudgeValue)} title="Right">→</button>
//                                                 <div />
//                                                 <button type="button" className="btn" onClick={() => bump(setOffsetX, -nudgeValue)} title="Down">↓</button>
//                                                 <div />
//                                             </div>
//                                             <div className="flex items-center gap-3 pt-2 text-xs text-neutral-600">
//                                                 <span>X: {offsetX}px</span>
//                                                 <span>Y: {offsetY}px</span>
//                                                 <button
//                                                     type="button"
//                                                     className="btn btn-ghost btn-sm"
//                                                     onClick={() => { setOffsetX(0); setOffsetY(0) }}
//                                                 >
//                                                     Reset
//                                                 </button>
//                                             </div>
//                                         </Field>
//                                     </div>
//                                 </AccordionSection>
//                             </>
//                         )}

//                         {/* JK-only */}
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
//                                             <option key={d.id} value={d.id}>{d.name}</option>
//                                         ))}
//                                     </select>
//                                     <p className="text-xs text-neutral-500">Fixed artwork; token and glyph controls are hidden.</p>
//                                 </Field>
//                             </AccordionSection>
//                         )}
//                     </div>

//                     <div className="text-xs text-neutral-500 pt-2">
//                         Preview is web-resolution; final print assets are prepared offline.
//                     </div>
//                 </div>
//             </aside>

//             {/* Preview */}
//             <section className="rounded-2xl border shadow-sm p-4 lg:p-5">
//                 <div className="rounded-xl bg-white overflow-hidden">
//                     <DeckViewerMinimal topUrl={selectedGrip.image} bottomUrl={bottomPreviewUrl} />
//                 </div>
//             </section>
//         </div>
//     )
// }


