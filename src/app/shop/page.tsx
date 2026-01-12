// src/app/shop/page.tsx
'use client'
import { OrdersClosedAnnouncement } from "@/components/OrdersClosedAnnouncement";
import { siteConfig } from "@/config/siteConfig"
import { CartDrawer } from '@/components/CartDrawer'
import { CUSTOM_COLLECTIONS, buildCustomTokenUrl } from './customCollections'


import Image from 'next/image'
import { useState, useEffect } from 'react'
import {
    STICKER_PRODUCTS,
    DECAL_PRODUCTS,
    CUSTOM_PRODUCTS,
    ALL_PRODUCTS,
    type Product,
    type CustomCollectionKey,
    getTieredUnitPrice,
    getTierForQuantity,
} from './products'
import { useAccount } from 'wagmi'


export default function ShopPage() {
    // cart maps priceId -> quantity
    const [cart, setCart] = useState<Record<string, number>>({})
    const [isCheckingOut, setIsCheckingOut] = useState(false)

    // ✅ New: inventory by priceId
    const [inventoryByPriceId, setInventoryByPriceId] = useState<Record<string, number>>({})

    // wallet
    const { address } = useAccount() // address will be undefined if not connected

    // moonbird holder flag
    const [isHolder, setIsHolder] = useState(false)
    const [hasClaimedGift, setHasClaimedGift] = useState(false)
    const [remainingGifts, setRemainingGifts] = useState<number | null>(null)

    const [shippingRegion, setShippingRegion] =
        useState<'domestic' | 'international'>('domestic')

    const [isCartOpen, setIsCartOpen] = useState(false)

    const CUSTOM_KEY_SEP = '::'
    const DEFAULT_PREVIEW_TOKEN = '8209'


    function makeCartKey(
        priceId: string,
        tokenId?: string,
        variant?: 'illustrated' | 'pixel',
        collection?: CustomCollectionKey
    ) {
        if (!tokenId) return priceId

        // If we know the collection and it doesn't support variants, don't store one in the key.
        if (collection && !CUSTOM_COLLECTIONS[collection].supportsVariantToggle) {
            return `${priceId}${CUSTOM_KEY_SEP}${tokenId}`
        }

        // Otherwise store variant (default illustrated)
        return `${priceId}${CUSTOM_KEY_SEP}${variant ?? 'illustrated'}${CUSTOM_KEY_SEP}${tokenId}`
    }

    function isCustomCartKey(cartKey: string) {
        const n = cartKey.split(CUSTOM_KEY_SEP).length
        return n === 2 || n === 3
    }

    function parseCartKey(cartKey: string): {
        priceId: string
        tokenId?: string
        variant?: 'illustrated' | 'pixel'
    } {
        const parts = cartKey.split(CUSTOM_KEY_SEP)

        // custom with variant: priceId::variant::tokenId
        if (parts.length === 3) {
            const [priceId, variantRaw, tokenId] = parts
            const variant = variantRaw === 'pixel' ? 'pixel' : 'illustrated'
            return { priceId, variant, tokenId }
        }

        // custom without variant: priceId::tokenId
        if (parts.length === 2) {
            const [priceId, tokenId] = parts
            return { priceId, tokenId }
        }

        // normal: just priceId
        return { priceId: cartKey }
    }

    // Identify custom products by priceId
    const CUSTOM_PRICE_IDS = new Set(CUSTOM_PRODUCTS.map((p) => p.priceId))

    function isCustomProduct(priceId: string) {
        return CUSTOM_PRICE_IDS.has(priceId)
    }


    // For the product cards, show total qty across ALL variants of that priceId
    function getTotalQtyForPriceId(priceId: string) {
        return Object.entries(cart).reduce((sum, [cartKey, qty]) => {
            const parsed = parseCartKey(cartKey)
            return parsed.priceId === priceId ? sum + (qty ?? 0) : sum
        }, 0)
    }

    // --- Customize modal state ---
    const [customizeOpen, setCustomizeOpen] = useState(false)
    const [customizePriceId, setCustomizePriceId] = useState<string | null>(null)
    const [customTokenId, setCustomTokenId] = useState('')
    const [tokenPreviewUrl, setTokenPreviewUrl] = useState<string>('')
    const [tokenPreviewError, setTokenPreviewError] = useState<string>('')
    const [customVariant, setCustomVariant] = useState<'illustrated' | 'pixel'>('illustrated')
    const [customCollection, setCustomCollection] = useState<CustomCollectionKey>('moonbirds')
    const [customQty, setCustomQty] = useState(1)

    // const R2_BASE =
    //     process.env.NEXT_PUBLIC_MOONBIRDS_BG_BASE ||
    //     'https://pub-64564156afab49558e441af999f4c356.r2.dev'

    // const MYTHICS_CONTRACT = '0xC0FFee8FF7e5497C2d6F7684859709225Fcc5Be8'
    // const MYTHICS_BASE = `https://proof-nft-image.imgix.net/${MYTHICS_CONTRACT}`


    function openCustomize(priceId: string) {
        setCustomizePriceId(priceId)

        const product = ALL_PRODUCTS.find((p) => p.priceId === priceId)
        const collection: CustomCollectionKey = product?.customCollection ?? 'moonbirds'

        setCustomCollection(collection)

        // Start blank so placeholder shows
        setCustomTokenId('')

        // Default variant (safe for now since only moonbirds uses the toggle in your UI)
        setCustomVariant('illustrated')
        setCustomQty(1)

        setCustomizeOpen(true)
    }

    function confirmCustomize() {
        if (!customizePriceId) return

        const token = customTokenId.trim()
        if (!token) {
            alert('Please enter a Token ID.')
            return
        }

        const cartKey = makeCartKey(customizePriceId, token, customVariant, customCollection)
        const currentQty = cart[cartKey] ?? 0
        setQuantity(cartKey, currentQty + customQty)

        setCustomizeOpen(false)
        setIsCartOpen(true) // optional, but nice UX
    }

    ///NEW HOLDER CHECK:
    // ✅ Call the API to check holder status whenever the wallet changes
    useEffect(() => {
        let cancelled = false

        async function loadHolderStatus() {
            // wallet disconnected -> reset UI state
            if (!address) {
                setIsHolder(false)
                setHasClaimedGift(false)
                setRemainingGifts(null)
                return
            }

            try {
                const res = await fetch('/api/holder-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    cache: 'no-store',
                    body: JSON.stringify({ address }),
                })

                const data = await res.json()
                console.log('[shop] holder-status:', data)

                if (cancelled) return

                setIsHolder(!!data?.isHolder)
                setHasClaimedGift(!!data?.hasClaimedGift)
                setRemainingGifts(
                    typeof data?.remainingGifts === 'number' ? data.remainingGifts : null
                )
            } catch (err) {
                console.error('[shop] holder-status error:', err)
                if (!cancelled) {
                    setIsHolder(false)
                    setHasClaimedGift(false)
                    setRemainingGifts(null)
                }
            }
        }

        loadHolderStatus()

        return () => {
            cancelled = true
        }
    }, [address])
    ///END HOLDER CHECK

    // 🔹 Load inventory from API
    useEffect(() => {
        let cancelled = false

        async function loadInventory() {
            try {
                const res = await fetch('/api/inventory')
                if (!res.ok) {
                    console.error('Failed to fetch inventory', await res.text())
                    return
                }

                const raw = await res.json()
                console.log('Inventory API data:', raw)

                // Handle different possible shapes:
                // { items: [...] }  or  { inventory: [...] }  or  [...]
                type InventoryRow = {
                    quantity?: number
                    product?: { priceId?: string }
                    priceId?: string
                }

                const rows: InventoryRow[] =
                    (Array.isArray(raw) ? raw : raw.items ?? raw.inventory ?? []) ?? []

                const map: Record<string, number> = {}

                for (const row of rows) {
                    const priceId = row.product?.priceId ?? row.priceId
                    if (!priceId) continue

                    const quantity =
                        typeof row.quantity === 'number' ? row.quantity : 0

                    map[priceId] = quantity
                }

                if (!cancelled) {
                    setInventoryByPriceId(map)
                }
            } catch (err) {
                console.error('Error loading inventory', err)
            }
        }

        loadInventory()
        return () => {
            cancelled = true
        }
    }, [])

    // toggle pixel - illustrated in custom modal
    useEffect(() => {
        const cfg = CUSTOM_COLLECTIONS[customCollection]

        const tokenForPreview =
            customTokenId.trim() !== '' ? customTokenId.trim() : cfg.defaultPreviewToken

        const url = buildCustomTokenUrl(tokenForPreview, customCollection, customVariant)

        setTokenPreviewUrl(url)
        setTokenPreviewError('')
    }, [customTokenId, customVariant, customCollection])


    const setQuantity = (cartKey: string, qty: number) => {
        setCart((prev) => {
            const next = { ...prev }
            if (qty <= 0) {
                delete next[cartKey]
            } else {
                next[cartKey] = qty
            }
            return next
        })
    }

    const totalItems = Object.values(cart).reduce((sum, q) => sum + q, 0)

    // optional: compute a rough total from priceLabel strings
    // const totalPrice = ALL_PRODUCTS.reduce((sum, product) => {
    //     const qty = cart[product.priceId] ?? 0
    //     if (!qty) return sum
    //     const numeric = Number(product.priceLabel.replace(/[^0-9.]/g, '')) || 0
    //     return sum + numeric * qty
    // }, 0)

    const totalCustomQty = Object.entries(cart).reduce((sum, [cartKey, qty]) => {
        if (!qty) return sum
        const { priceId } = parseCartKey(cartKey)
        return isCustomProduct(priceId) ? sum + qty : sum
    }, 0)

    const MIN_CUSTOM_QTY = 5
    const customMinNotMet = totalCustomQty > 0 && totalCustomQty < MIN_CUSTOM_QTY

    const totalPrice = Object.entries(cart).reduce((sum, [cartKey, qty]) => {
        if (!qty) return sum

        const { priceId } = parseCartKey(cartKey)
        const product = ALL_PRODUCTS.find((p) => p.priceId === priceId)

        if (!product || product.outOfStock) return sum

        const pricingQty = isCustomProduct(priceId) ? totalCustomQty : qty
        const unit = getTieredUnitPrice(product, pricingQty)
        return sum + unit * qty
    }, 0);
    // Compute eligibility for free sticker
    const REQ_MIN = 10
    const isGiftEligible =
        isHolder &&
        !hasClaimedGift &&
        totalPrice >= REQ_MIN &&
        (remainingGifts === null || remainingGifts > 0)


    const renderProducts = (items: Product[]) =>
        items.map((product) => {
            const isGiftOnly = product.giftOnly === true

            // 🔹 Look up inventory from DB using priceId
            const inventoryQty = inventoryByPriceId[product.priceId]

            // 🔹 Treat 0 or negative inventory as out of stock
            const isOutOfStock =
                product.outOfStock === true ||
                (typeof inventoryQty === 'number' && inventoryQty <= 0)

            // if out of stock, force qty to 0 so it doesn’t sneak into the cart
            // const qty = isOutOfStock ? 0 : (cart[product.priceId] ?? 0)
            const baseCartKey = makeCartKey(product.priceId) // non-custom key
            const isCustom = isCustomProduct(product.priceId)

            // For custom products, show total across all variants
            const qty = isOutOfStock
                ? 0
                : isCustom
                    ? getTotalQtyForPriceId(product.priceId)
                    : (cart[baseCartKey] ?? 0)

            const tiers = product.tiers ?? []
            const bestTier =
                tiers.length > 0
                    ? [...tiers].sort((a, b) => a.minQty - b.minQty)[tiers.length - 1]
                    : null

            // 🔹 NEW: which tier applies for *this* quantity?
            const pricingQtyForTier = isCustom ? totalCustomQty : qty
            const currentTier = getTierForQuantity(product, pricingQtyForTier)

            // Base unit price from priceLabel (e.g. "$3.50" -> 3.5)
            const baseUnitPrice =
                Number(product.priceLabel.replace(/[^0-9.]/g, '')) || 0

            // Unit price that actually applies at this quantity
            const effectiveUnitPrice = currentTier?.unitPrice ?? baseUnitPrice

            return (
                <article
                    key={product.id}
                    className={`relative flex flex-col rounded-lg overflow-hidden shadow-sm border border-neutral-200/60
      bg-white transition duration-150 ease-out
      ${!isOutOfStock ? 'hover:shadow-md hover:brightness-[1.03] hover:border-neutral-300' : ''}
      ${isGiftOnly ? 'bg-[#fffdf7] ring-1 ring-amber-200/60' : ''}
      ${isOutOfStock ? 'opacity-60' : ''}
    `}
                >

                    {/* 🔸 Holder-perk badge (top-left of card, stays where it is) */}
                    {isGiftOnly && (
                        <span
                            className="absolute left-2 top-2 rounded-full bg-amber-100 px-2 py-0.5
        text-[10px] font-semibold uppercase tracking-wide text-[#b20000] border border-amber-300 shadow-sm"
                        >
                            Holder perk
                        </span>
                    )}

                    {/* 🔹 Image wrapper – clickable for custom products */}
                    <div
                        className={`relative aspect-[3/2] sm:aspect-[4/3] ${isCustom && !isOutOfStock ? 'cursor-pointer' : ''
                            }`}
                    >
                        {isCustom && !isOutOfStock ? (
                            <button
                                type="button"
                                onClick={() => openCustomize(product.priceId)}
                                className="absolute inset-0 z-10 cursor-pointer"
                                aria-label={`Customize ${product.name}`}
                                title="Customize"
                            />
                        ) : null}

                        <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            sizes="(min-width: 1024px) 20vw, 50vw"
                            style={{ objectFit: 'contain' }}
                        />

                        {/* Optional: subtle “clickable” cursor for custom items */}
                        {isCustom && !isOutOfStock ? (
                            <div className="absolute inset-0 pointer-events-none cursor-pointer" />
                        ) : null}

                        {isOutOfStock && (
                            <span
                                className="absolute right-2 top-2 rounded-full bg-neutral-900/90 px-2 py-0.5
        text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm"
                            >
                                Out of stock
                            </span>
                        )}
                    </div>

                    {/* body */}
                    <div className="p-3 flex flex-col gap-2 flex-1">
                        <div>
                            <h2 className="text-sm font-semibold leading-snug">
                                {product.name}
                            </h2>
                            <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                                {product.description}
                            </p>

                            {/* 🔹 Inventory display */}
                            {siteConfig.showInventory && typeof inventoryQty === 'number' && (
                                <p className="mt-1 text-[11px] text-neutral-500">
                                    {inventoryQty > 0 ? `${inventoryQty} in stock` : 'Out of stock'}
                                </p>
                            )}
                        </div>

                        <div className="mt-auto flex items-center justify-between">
                            {product.giftOnly ? (
                                <span className="text-sm font-semibold flex items-center gap-2">
                                    <span className="line-through text-neutral-400">
                                        {product.priceLabel}
                                    </span>
                                </span>
                            ) : (
                                <span className="flex flex-col items-start text-sm">
                                    {/* 🔹 Main price line — updates when a tier applies */}
                                    {currentTier && effectiveUnitPrice < baseUnitPrice ? (
                                        <span className="font-semibold">
                                            <span className="line-through text-neutral-400 mr-1">
                                                {product.priceLabel}
                                            </span>
                                            <span>${effectiveUnitPrice.toFixed(2)}</span>
                                        </span>
                                    ) : (
                                        <span className="font-semibold">
                                            {product.priceLabel}
                                        </span>
                                    )}

                                    {/* 🔹 Tier hint (e.g. "10+ for $2.50 each") */}
                                    {!isCustom && bestTier && (
                                        <span className="mt-0.5 text-[11px] text-emerald-700 font-medium">
                                            {bestTier.minQty}
                                            {typeof bestTier.maxQty === 'number'
                                                ? `–${bestTier.maxQty}`
                                                : '+'}{' '}
                                            for ${bestTier.unitPrice.toFixed(2)}
                                        </span>
                                    )}
                                </span>
                            )}

                            {isGiftOnly ? (
                                <div className="text-right text-sm leading-tight">
                                    {typeof remainingGifts === 'number' && (
                                        <div className="text-sm font-semibold text-neutral-400">
                                            {remainingGifts} stickers left
                                        </div>
                                    )}
                                </div>
                            ) : isOutOfStock ? (
                                <div className="text-xs font-semibold text-red-600 text-right">
                                    Out of stock
                                </div>
                            ) : isCustom ? (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openCustomize(product.priceId)}
                                        className="px-3 py-2 rounded-md text-xs font-semibold bg-neutral-900 text-white hover:bg-[#b20b2b]"
                                    >
                                        Customize
                                    </button>

                                    {/* {qty > 0 && (
                                        <span className="text-xs text-neutral-600">
                                            In cart: {qty}
                                        </span>
                                    )} */}
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-2">
                                    <button
                                        type="button"
                                        className="h-6 w-6 rounded-full border border-neutral-300 text-sm leading-none hover:bg-neutral-200"
                                        onClick={() => setQuantity(baseCartKey, Math.max(0, qty - 1))}
                                    >
                                        –
                                    </button>

                                    <input
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={qty}
                                        onChange={(e) => {
                                            const raw = Number(e.target.value)
                                            const clean = Math.max(0, Math.floor(raw) || 0)

                                            const finalQty =
                                                siteConfig.limitOrdersToInventory && typeof inventoryQty === 'number'
                                                    ? Math.min(clean, inventoryQty)
                                                    : clean

                                            setQuantity(baseCartKey, finalQty)
                                        }}
                                        className="w-10 h-8 text-center text-sm border border-neutral-300 rounded-md bg-neutral-50"
                                    />

                                    <button
                                        type="button"
                                        className="h-6 w-6 rounded-full border bg-neutral-900 text-white text-sm leading-none hover:bg-[#b20b2b]"
                                        onClick={() => {
                                            const nextQty = qty + 1

                                            const finalQty =
                                                siteConfig.limitOrdersToInventory && typeof inventoryQty === 'number'
                                                    ? Math.min(nextQty, inventoryQty)
                                                    : nextQty

                                            setQuantity(baseCartKey, finalQty)
                                        }}
                                    >
                                        +
                                    </button>
                                </div>
                            )
                            }
                        </div>
                    </div>
                </article>
            )
        })


    const handleCheckout = async () => {
        if (!totalItems || isCheckingOut) return

        setIsCheckingOut(true)
        try {
            const items = Object.entries(cart).map(([cartKey, quantity]) => {
                const { priceId, tokenId, variant } = parseCartKey(cartKey)
                return {
                    priceId,
                    quantity,
                    tokenId,   // undefined for normal products (fine)
                    variant,   // undefined for non-custom / non-variant collections (fine)
                }
            })
            const res = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items,
                    giftEligible: isGiftEligible,
                    walletAddress: address ?? '',
                    shippingRegion,             // 👈 add this
                }),
            })

            const data = await res.json()
            if (data.url) {
                window.location.href = data.url
            } else {
                console.error('Checkout error payload:', data)
                alert('Something went wrong starting checkout.')
            }
        } catch (err) {
            console.error(err)
            alert('Something went wrong starting checkout.')
        } finally {
            setIsCheckingOut(false)
        }
    }

    const tokenTrimmed = customTokenId.trim()
    const tokenNum = Number(tokenTrimmed)

    const canAdd =
        !!tokenPreviewUrl &&
        !tokenPreviewError &&
        Number.isFinite(tokenNum) &&
        tokenNum >= 1

    return (
        // Full-width wrapper that breaks out of the centered layout
        <div className="w-screen relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] bg-neutral-50">
            {/* UNCOMMENT FOR CLOSED POPUP */}

            {siteConfig.shopPopupOn && <OrdersClosedAnnouncement />}

            <div className="bg-[#faf7f2] p-0 m-0">
                {/* Hero band */}
                <section className="w-full bg-gradient-to-b from-[#ce0000] to-[#b20000] text-white border-b border-neutral-900">
                    <div className="
    px-4 md:px-8 lg:px-10
    pt-4 pb-5          /* tighter on mobile */
    sm:pt-6 sm:pb-8
    md:pt-10 md:pb-12
    lg:pt-16 lg:pb-16
  ">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
                            Merch Shop
                        </h1>

                        <p className="mt-2 text-xs sm:text-sm md:text-base text-white">
                            Premium die-cut vinyl stickers and decals for water bottles,
                            laptops, and everywhere you rep the birbs.
                        </p>
                        <div
                            className="
    inline-flex items-center gap-2 
    rounded-full bg-black/60 border border-white/10
    px-3 py-[4px]          /* tighter padding on mobile */
    text-[10px] sm:text-xs text-neutral-100 
    mt-4 sm:mt-6
  "
                        >

                            <span className="font-semibold uppercase tracking-[0.18em] text-[11px] text-[#ffd28f]">
                                NOW OPEN!
                            </span>

                            <span className="text-[11px] md:text-xs">
                                Free Moonbird-exclusive holographic sticker with $10+ order.
                            </span>
                        </div>

                        {/* Paused Message */}
                        {/* <div
                            className="inline-flex items-center gap-3 rounded-full bg-black/60 border border-white/10
                    px-4 py-1.5 text-xs md:text-sm text-neutral-100 mt-8"
                        >
                            <span className="font-semibold uppercase tracking-[0.18em] text-[11px] text-[#ffd28f]">
                                CHECKOUT TEMPORARILY PAUSED. 
                            </span>

                            <span className="text-[11px] md:text-xs">
                                We're currently filling orders. Please check back soon!
                            </span>
                        </div> */}
                        {/* End Paused Message */}

                    </div>
                </section>
            </div>

            {/* Inner content with some horizontal padding */}
            <div className="px-4 md:px-6 lg:px-8 pb-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <header className="mb-6" />

                    {/* Stickers */}
                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold tracking-wide text-neutral-800">
                            Stickers
                        </h2>
                        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 py-4">
                            {renderProducts(STICKER_PRODUCTS)}
                        </div>
                    </section>

                    {/* Transfer decals */}
                    <section className="space-y-2 mt-4">
                        <h2 className="text-lg font-semibold tracking-wide text-neutral-800">
                            Transfer Stickers
                        </h2>
                        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 py-4">
                            {renderProducts(DECAL_PRODUCTS)}
                        </div>
                    </section>

                    {/* Custom */}
                    <section className="space-y-2 mt-4">
                        <h2 className="text-lg font-semibold tracking-wide text-neutral-800">
                            Custom Stickers
                        </h2>

                        {/* ✅ New: one clean pricing/rules block for all custom stickers */}
                        <div className="rounded-lg p-0 text-neutral-700">
                            {/* <div className="font-semibold text-neutral-900">Mix &amp; match pricing</div> */}
                            <p className="mt-0">
                                Custom stickers are high-quality, full-bleed (no borders), and finished with matte vinyl laminate for UV protection, 
                                durability, and water-resistance.
                                
                                Stickers are designed for everyday use on smooth surfaces and are hand-wash only (not dishwasher safe). <br/><br/>
                                
                                Dimensions: 1.75&quot; (44.5mm) square.<br/><br/>

                                Mix & match custom stickers across collections (minimum of <strong>5 stickers</strong> per order.) <br/>
                            </p>

                            <p className="mt-3 font-semibold">Volume Pricing (per sticker):</p>
                            <div className="mt-2 pl-4 space-y-0.5 text-sm text-neutral-800">
                                <div>• 5–9 stickers - <strong>$1.50</strong></div>
                                <div>• 10-19 stickers - <strong>$1.25</strong></div>
                                <div>• 20+ stickers - <strong>$1.00</strong></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 py-4">
                            {renderProducts(CUSTOM_PRODUCTS)}
                        </div>
                    </section>
                </div>

                <CartDrawer
                    open={isCartOpen}
                    onClose={() => setIsCartOpen(false)}
                    cart={cart}
                    products={ALL_PRODUCTS}
                    setQuantity={setQuantity}
                    totalPrice={totalPrice}
                    totalCustomQty={totalCustomQty}
                    minCustomQty={MIN_CUSTOM_QTY}
                    customMinNotMet={customMinNotMet}
                    onCheckout={handleCheckout}
                    isCheckingOut={isCheckingOut}
                    checkoutEnabled={siteConfig.checkoutEnabled}
                    shippingRegion={shippingRegion}
                    setShippingRegion={setShippingRegion}
                />

                {customizeOpen && (
                    <>
                        {/* Backdrop */}
                        {/* <button
                            type="button"
                            aria-label="Close customize modal"
                            onClick={() => setCustomizeOpen(false)}
                            className="fixed inset-0 z-50 bg-black/40"
                        /> */}

                        {/* Modal */}
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
                            onClick={() => setCustomizeOpen(false)} // 👈 close on outside click
                        >
                            <div
                                className="w-full max-w-sm rounded-xl bg-white shadow-xl border p-4"
                                onClick={(e) => e.stopPropagation()} // 👈 prevent inside clicks from closing
                            >

                                {/* Header */}
                                <div className="font-semibold">
                                    Customize Sticker
                                </div>

                                {/* Token section */}
                                {/* Token input */}
                                <div className="mt-3">
                                    <input
                                        value={customTokenId}
                                        onChange={(e) => setCustomTokenId(e.target.value)}
                                        placeholder="Enter Token ID"
                                        inputMode="numeric"
                                        className="
      w-[140px]
      border rounded-md
      px-3 py-2
      text-sm
    "
                                    />

                                    {/* Pixel / Illustrated toggle (Moonbirds only) */}
                                    {CUSTOM_COLLECTIONS[customCollection].supportsVariantToggle && (
                                        <div className="mt-3">
                                            <div className="inline-grid grid-cols-2 rounded-full bg-neutral-200 p-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setCustomVariant('illustrated')}
                                                    className={`px-4 py-2 text-sm rounded-full transition
            ${customVariant === 'illustrated'
                                                            ? 'bg-[#d1242a] text-white shadow-sm'
                                                            : 'text-neutral-700 hover:text-neutral-900'
                                                        }`}
                                                >
                                                    Illustrated
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setCustomVariant('pixel')}
                                                    className={`px-4 py-2 text-sm rounded-full transition
            ${customVariant === 'pixel'
                                                            ? 'bg-[#d1242a] text-white shadow-sm'
                                                            : 'text-neutral-700 hover:text-neutral-900'
                                                        }`}
                                                >
                                                    Pixel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Preview */}
                                <div className="mt-4">
                                    {tokenPreviewUrl ? (
                                        <div className="rounded-lg p-2">
                                            {tokenPreviewError ? (
                                                <div className="text-sm text-red-600">
                                                    {tokenPreviewError}
                                                </div>
                                            ) : (
                                                <img
                                                    key={`${customCollection}:${customVariant}:${customTokenId.trim()}`}
                                                    src={tokenPreviewUrl}
                                                    alt={`Preview #${customTokenId}`}
                                                    className="
                    mx-auto
                    bg-white 
                    h-40 w-40
                    object-contain
                    rounded-xl
                    shadow-[3px_3px_12px_rgba(0,0,0,0.5)]
                  "
                                                    onError={() =>
                                                        setTokenPreviewError(
                                                            'Could not load that image. Check the Token ID.'
                                                        )
                                                    }
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-neutral-500">
                                            Enter a Token ID to see a preview.
                                        </div>
                                    )}
                                </div>

                                {/* Add to cart */}
                                <div className="mt-4 flex items-center gap-3">
                                    {/* Quantity input */}
                                    <input
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={customQty}
                                        onChange={(e) => {
                                            const raw = Number(e.target.value)
                                            setCustomQty(Math.max(1, Math.floor(raw) || 1))
                                        }}
                                        className="
      w-20
      h-10
      text-center
      text-sm
      border
      rounded-md
      bg-neutral-50
    "
                                    />

                                    {/* Add to cart button */}
                                    <button
                                        type="button"
                                        onClick={confirmCustomize}
                                        disabled={!canAdd}
                                        className={`
      flex-1
      h-10
      rounded-md
      text-sm
      font-medium
      text-white
      ${canAdd ? 'bg-black hover:bg-neutral-800' : 'bg-neutral-400 cursor-not-allowed'}
    `}
                                    >
                                        Add to cart
                                    </button>
                                </div>


                                {/* Continue shopping */}
                                <button
                                    type="button"
                                    onClick={() => setCustomizeOpen(false)}
                                    className="mt-2 w-full text-xs text-neutral-500 hover:text-neutral-800 underline underline-offset-2"
                                >
                                    Continue shopping
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Cart / checkout bar – now full-width since parent is full-width */}
                <div className="sticky bg-[#fafafa] bottom-0 border-t z-40 py-4">
                    {/* <div className="bg-[#f7f7f7] border-t z-40 sm:py-4 py-2"> */}
                    <div
                        className="
      mx-auto max-w-7xl 
      flex flex-col gap-2 sm:gap-4
      sm:flex-row sm:items-center sm:justify-between 
      rounded-lg border bg-white 
      px-3 py-2 sm:px-4 sm:py-3 
      shadow-sm 
      text-[12px] sm:text-sm    /* smaller text on mobile */
    "
                    >
                        <div className="text-xs sm:text-sm text-neutral-700">
                            {totalItems ? (
                                <>
                                    <span>
                                        You&apos;ve selected {totalItems} item
                                        {totalItems > 1 ? 's' : ''}.
                                    </span>
                                    {totalPrice > 0 && (
                                        <span className="ml-2 font-semibold">
                                            (~${totalPrice.toFixed(2)})
                                        </span>
                                    )}

                                    {/* ✅ Custom sticker minimum status */}
                                    {customMinNotMet && (
                                        <div className="mt-1 text-xs text-red-700">
                                            Custom stickers: <strong>{totalCustomQty}</strong> — add{' '}
                                            <strong>{MIN_CUSTOM_QTY - totalCustomQty}</strong> more to checkout
                                        </div>
                                    )}

                                    {isHolder && hasClaimedGift && (
                                        <div className="text-xs text-neutral-600 mt-1">
                                            You&apos;ve already claimed your free holographic sticker
                                            on a previous order. 🦉
                                        </div>
                                    )}

                                    {isHolder && !hasClaimedGift && (remainingGifts ?? 1) <= 0 && (
                                        <div className="text-xs text-neutral-600 mt-1">
                                            This round of holographic stickers have all been claimed.
                                            Thanks, birbs! ❤️
                                        </div>
                                    )}

                                    {isGiftEligible && (remainingGifts ?? 1) > 0 && (
                                        <div className="text-xs font-medium text-green-700 mt-1">
                                            🎁 Congrats, birb! You&apos;re getting a free sticker with
                                            this order for holding a Moonbird.
                                        </div>
                                    )}

                                    {!isGiftEligible && !hasClaimedGift && totalItems > 0 && (
                                        <div className="text-xs text-neutral-600 mt-1">
                                            Connect a wallet that holds a Moonbird and spend ${REQ_MIN}
                                            + to unlock a free holographic sticker.
                                        </div>
                                    )}
                                </>
                            ) : (
                                <span>No stickers selected yet.</span>
                            )}
                        </div>

                        {/* Right: region selector + checkout buttons aligned right */}
                        {/* Buttons */}
                        {/* NEW */}

                        <div className="flex flex-col items-end gap-2">
                            {/* Single action in bar: open cart */}
                            <button
                                type="button"
                                onClick={() => setIsCartOpen(true)}
                                disabled={!totalItems}
                                className="
   px-5 py-2 rounded-md text-sm font-medium
    bg-black text-white
    disabled:bg-neutral-300 disabled:text-white
    disabled:opacity-50 disabled:cursor-not-allowed
  "
                            >
                                View cart ({totalItems})
                            </button>
                        </div>
                    </div>


                </div>
                <div className="text-xs text-neutral-500 text-center md:text-right mx-10 my-1 sm:mx-0">
                    <p> Now shipping to the following countries: US, Canada, Mexico, Australia, UK, Germany, Hungary, South Korea, Japan, Thailand, New Zealand, & Singapore</p>


                </div>
            </div>
        </div >
    )
}