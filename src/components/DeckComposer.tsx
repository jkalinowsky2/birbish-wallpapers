// src/components/DeckComposer.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import DeckViewerMinimal from './DeckViewerMinimal'
import { ChevronDown } from 'lucide-react'
import { RotateCw, RotateCcw, RotateCcwSquare } from "lucide-react"

function getFontFaceSet(): FontFaceSet | null {
    if (typeof document === 'undefined') return null; // SSR guard
    const d = document as Document & Partial<{ fonts: FontFaceSet }>;
    return d.fonts ?? null;
}

async function ensureFontLoaded(faceName: string, sample = 'BIRB') {
    const fonts = getFontFaceSet();
    if (!fonts) return;
    try {
        await fonts.load(`16px "${faceName}"`, sample);
        await fonts.ready;
    } catch {
        // ignore load errors; fall back to normal paint
    }
}

/* ---------- Types (image-only bottoms) ---------- */
export type GripOption = { id: string; name: string; image: string }
export type BottomOption = { id: string; name: string; image: string }
export type JKDesign = { id: string; name: string; image: string }
export type GlyphOption = { id: string; name: string; image: string; tintMode?: 'any' | 'brand' | 'none'; }

export type DeckComposerConfig = {
    collectionKey: string
    grips: GripOption[]
    bottoms: BottomOption[]
    glyphs?: GlyphOption[]      // Layer 1
    glyphs2?: GlyphOption[]     // Layer 2
    glyphs3?: GlyphOption[]     // Layer 3 (new)
    glyphs4?: GlyphOption[]     // Layer 3 (new)
    glyphs5?: GlyphOption[]
    glyphs6?: GlyphOption[]
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
        <label className={`inline-flex flex-col gap-2 ${className ?? ''}`}>
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
    thumbClassName = 'w-14 h-14',
}: {
    image: string
    label: string
    selected?: boolean
    onClick: () => void
    thumbClassName?: string
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
            <div className={`${thumbClassName} rounded-md overflow-hidden bg-neutral-100 relative`}>
                <Image src={image} alt={label} fill sizes="96px" style={{ objectFit: 'cover' }} />
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

async function loadImageRaw(src: string): Promise<HTMLImageElement> {
    // Uses cache for normal URLs; data: URLs can still go through fine
    return loadImageCached(src);
}

/** Rotate an image to horizontal orientation (90° counter-clockwise) on its own canvas. */
function makeHorizontalCanvas(img: HTMLImageElement): HTMLCanvasElement {
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;

    const can = document.createElement('canvas');
    can.width = srcH;   // rotated width
    can.height = srcW;  // rotated height

    const ctx = can.getContext('2d')!;
    ctx.save();
    // rotate -90deg around top-left (0,0):
    ctx.translate(0, can.height);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(img, 0, 0, srcW, srcH);
    ctx.restore();
    return can;
}

/* ---------- Main component ---------- */
export default function DeckComposer({ config }: { config: DeckComposerConfig }) {
    const { grips, bottoms, jkDesigns = [], glyphs = [], glyphs2 = [], glyphs3 = [], glyphs4 = [], glyphs5 = [], glyphs6 = [] } = config
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

    const glyphs4WithNone = useMemo<GlyphOption[]>(
        () => [{ id: 'none', name: 'None', image: '/deckAssets/moonbirds/none.png' }, ...glyphs4],
        [glyphs4]
    )
    const glyphs5WithNone = useMemo<GlyphOption[]>(
        () => [{ id: 'none', name: 'None', image: '/deckAssets/moonbirds/none.png' }, ...glyphs5],
        [glyphs5]
    )
    const glyphs6WithNone = useMemo<GlyphOption[]>(
        () => [{ id: 'none', name: 'None', image: '/deckAssets/moonbirds/none.png' }, ...glyphs6],
        [glyphs6]
    )
    // Layer 1 state

    const [glyphId1, setGlyphId1] = useState<string>('none')
    const [glyphTint1, setGlyphTint1] = useState('#7c1315')
    const [glyph1Scale, setGlyph1Scale] = useState<number>(1)
    const [glyph1OffsetX, setGlyph1OffsetX] = useState<number>(0)
    const [glyph1OffsetY, setGlyph1OffsetY] = useState<number>(0)

    const [glyph1FlipX, setGlyph1FlipX] = useState<boolean>(false)
    const [glyph2FlipX, setGlyph2FlipX] = useState<boolean>(false)
    const [glyph3FlipX, setGlyph3FlipX] = useState<boolean>(false)
    const [glyph4FlipX, setGlyph4FlipX] = useState<boolean>(false)
    const [glyph5FlipX, setGlyph5FlipX] = useState<boolean>(false)
    const [glyph6FlipX, setGlyph6FlipX] = useState<boolean>(false)



    const [glyph1Rotation, setGlyph1Rotation] = useState<number>(0)
    const [glyph2Rotation, setGlyph2Rotation] = useState<number>(0)
    const [glyph3Rotation, setGlyph3Rotation] = useState<number>(0)
    const [glyph4Rotation, setGlyph4Rotation] = useState<number>(90)
    const [glyph5Rotation, setGlyph5Rotation] = useState<number>(90)
    const [glyph6Rotation, setGlyph6Rotation] = useState<number>(90)


    // Layer 2 state
    const [glyphId2, setGlyphId2] = useState<string>('none')
    const [glyphTint2, setGlyphTint2] = useState('#000000')
    const [glyph2Scale, setGlyph2Scale] = useState<number>(1)
    const [glyph2OffsetX, setGlyph2OffsetX] = useState<number>(0)
    const [glyph2OffsetY, setGlyph2OffsetY] = useState<number>(0)

    // Layer 3 state (NEW)
    const [glyphId3, setGlyphId3] = useState<string>('none')
    const [glyphTint3, setGlyphTint3] = useState('#7c1315')
    const [glyph3Scale, setGlyph3Scale] = useState<number>(1)
    const [glyph3OffsetX, setGlyph3OffsetX] = useState<number>(0)
    const [glyph3OffsetY, setGlyph3OffsetY] = useState<number>(0)

    // Layer 4 state (NEW)
    const [glyphId4, setGlyphId4] = useState<string>('none')
    const [glyphTint4, setGlyphTint4] = useState('none')
    const [glyph4Scale, setGlyph4Scale] = useState<number>(1)
    const [glyph4OffsetX, setGlyph4OffsetX] = useState<number>(0)
    const [glyph4OffsetY, setGlyph4OffsetY] = useState<number>(0)

    // Layer 5 state (NEW)
    const [glyphId5, setGlyphId5] = useState<string>('none')
    const [glyphTint5, setGlyphTint5] = useState('none')
    const [glyph5Scale, setGlyph5Scale] = useState<number>(1)
    const [glyph5OffsetX, setGlyph5OffsetX] = useState<number>(0)
    const [glyph5OffsetY, setGlyph5OffsetY] = useState<number>(0)

    // Layer 6 state (NEW)
    const [glyphId6, setGlyphId6] = useState<string>('none')
    const [glyphTint6, setGlyphTint6] = useState('none')
    const [glyph6Scale, setGlyph6Scale] = useState<number>(1)
    const [glyph6OffsetX, setGlyph6OffsetX] = useState<number>(0)
    const [glyph6OffsetY, setGlyph6OffsetY] = useState<number>(0)

    const selectedGlyph1 = glyphs1WithNone.find((g) => g.id === glyphId1) ?? glyphs1WithNone[0]
    const selectedGlyph2 = glyphs2WithNone.find((g) => g.id === glyphId2) ?? glyphs2WithNone[0]
    const selectedGlyph3 = glyphs3WithNone.find((g) => g.id === glyphId3) ?? glyphs3WithNone[0]
    const selectedGlyph4 = glyphs4WithNone.find((g) => g.id === glyphId4) ?? glyphs4WithNone[0]
    const selectedGlyph5 = glyphs5WithNone.find((g) => g.id === glyphId5) ?? glyphs5WithNone[0]
    const selectedGlyph6 = glyphs6WithNone.find((g) => g.id === glyphId6) ?? glyphs6WithNone[0]

    const [glyph1Blend, setGlyph1Blend] = useState<GlobalCompositeOperation>('source-over');
    const [glyph2Blend, setGlyph2Blend] = useState<GlobalCompositeOperation>('source-over');
    const [glyph3Blend, setGlyph3Blend] = useState<GlobalCompositeOperation>('source-over'); // if you have a 3rd layer
    const [glyph4Blend, setGlyph4Blend] = useState<GlobalCompositeOperation>('source-over'); // if you have a 4th layer
    const [glyph5Blend, setGlyph5Blend] = useState<GlobalCompositeOperation>('source-over'); // if you have a 4th layer
    const [glyph6Blend, setGlyph6Blend] = useState<GlobalCompositeOperation>('source-over'); // if you have a 4th layer

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

    const BIRB_LOGO_COLORS = [
        { id: 'birb-red', label: 'Dark Red', value: '#7d050d' },
        { id: 'birb-black', label: 'Red', value: '#d12429' },
        { id: 'birb-white', label: 'Black', value: '#000000' },
        { id: 'birb-cream', label: 'Cream', value: '#ecd9ba' },
        { id: 'birb-gold', label: 'Dark Blue', value: '#1e1e34' },
        { id: 'birb-navy', label: 'Light Blue', value: '#1a265e' },
        { id: 'birb-navy', label: 'Cornflower', value: '#616b96' },
        { id: 'birb-navy', label: 'Bright Pink', value: '#e84294' },
        { id: 'birb-navy', label: 'Plum', value: '#783859' },
        { id: 'birb-navy', label: 'Light Pink', value: '#ed7abd' },
        // …whatever your guidelines say
    ];


    // Text layer state
    const [textBlend, setTextBlend] = useState<GlobalCompositeOperation>('source-over'); // NEW


    ///////NEW GLYPH ACCORDION

    // Which glyph tab is open inside the "Glyphs" accordion
    const [activeGlyphTab, setActiveGlyphTab] = useState<'g1' | 'g2' | 'g3'>('g1')

    // A lightweight "view model" per layer so one UI can drive any of them
    const glyphVM = {
        g1: {
            label: 'Glyph 1',
            options: glyphs1WithNone,
            id: glyphId1, setId: setGlyphId1,
            tint: glyphTint1, setTint: setGlyphTint1,
            scale: glyph1Scale, setScale: setGlyph1Scale,
            offX: glyph1OffsetX, setOffX: setGlyph1OffsetX,
            offY: glyph1OffsetY, setOffY: setGlyph1OffsetY,
            blend: glyph1Blend, setBlend: setGlyph1Blend,
            rot: glyph1Rotation, setRot: setGlyph1Rotation,
            flipX: glyph1FlipX, setFlipX: setGlyph1FlipX,
        },
        g2: {
            label: 'Glyph 2',
            options: glyphs2WithNone,
            id: glyphId2, setId: setGlyphId2,
            tint: glyphTint2, setTint: setGlyphTint2,
            scale: glyph2Scale, setScale: setGlyph2Scale,
            offX: glyph2OffsetX, setOffX: setGlyph2OffsetX,
            offY: glyph2OffsetY, setOffY: setGlyph2OffsetY,
            blend: glyph2Blend, setBlend: setGlyph2Blend,
            rot: glyph2Rotation, setRot: setGlyph2Rotation,
            flipX: glyph2FlipX, setFlipX: setGlyph2FlipX,
        },
        g3: {
            label: 'Glyph 3',
            options: glyphs3WithNone,
            id: glyphId3, setId: setGlyphId3,
            tint: glyphTint3, setTint: setGlyphTint3,
            scale: glyph3Scale, setScale: setGlyph3Scale,
            offX: glyph3OffsetX, setOffX: setGlyph3OffsetX,
            offY: glyph3OffsetY, setOffY: setGlyph3OffsetY,
            blend: glyph3Blend, setBlend: setGlyph3Blend,
            rot: glyph3Rotation, setRot: setGlyph3Rotation,
            flipX: glyph3FlipX, setFlipX: setGlyph3FlipX,
        },
    } as const
    //////////

    type StickerTab = 'g4' | 'g5' | 'g6'
    type NumSetter = React.Dispatch<React.SetStateAction<number>>
    type IdSetter = React.Dispatch<React.SetStateAction<string>>

    type StickerVM = {
        id: string
        setId: IdSetter
        scale: number
        setScale: NumSetter
        offX: number
        setOffX: NumSetter
        offY: number
        setOffY: NumSetter
        rotation: number
        setRotation: NumSetter
        list: GlyphOption[]
        flipX: boolean                 // NEW
        setFlipX: (v: boolean) => void // NEW
    }

    // Text layer state
    type TextFont = 'impact' | 'sans' | 'oscine' | 'graffiti' | 'gazpacho' | 'pridi'

    const [textValue, setTextValue] = useState<string>('')
    const [textColor, setTextColor] = useState<string>('#111111')
    const [textFont, setTextFont] = useState<TextFont>('oscine')  ////CHANGE??
    const [textScale, setTextScale] = useState<number>(10)
    const [textOffsetX, setTextOffsetX] = useState<number>(0)
    const [textOffsetY, setTextOffsetY] = useState<number>(0)
    const [textRotation, setTextRotation] = useState<number>(90) // degrees

    // Token transform
    const [tokenId, setTokenId] = useState<string>('') // moonbird ID
    const [style, setStyle] = useState<'illustrated' | 'pixel'>('illustrated')
    const layout: LayoutMode = 'horizontalLeft'
    const [tokenScale, setTokenScale] = useState<number>(3.25)
    const [offsetX, setOffsetX] = useState<number>(-40)
    const [offsetY, setOffsetY] = useState<number>(60)
    const nudgeValue = 100
    const nudgeValueSm = 25

    // JK selection
    const [jkId, setJkId] = useState<string>(initialJKId)

    // One-open accordion
    const [openId, setOpenId] = useState<string>('')

    // Viewer output
    const [bottomPreviewUrl, setBottomPreviewUrl] = useState<string>(initialBottomBG.image)

    const [stickerTab, setStickerTab] = useState<StickerTab>('g4')

    // Quote request UI state
    const [quoteEmail, setQuoteEmail] = useState<string>('')
    const [quoteNotes, setQuoteNotes] = useState<string>('')
    const [quotePending, setQuotePending] = useState(false)
    const [quoteMessage, setQuoteMessage] = useState<string | null>(null)

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
        if (glyphId4 !== 'none' && selectedGlyph4.image) urls.push(selectedGlyph4.image)
        if (glyphId5 !== 'none' && selectedGlyph5.image) urls.push(selectedGlyph5.image)
        if (glyphId6 !== 'none' && selectedGlyph6.image) urls.push(selectedGlyph6.image)

        bottoms.slice(0, 6).forEach((b) => urls.push(b.image))
        glyphs.slice(0, 3).forEach((g) => urls.push(g.image))
        glyphs2.slice(0, 3).forEach((g) => urls.push(g.image))
        glyphs3.slice(0, 3).forEach((g) => urls.push(g.image))
        glyphs4.slice(0, 3).forEach((g) => urls.push(g.image))
        glyphs5.slice(0, 3).forEach((g) => urls.push(g.image))
        glyphs6.slice(0, 3).forEach((g) => urls.push(g.image))


        urls.forEach((u) => u && loadImageCached(u).catch(() => { }))
    }, [
        bottoms,
        glyphs, glyphs2, glyphs3, glyphs4, glyphs5, glyphs6,
        selectedBottomBG.image,
        selectedGrip.image,
        glyphId1, selectedGlyph1?.image,
        glyphId2, selectedGlyph2?.image,
        glyphId3, selectedGlyph3?.image,
        glyphId4, selectedGlyph4?.image,
        glyphId5, selectedGlyph5?.image,
        glyphId6, selectedGlyph6?.image,
    ])

    const stickerVM: StickerVM = useMemo(() => {
        switch (stickerTab) {
            case 'g5':
                return {
                    id: glyphId5, setId: setGlyphId5,
                    scale: glyph5Scale, setScale: setGlyph5Scale,
                    offX: glyph5OffsetX, setOffX: setGlyph5OffsetX,
                    offY: glyph5OffsetY, setOffY: setGlyph5OffsetY,
                    rotation: glyph5Rotation, setRotation: setGlyph5Rotation,
                    list: glyphs5WithNone,
                    flipX: glyph5FlipX, setFlipX: setGlyph5FlipX, // NEW
                }
            case 'g6':
                return {
                    id: glyphId6, setId: setGlyphId6,
                    scale: glyph6Scale, setScale: setGlyph6Scale,
                    offX: glyph6OffsetX, setOffX: setGlyph6OffsetX,
                    offY: glyph6OffsetY, setOffY: setGlyph6OffsetY,
                    rotation: glyph6Rotation, setRotation: setGlyph6Rotation,
                    list: glyphs6WithNone,
                    flipX: glyph6FlipX, setFlipX: setGlyph6FlipX, // NEW
                }
            default: // 'g4'
                return {
                    id: glyphId4, setId: setGlyphId4,
                    scale: glyph4Scale, setScale: setGlyph4Scale,
                    offX: glyph4OffsetX, setOffX: setGlyph4OffsetX,
                    offY: glyph4OffsetY, setOffY: setGlyph4OffsetY,
                    rotation: glyph4Rotation, setRotation: setGlyph4Rotation,
                    list: glyphs4WithNone,
                    flipX: glyph4FlipX, setFlipX: setGlyph4FlipX, // NEW
                }
        }
    }, [
        stickerTab,
        glyphId4, glyph4Scale, glyph4OffsetX, glyph4OffsetY, glyph4Rotation, glyphs4WithNone, glyph4FlipX,
        glyphId5, glyph5Scale, glyph5OffsetX, glyph5OffsetY, glyph5Rotation, glyphs5WithNone, glyph5FlipX,
        glyphId6, glyph6Scale, glyph6OffsetX, glyph6OffsetY, glyph6Rotation, glyphs6WithNone, glyph6FlipX,
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
                const glyph4Src = glyphId4 !== 'none' ? selectedGlyph4.image : ''
                const glyph5Src = glyphId5 !== 'none' ? selectedGlyph5.image : ''
                const glyph6Src = glyphId6 !== 'none' ? selectedGlyph6.image : ''

                const glyph1Img = glyph1Src ? await loadImageCached(glyph1Src) : null
                const glyph2Img = glyph2Src ? await loadImageCached(glyph2Src) : null
                const glyph3Img = glyph3Src ? await loadImageCached(glyph3Src) : null
                const glyph4Img = glyph4Src ? await loadImageCached(glyph4Src) : null
                const glyph5Img = glyph5Src ? await loadImageCached(glyph5Src) : null
                const glyph6Img = glyph6Src ? await loadImageCached(glyph6Src) : null

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


                // add final param rotationDeg (default 0)
                const drawGlyph = (
                    img: HTMLImageElement,
                    tintOrNull: string | null,           // << allow no tint
                    userScale: number,
                    offX: number,
                    offY: number,
                    blend: GlobalCompositeOperation,
                    rotationDeg: number = 0,
                    flipX: boolean = false
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

                    // draw original
                    tctx.imageSmoothingEnabled = true;
                    tctx.drawImage(img, 0, 0, gW, gH);

                    // optional tint
                    if (tintOrNull) {
                        tctx.globalCompositeOperation = 'source-in';
                        tctx.fillStyle = tintOrNull;
                        tctx.fillRect(0, 0, gW, gH);
                        tctx.globalCompositeOperation = 'source-over';
                    }

                    // place with flip/rotation about center
                    ctx.save();
                    const prev = ctx.globalCompositeOperation;
                    ctx.globalCompositeOperation = blend;

                    ctx.translate(gX + gW / 2, gY + gH / 2);
                    if (flipX) ctx.scale(-1, 1);        // horizontal mirror (fixed)
                    if (rotationDeg) ctx.rotate((rotationDeg * Math.PI) / 180);

                    ctx.drawImage(tmp, -gW / 2, -gH / 2);
                    ctx.globalCompositeOperation = prev;
                    ctx.restore();
                };
                // 2) Glyphs: under → over
                if (glyph1Img) drawGlyph(glyph1Img, glyphTint1, glyph1Scale, glyph1OffsetX, glyph1OffsetY, glyph1Blend, glyph1Rotation, glyph1FlipX);
                if (glyph2Img) drawGlyph(glyph2Img, glyphTint2, glyph2Scale, glyph2OffsetX, glyph2OffsetY, glyph2Blend, glyph2Rotation, glyph2FlipX);
                if (glyph3Img) drawGlyph(glyph3Img, glyphTint3, glyph3Scale, glyph3OffsetX, glyph3OffsetY, glyph3Blend, glyph3Rotation, glyph3FlipX);

                // 2.5) Text layer (on top of glyphs, behind token)
                // 2.5) Text layer (on top of glyphs, behind token)
                if (textValue.trim()) {
                    const basePx = Math.round(W * 0.12);
                    const px = Math.max(10, Math.min(4000, Math.round(basePx * Math.max(0.05, textScale)))
                    );
                    const fontFamily =
                        textFont === 'graffiti'
                            ? "'graffiti', cursive"
                            : textFont === 'oscine'
                                ? "'oscine', regular"
                                : textFont === 'pridi'
                                    ? "'pridi', sans-serif"
                                    : textFont === 'gazpacho'
                                        ? "'gazpacho', black"
                                        : textFont === 'impact'
                                            ? "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif"
                                            : "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";


                    ctx.save();
                    ctx.translate(W / 2 + textOffsetX, H / 2 + textOffsetY);
                    ctx.rotate((textRotation * Math.PI) / 180);

                    ctx.font = `${px}px ${fontFamily}`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    // apply blend mode while drawing text
                    const prevBlend = ctx.globalCompositeOperation;
                    ctx.globalCompositeOperation = textBlend;

                    // subtle outline for readability
                    ctx.lineWidth = Math.max(1, Math.round(W * 0.003));
                    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
                    ctx.strokeText(textValue, 0, 0);

                    ctx.fillStyle = textColor;
                    ctx.fillText(textValue, 0, 0);

                    ctx.globalCompositeOperation = prevBlend;
                    ctx.restore();
                }

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

                if (glyph4Img) drawGlyph(glyph4Img, null, glyph4Scale, glyph4OffsetX, glyph4OffsetY, glyph4Blend, glyph4Rotation, glyph4FlipX);
                if (glyph5Img) drawGlyph(glyph5Img, null, glyph5Scale, glyph5OffsetX, glyph5OffsetY, glyph5Blend, glyph5Rotation, glyph5FlipX);
                if (glyph6Img) drawGlyph(glyph6Img, null, glyph6Scale, glyph6OffsetX, glyph6OffsetY, glyph6Blend, glyph6Rotation, glyph6FlipX);

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
        glyphId1, glyphTint1, selectedGlyph1?.image, glyph1Scale, glyph1OffsetX, glyph1OffsetY, glyph1Blend, glyph1Rotation, glyph1FlipX,
        glyphId2, glyphTint2, selectedGlyph2?.image, glyph2Scale, glyph2OffsetX, glyph2OffsetY, glyph2Blend, glyph2Rotation, glyph2FlipX,
        glyphId3, glyphTint3, selectedGlyph3?.image, glyph3Scale, glyph3OffsetX, glyph3OffsetY, glyph3Blend, glyph3Rotation, glyph3FlipX,
        glyphId4, selectedGlyph4?.image, glyph4Scale, glyph4OffsetX, glyph4OffsetY, glyph4Rotation, glyph4FlipX,
        glyphId5, selectedGlyph5?.image, glyph5Scale, glyph5OffsetX, glyph5OffsetY, glyph5Rotation, glyph5FlipX,
        glyphId6, selectedGlyph6?.image, glyph6Scale, glyph6OffsetX, glyph6OffsetY, glyph6Rotation, glyph6FlipX,
        tokenId, style, tokenScale, offsetX, offsetY, textValue, textColor, textFont, textScale, textOffsetX, textOffsetY, textRotation, textBlend,
    ])

    // helpers
    const controlsDisabled = mode === 'jk'
    const nudge = (setter: React.Dispatch<React.SetStateAction<number>>, delta: number) =>
        setter((v) => v + delta)

    async function exportCombinedHorizontal(filename = 'GenerationalMerch_MB_Deck.png') {
        const GAP = 20;
        const BOX_W = 2560;
        const BOX_H = 800;

        // 1) Grab the renders
        const topPng = await window.deckCapture?.({
            view: 'top',
            width: BOX_W,
            height: BOX_H,
            marginX: 1.12,
            marginYFactor: 0.88,
        });
        const botPng = await window.deckCapture?.({
            view: 'bottom',
            width: BOX_W,
            height: BOX_H,
            marginX: 1.12,
            marginYFactor: 0.88,
        });
        if (!topPng || !botPng) return;

        // 2) Compose
        const out = document.createElement('canvas');
        out.width = BOX_W;
        out.height = BOX_H * 2 + GAP + 140; // leave space for branding
        const ctx = out.getContext('2d')!;
        ctx.fillStyle = '#f7f7f7';
        ctx.fillRect(0, 0, out.width, out.height);

        // --- Centered gray strip (whole canvas center) ---
        const STRIP_H = Math.round(out.height / 2.5);
        const STRIP_Y = Math.round((out.height - STRIP_H) / 2);
        ctx.fillStyle = '#b3b3b3'; // Tailwind gray-200-ish
        ctx.fillRect(0, STRIP_Y, out.width, STRIP_H);

        // load the top/bottom renders
        const topImg = new window.Image();
        const botImg = new window.Image();
        await new Promise<void>((res, rej) => {
            let n = 0;
            const done = () => (++n === 2 ? res() : undefined);
            topImg.onload = done;
            botImg.onload = done;
            topImg.onerror = rej;
            botImg.onerror = rej;
            topImg.src = topPng;
            botImg.src = botPng;
        });

        // draw helper
        function drawContain(img: HTMLImageElement, x: number, y: number, w: number, h: number) {
            const iw = img.naturalWidth || img.width;
            const ih = img.naturalHeight || img.height;
            const s = Math.min(w / iw, h / ih);
            const dw = iw * s;
            const dh = ih * s;
            const dx = x + (w - dw) / 2;
            const dy = y + (h - dh) / 2;
            ctx.drawImage(img, dx, dy, dw, dh);
        }



        drawContain(topImg, 0, 0, BOX_W, BOX_H);
        ctx.save();
        ctx.translate(BOX_W / 2, BOX_H + GAP + BOX_H / 2); // move origin to center of bottom slot
        ctx.rotate(Math.PI); // rotate 180 degrees
        drawContain(botImg, -BOX_W / 2, -BOX_H / 2, BOX_W, BOX_H);
        ctx.restore();

        // 3) Branding: logo bottom-left
        const logo = new window.Image();
        await new Promise<void>((res, rej) => {
            logo.onload = () => res();
            logo.onerror = () => rej();
            logo.src = '/assets/gmlong.png';
        });

        const logoW = BOX_W * 0.18;
        const logoH = logoW * (logo.naturalHeight / logo.naturalWidth);
        const logoX = 50;
        const logoY = out.height - logoH - 40;
        ctx.drawImage(logo, logoX, logoY, logoW, logoH);

        // 4) Web image bottom-right
        const web = new window.Image();
        await new Promise<void>((res, rej) => {
            web.onload = () => res();
            web.onerror = () => rej();
            web.src = '/assets/gmweb.png';
        });

        const webW = BOX_W * 0.15;
        const webH = webW * (web.naturalHeight / web.naturalWidth);
        const webX = out.width - webW - 50;
        const webY = out.height - webH - 40;
        ctx.drawImage(web, webX, webY, webW, webH);

        // 5) Download
        const a = document.createElement('a');
        a.href = out.toDataURL('image/png');
        a.download = filename;
        a.click();
    }
    function MobileSaveBar({ onSave }: { onSave: () => void }) {
        return (
            <div
                className="
        lg:hidden fixed inset-x-0 bottom-0 z-[1000]
        border-t border-neutral-200
        bg-white/90
      "
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
            >
                <div className="px-4 pt-3">
                    <button
                        type="button"
                        onClick={onSave}
                        className="btn btn-primary w-full"
                        aria-label="Download combined PNG"
                        title="Download combined PNG"
                    >
                        Save / Download
                    </button>
                </div>
            </div>
        );
    }

    //REQUEST QUOTE FUNCTION
    async function handleRequestQuote() {
        try {
            setQuoteMessage(null)

            if (!quoteEmail.trim()) {
                setQuoteMessage('Please enter your email so we can send the quote.')
                return
            }

            if (!window.deckCapture) {
                setQuoteMessage('Capture is not available right now. Please try again later.')
                return
            }

            setQuotePending(true)

            // 1) Capture top + bottom as PNG data URLs
            const [topPng, bottomPng] = await Promise.all([
                window.deckCapture?.({
                    view: 'top',
                    width: 2560,
                    height: 800,
                    marginX: 1.12,
                    marginYFactor: 0.88,
                }),
                window.deckCapture?.({
                    view: 'bottom',
                    width: 2560,
                    height: 800,
                    marginX: 1.12,
                    marginYFactor: 0.88,
                }),
            ])

            if (!topPng || !bottomPng) {
                throw new Error('Failed to capture deck images')
            }

            // 2) (Optional but easy) capture a minimal config snapshot
            const configSnapshot = {
                mode,
                gripId,
                bottomBgId,
                tokenId,
                style,
                text: {
                    value: textValue,
                    color: textColor,
                    font: textFont,
                    scale: textScale,
                    offsetX: textOffsetX,
                    offsetY: textOffsetY,
                    rotation: textRotation,
                },
                // you can add more later: glyphs, stickers, etc.
            }

            // 3) Send to API route
            const res = await fetch('/api/deck-quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: quoteEmail.trim(),
                    notes: quoteNotes.trim(),
                    topPng,
                    bottomPng,
                    config: configSnapshot,
                }),
            })

            if (!res.ok) {
                throw new Error(`Server responded with ${res.status}`)
            }

            setQuoteMessage('Got it! Your design was submitted for a quote.')
        } catch (err) {
            console.error(err)
            setQuoteMessage('Something went wrong submitting your quote. Please try again.')
        } finally {
            setQuotePending(false)
        }
    }

    function GlyphControls({
        vm,
    }: {
        vm: {
            label: string
            options: GlyphOption[]
            id: string; setId: (v: string) => void
            tint: string; setTint: (v: string) => void
            scale: number; setScale: (v: number) => void
            offX: number; setOffX: (updater: (v: number) => number | number) => void
            offY: number; setOffY: (updater: (v: number) => number | number) => void
            blend: GlobalCompositeOperation; setBlend: (v: GlobalCompositeOperation) => void
            rot: number; setRot: (updater: (v: number) => number | number) => void
            flipX: boolean; setFlipX: (v: boolean) => void
        }
    }) {
        const hasSelection = vm.id !== 'none'

        // detect the selected glyph and its tint mode
        const currentGlyph = vm.options.find((g) => g.id === vm.id)
        const tintMode: 'any' | 'brand' | 'none' = currentGlyph?.tintMode ?? 'any'

        return (
            <div className="space-y-3">
                <OptionsGrid>
                    {vm.options.map((g) => (
                        <OptionTile
                            key={`${vm.label}-${g.id}`}
                            label={g.name}
                            image={g.image}
                            selected={vm.id === g.id}
                            onClick={() => vm.setId(g.id)}
                        />
                    ))}
                </OptionsGrid>

                {hasSelection && (
                    <>
                        {/* Tint / Blend / Scale */}
                        <div className="flex items-start gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
                            <Field labelText="Tint" className="min-w-[120px] shrink-0">
                                {/* conditional tint UI */}
                                {tintMode === 'any' && (
                                    <input
                                        type="color"
                                        value={vm.tint}
                                        onChange={(e) => vm.setTint(e.target.value)}
                                        className="h-11 w-[52px] rounded-md border border-neutral-300 p-0 cursor-pointer
                    [&::-webkit-color-swatch-wrapper]:p-0
                    [&::-webkit-color-swatch]:border-0
                    [&::-moz-color-swatch]:border-0"
                                    />
                                )}

                                {tintMode === 'brand' && (
                                    <div className="flex flex-wrap gap-2 w-full max-w-[220px]">
                                        {BIRB_LOGO_COLORS.map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => vm.setTint(c.value)}
                                                className={`h-8 w-8 rounded-full border transition-transform
          ${vm.tint === c.value ? 'border-neutral-900 scale-105' : 'border-neutral-300'}`}
                                                style={{ backgroundColor: c.value }}
                                                title={c.label}
                                            >
                                                <span className="sr-only">{c.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {tintMode === 'none' && (
                                    <p className="text-xs text-neutral-500">
                                        Color fixed by brand guidelines.
                                    </p>
                                )}
                            </Field>

                            {/* <Field labelText="Blend Mode" className="flex-1 min-w-0">
              <select
                className="input h-11 w-full truncate"
                value={vm.blend}
                onChange={(e) =>
                  vm.setBlend(e.target.value as GlobalCompositeOperation)
                }
              >
                {BLEND_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field> */}

                            {/* Blend + Scale */}
                            {tintMode !== 'brand' && (
                                <Field labelText="Blend Mode" className="flex-1 min-w-0">
                                    <select
                                        className="input h-11 w-full truncate"
                                        value={vm.blend}
                                        onChange={(e) =>
                                            vm.setBlend(e.target.value as GlobalCompositeOperation)
                                        }
                                    >
                                        {BLEND_MODES.map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            )}

                            <Field labelText="Scale" className="w-[80px] shrink-0">
                                <input
                                    className="input h-11 w-full"
                                    type="number"
                                    step={0.125}
                                    min={0.125}
                                    max={5}
                                    value={vm.scale}
                                    onChange={(e) =>
                                        vm.setScale(
                                            Math.max(0.125, Math.min(5, Number(e.target.value) || 1))
                                        )
                                    }
                                />
                            </Field>
                        </div>

                        {/* Nudge + Rotate / Mirror */}
                        <div className="flex items-start gap-6 flex-wrap sm:flex-nowrap">
                            <Field labelText="Nudge" className="shrink-0">
                                <div className="grid grid-cols-3 gap-2 w-[130px]">
                                    <div />
                                    {/* Up */}
                                    <button
                                        type="button"
                                        className="btn h-10 w-10"
                                        onClick={() => vm.setOffX((v: number) => v + nudgeValue)}
                                    >
                                        ↑
                                    </button>
                                    <div />
                                    {/* Left */}
                                    <button
                                        type="button"
                                        className="btn h-10 w-10"
                                        onClick={() => vm.setOffY((v: number) => v - nudgeValue)}
                                    >
                                        ←
                                    </button>
                                    {/* Center */}
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={() => {
                                            vm.setOffX(() => 0)
                                            vm.setOffY(() => 0)
                                        }}
                                    >
                                        •
                                    </button>
                                    {/* Right */}
                                    <button
                                        type="button"
                                        className="btn h-10 w-10"
                                        onClick={() => vm.setOffY((v: number) => v + nudgeValue)}
                                    >
                                        →
                                    </button>
                                    <div />
                                    {/* Down */}
                                    <button
                                        type="button"
                                        className="btn h-10 w-10"
                                        onClick={() => vm.setOffX((v: number) => v - nudgeValue)}
                                    >
                                        ↓
                                    </button>
                                    <div />
                                </div>
                            </Field>

                            <div className="flex flex-col gap-2 shrink-0">
                                <Field labelText="Rotate" className="w-[220px]">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="btn h-10 w-10"
                                            title="Rotate counter-clockwise"
                                            onClick={() =>
                                                vm.setRot((r: number) => (r + (vm.flipX ? 15 : -15) + 360) % 360)
                                            }
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            className="btn h-10 w-10"
                                            title="Rotate clockwise"
                                            onClick={() =>
                                                vm.setRot((r: number) => (r + (vm.flipX ? -15 : 15) + 360) % 360)
                                            }
                                        >
                                            <RotateCw className="w-4 h-4" />
                                        </button>
                                    </div>
                                </Field>

                                <Field labelText="Mirror" className="w-[220px] mt-4">
                                    <label className="inline-flex items-center gap-2 select-none">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 accent-neutral-800"
                                            checked={vm.flipX}
                                            onChange={(e) => vm.setFlipX(e.target.checked)}
                                        />
                                        <span className="text-sm">Flip horizontally</span>
                                    </label>
                                </Field>
                            </div>
                        </div>
                    </>
                )}
            </div>
        )
    }
    return (
        // Full-width wrapper to match shop layout
        <div className="w-screen relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] bg-neutral-50">
            <div className="px-4 md:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid gap-6 sm:grid-cols-[380px_minmax(0,1fr)] items-stretch pb-28 lg:pb-0">

                        {/* Settings */}
                        <aside
                            className="
              h-full h-fit p-2 lg:p-4
              lg:max-h-[calc(100vh-6rem)]
              lg:overflow-y-auto
            "
                        >
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
                                <p className="text-xs text-neutral-500 mt-0"> Choose a JK Design or custom design your own deck. </p>

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

                                            <AccordionSection
                                                title="Glyphs"
                                                open={openId === 'glyphs'}
                                                onToggle={(next) => setOpenId(next ? 'glyphs' : '')}
                                            >
                                                {/* Tab/segment switcher */}
                                                <div className="inline-flex rounded-full bg-neutral-200 p-1 mb-3">
                                                    {(['g1', 'g2', 'g3'] as const).map((key) => (
                                                        <button
                                                            key={key}
                                                            type="button"
                                                            onClick={() => setActiveGlyphTab(key)}
                                                            className={`px-5 py-2 text-sm font-medium rounded-full transition-all duration-200
          ${activeGlyphTab === key ? 'bg-[#d12429] text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-300'}
        `}
                                                        >
                                                            {glyphVM[key].label}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Controls for the selected glyph */}
                                                <GlyphControls vm={glyphVM[activeGlyphTab]} />
                                            </AccordionSection>

                                            <AccordionSection
                                                title="Stickers"
                                                open={openId === 'stickers'}
                                                onToggle={(next) => setOpenId(next ? 'stickers' : '')}
                                            >
                                                {/* Tab toggle like Glyphs 1–3 */}
                                                <div className="inline-flex rounded-full bg-neutral-200 p-1 mb-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setStickerTab('g4')}
                                                        className={`px-5 py-2 text-sm font-medium rounded-full transition-all duration-200
        ${stickerTab === 'g4' ? 'bg-[#d12429] text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-300'}`}
                                                    >
                                                        Sticker 1
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setStickerTab('g5')}
                                                        className={`px-5 py-2 text-sm font-medium rounded-full transition-all duration-200
        ${stickerTab === 'g5' ? 'bg-[#d12429] text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-300'}`}
                                                    >
                                                        Sticker 2
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setStickerTab('g6')}
                                                        className={`px-5 py-2 text-sm font-medium rounded-full transition-all duration-200
        ${stickerTab === 'g6' ? 'bg-[#d12429] text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-300'}`}
                                                    >
                                                        Sticker 3
                                                    </button>
                                                </div>

                                                {/* Options grid for the active sticker layer */}
                                                <div className="space-y-3">
                                                    <OptionsGrid>
                                                        {stickerVM.list.map((g) => (
                                                            <OptionTile
                                                                key={`st-${stickerTab}-${g.id}`}
                                                                label={g.name}
                                                                image={g.image}
                                                                selected={stickerVM.id === g.id}
                                                                onClick={() => {
                                                                    stickerVM.setId(g.id)
                                                                    if (g.id !== 'none') stickerVM.setScale(0.25) // default small
                                                                }}
                                                                thumbClassName="w-12 h-12"
                                                            />
                                                        ))}
                                                    </OptionsGrid>

                                                    {stickerVM.id !== 'none' && (
                                                        <>
                                                            {/* Scale */}
                                                            <div className="flex items-end gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
                                                                <Field labelText="Scale" className="w-[100px] shrink-0">
                                                                    <input
                                                                        className="input h-11 w-full"
                                                                        type="number" step={0.1} min={0.1} max={5}
                                                                        value={stickerVM.scale}
                                                                        onChange={(e) => stickerVM.setScale(Math.max(0.1, Math.min(5, Number(e.target.value) || 1)))}
                                                                        title="Multiply the base size"
                                                                    />
                                                                </Field>
                                                            </div>

                                                            {/* Nudge + Rotate */}
                                                            <div className="flex items-start gap-6 flex-wrap sm:flex-nowrap">
                                                                <Field labelText="Nudge" className="shrink-0">
                                                                    <div className="grid grid-cols-3 gap-2 w-[130px]">
                                                                        <div />
                                                                        <button type="button" className="btn h-10 w-10" onClick={() => stickerVM.setOffX(v => v + nudgeValue)}>↑</button>
                                                                        <div />
                                                                        <button type="button" className="btn h-10 w-10" onClick={() => stickerVM.setOffY(v => v - nudgeValue)}>←</button>
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-ghost"
                                                                            onClick={() => { stickerVM.setOffX(0); stickerVM.setOffY(0); }}
                                                                            title="Center"
                                                                        >•</button>
                                                                        <button type="button" className="btn h-10 w-10" onClick={() => stickerVM.setOffY(v => v + nudgeValue)}>→</button>
                                                                        <div />
                                                                        <button type="button" className="btn h-10 w-10" onClick={() => stickerVM.setOffX(v => v - nudgeValue)}>↓</button>
                                                                        <div />
                                                                    </div>
                                                                </Field>

                                                                <div className="flex flex-col gap-2 shrink-0">
                                                                    <Field labelText="Rotate" className="w-[220px]">
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                type="button"
                                                                                className="btn h-10 w-10"
                                                                                title="Rotate counter-clockwise"
                                                                                onClick={() => stickerVM.setRotation((r: number) => (r - 15 + 360) % 360)}
                                                                            >
                                                                                <RotateCcw className="w-4 h-4" />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className="btn h-10 w-10"
                                                                                title="Rotate clockwise"
                                                                                onClick={() => stickerVM.setRotation((r: number) => (r + 15) % 360)}
                                                                            >
                                                                                <RotateCw className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    </Field>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </AccordionSection>

                                            {/* Text Layer */}
                                            <AccordionSection
                                                title="Text"
                                                open={openId === 'text'}
                                                onToggle={(next) => setOpenId(next ? 'text' : '')}
                                            >
                                                <div className="space-y-4">
                                                    <Field labelText="Numbers and symbols only (15 max)">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                className="input w-full"
                                                                type="text"
                                                                maxLength={15} // still fine, but we also enforce in JS
                                                                value={textValue}
                                                                onChange={(e) => {
                                                                    // Raw user input
                                                                    let raw = e.target.value;

                                                                    /////COMMENT OUT THIS SECTION TO ENABLE ALL TEXT///////
                                                                    // 1) Keep only '#' and digits
                                                                    // raw = raw.replace(/[^#0-9]/g, "");
                                                                    raw = raw.replace(/[A-Za-z]/g, "");

                                                                    // 2) If there's any '#', normalize to a single leading '#'
                                                                    // if (raw.includes("#")) {
                                                                    //     const digits = raw.replace(/#/g, ""); // strip all '#'
                                                                    //     raw = "#" + digits;                   // put one '#' at start
                                                                    // }

                                                                    ///////END COMMENT OUT///////

                                                                    // 3) Enforce max length
                                                                    raw = raw.slice(0, 15);

                                                                    setTextValue(raw);
                                                                }}
                                                                placeholder="#8209"
                                                            />
                                                            <span className="text-xs text-neutral-500 tabular-nums">
                                                                {textValue.length}/15
                                                            </span>
                                                        </div>
                                                    </Field>

                                                    <Field labelText="Font" className="flex-1">
                                                        <select
                                                            className="input"
                                                            value={textFont}
                                                            onChange={async (e) => {
                                                                const next = e.target.value as TextFont;
                                                                const faceName =
                                                                    next === "graffiti"
                                                                        ? "graffiti"
                                                                        : next === "oscine"
                                                                            ? "oscine"
                                                                            : next === "pridi"
                                                                                ? "pridi"
                                                                                : next === "gazpacho"
                                                                                    ? "gazpacho"
                                                                                    : next === "impact"
                                                                                        ? "Impact"
                                                                                        : "";

                                                                if (faceName) {
                                                                    await ensureFontLoaded(faceName);
                                                                }
                                                                setTextFont(next);
                                                            }}
                                                        >
                                                            <option value="oscine">Oscine XBold</option>
                                                            <option value="pridi">Pridi</option>
                                                            <option value="graffiti">Graffiti</option>
                                                            <option value="gazpacho">Gazpacho</option>
                                                        </select>
                                                    </Field>

                                                    {/* rest of your Text Layer controls unchanged */}

                                                    <div className="flex items-end gap-4">
                                                        {/*  */}

                                                        <Field labelText="Color" className="w-[104px]">
                                                            <input
                                                                type="color"
                                                                value={textColor}
                                                                onChange={(e) => setTextColor(e.target.value)}
                                                                className="
            h-11 w-full rounded-md border border-neutral-300 p-0 cursor-pointer
            [&::-webkit-color-swatch-wrapper]:p-0
            [&::-webkit-color-swatch]:border-0
            [&::-moz-color-swatch]:border-0
          "
                                                                title="Pick text color"
                                                            />
                                                        </Field>
                                                        <Field labelText="Blend Mode">
                                                            <select
                                                                className="input"
                                                                value={textBlend}
                                                                onChange={(e) => setTextBlend(e.target.value as GlobalCompositeOperation)}
                                                                title="How the text mixes with the artwork"
                                                            >
                                                                {BLEND_MODES.map((m) => (
                                                                    <option key={m} value={m}>{m}</option>
                                                                ))}
                                                            </select>
                                                            {/* <p className="text-xs text-neutral-500">
                                                    Tip: <code>multiply</code> darkens (ink), <code>screen</code> brightens (glow), <code>overlay</code> boosts contrast.
                                                </p> */}
                                                        </Field>
                                                    </div>

                                                    <Field labelText="Scale">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                className="input w-28"
                                                                type="number"
                                                                step={1}
                                                                min={1}
                                                                max={15}
                                                                value={textScale}
                                                                onChange={(e) => setTextScale(Math.max(1, Math.min(15, Number(e.target.value) || 1)))}
                                                                title="Multiply the base size"
                                                            />
                                                            <input
                                                                className="w-full accent-neutral-800"
                                                                type="range"
                                                                min={1}
                                                                max={15}
                                                                step={1}
                                                                value={textScale}
                                                                onChange={(e) => setTextScale(Number(e.target.value))}
                                                                title="Drag to scale"
                                                            />
                                                            <button type="button" className="btn btn-ghost" onClick={() => setTextScale(1)}>
                                                                Reset
                                                            </button>
                                                        </div>
                                                    </Field>

                                                    <Field labelText="Rotate">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                className="input w-28"
                                                                type="number"
                                                                step={5}
                                                                min={-180}
                                                                max={180}
                                                                value={textRotation}
                                                                onChange={(e) => setTextRotation(Math.max(-180, Math.min(180, Number(e.target.value) || 0)))}
                                                                title="Degrees"
                                                            />
                                                            <input
                                                                className="w-full accent-neutral-800"
                                                                type="range"
                                                                min={-180}
                                                                max={180}
                                                                step={5}
                                                                value={textRotation}
                                                                onChange={(e) => setTextRotation(Number(e.target.value))}
                                                                title="Drag to rotate"
                                                            />
                                                            <button type="button" className="btn btn-ghost" onClick={() => setTextRotation(0)}>
                                                                Reset
                                                            </button>
                                                        </div>
                                                    </Field>

                                                    <Field labelText="Nudge">
                                                        <div className="grid grid-cols-3 gap-2 w-[220px]">
                                                            <div />
                                                            <button type="button" className="btn" onClick={() => setTextOffsetX(v => v + nudgeValueSm)}>↑</button>
                                                            <div />
                                                            <button type="button" className="btn" onClick={() => setTextOffsetY(v => v - nudgeValueSm)}>←</button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-ghost"
                                                                onClick={() => { setTextOffsetX(0); setTextOffsetY(0) }}
                                                                title="Center"
                                                            >
                                                                •
                                                            </button>
                                                            <button type="button" className="btn" onClick={() => setTextOffsetY(v => v + nudgeValueSm)}>→</button>
                                                            <div />
                                                            <button type="button" className="btn" onClick={() => setTextOffsetX(v => v - nudgeValueSm)}>↓</button>
                                                            <div />
                                                        </div>
                                                        <div className="flex items-center gap-3 pt-2 text-xs text-neutral-600">
                                                            <span>X: {textOffsetX}px</span>
                                                            <span>Y: {textOffsetY}px</span>
                                                            <button
                                                                type="button"
                                                                className="btn btn-ghost btn-sm"
                                                                onClick={() => { setTextOffsetX(0); setTextOffsetY(0) }}
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
                                            title="JK Designs"
                                            open={openId === 'jk'}
                                            onToggle={(next) => setOpenId(next ? 'jk' : '')}
                                        >
                                            <div className="space-y-3">
                                                <OptionsGrid>
                                                    {jkDesigns.map((d) => (
                                                        <OptionTile
                                                            key={d.id}
                                                            label={d.name}
                                                            image={d.image}
                                                            selected={jkId === d.id}
                                                            onClick={() => setJkId(d.id)}
                                                        />
                                                    ))}
                                                </OptionsGrid>
                                                <p className="text-xs text-neutral-500">
                                                    Fixed artwork; token and glyph controls are hidden, more coming soon!
                                                </p>
                                            </div>
                                        </AccordionSection>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-6">
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => void exportCombinedHorizontal()}
                                        title="Download PNG (top & bottom combined)"
                                    >
                                        Download PNG
                                    </button>

                                    {/* Optional mobile-only Share/Save button */}
                                    {typeof navigator !== 'undefined' && !!navigator.share && (
                                        <button
                                            type="button"
                                            className="btn col-span-2 lg:hidden"
                                            onClick={async () => {
                                                const png = await window.deckCapture?.({ view: 'top', width: 2560, height: 800 });
                                                if (!png) return;
                                                const blob = await (await fetch(png)).blob();
                                                const file = new File([blob], 'deck.png', { type: blob.type });
                                                await navigator.share({
                                                    files: [file],
                                                    title: 'Generational Merch Deck',
                                                    text: 'My Moonbirds deck design 🛹',
                                                });
                                            }}
                                            title="Share / Save to Photos"
                                        >
                                            Share / Save
                                        </button>
                                    )}

                                </div>
                                <div className="space-y-3 mt-6">
                                    {/* Quote contact fields */}
                                    <div className="space-y-2">
                                        <Field labelText="Email for quote">
                                            <input
                                                className="input w-full"
                                                type="email"
                                                placeholder="you@example.com"
                                                value={quoteEmail}
                                                onChange={(e) => setQuoteEmail(e.target.value)}
                                            />
                                        </Field>

                                        <Field labelText="Notes (optional)">
                                            <textarea
                                                className="input w-full min-h-[64px]"
                                                placeholder="Quantity, color preferences, any special requests…"
                                                value={quoteNotes}
                                                onChange={(e) => setQuoteNotes(e.target.value)}
                                            />
                                        </Field>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() => void exportCombinedHorizontal()}
                                            title="Download PNG (top & bottom combined)"
                                        >
                                            Download PNG
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => void handleRequestQuote()}
                                            disabled={quotePending}
                                            title="Submit this design for a printed deck quote"
                                        >
                                            {quotePending ? 'Submitting…' : 'Request a quote'}
                                        </button>
                                    </div>

                                    {quoteMessage && (
                                        <p className="text-xs text-neutral-600">
                                            {quoteMessage}
                                        </p>
                                    )}
                                </div>

                                <div className="text-xs text-neutral-500 pt-2">
                                    Preview is web-resolution; final print assets are prepared offline.
                                </div>
                            </div>
                        </aside >

                        {/* Preview */}
                        <section className="rounded-2xl border shadow-sm p-4 lg:p-5 lg:sticky lg:top-6 self-start">
                            <div className="flex items-center justify-between mb-3">
                                {/* <h3 className="text-sm font-medium">Preview</h3> */}
                                <div className="flex gap-2">
                                    {/* <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => void exportCombinedHorizontal()}   // <-- wrap it
                            title="Download a single PNG with top & bottom, both horizontal"
                        >
                            Download combined PNG
                        </button> */}
                                </div>
                            </div>
                            <div className="rounded-xl bg-white overflow-hidden">
                                <DeckViewerMinimal topUrl={selectedGrip.image} bottomUrl={bottomPreviewUrl} />
                            </div>

                        </section>
                    </div>
                </div>
            </div>
        </div>
    )
}
