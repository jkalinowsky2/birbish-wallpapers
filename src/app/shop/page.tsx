// src/app/shop/page.tsx
'use client'
import { OrdersClosedAnnouncement } from "@/components/OrdersClosedAnnouncement";
import { siteConfig } from "@/config/siteConfig"
import { CartDrawer } from '@/components/CartDrawer'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import {
    STICKER_PRODUCTS,
    DECAL_PRODUCTS,
    CUSTOM_PRODUCTS,
    ALL_PRODUCTS,
    type Product,
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








    // Call the API to check holder status
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

    // 🔹 Load inventory from API
    // useEffect(() => {
    //     let cancelled = false

    //     async function loadInventory() {
    //         try {
    //             const res = await fetch('/api/inventory')
    //             if (!res.ok) {
    //                 console.error('Failed to fetch inventory', await res.text())
    //                 return
    //             }
    //             const data = await res.json() as {
    //                 items?: Array<{
    //                     quantity?: number
    //                     product?: { priceId?: string }
    //                     priceId?: string
    //                 }>
    //             }

    //             if (cancelled) return

    //             const map: Record<string, number> = {}
    //             for (const row of data.items ?? []) {
    //                 const priceId = row.product?.priceId || row.priceId
    //                 if (!priceId) continue
    //                 map[priceId] = typeof row.quantity === 'number' ? row.quantity : 0
    //             }

    //             setInventoryByPriceId(map)
    //         } catch (err) {
    //             console.error('Error loading inventory', err)
    //         }
    //     }

    //     loadInventory()
    //     return () => {
    //         cancelled = true
    //     }
    // }, [])

    const setQuantity = (priceId: string, qty: number) => {
        setCart((prev) => {
            const next = { ...prev }
            if (qty <= 0) {
                delete next[priceId]
            } else {
                next[priceId] = qty
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

    const totalPrice = ALL_PRODUCTS.reduce((sum, product) => {
        if (product.outOfStock) return sum;
        const qty = cart[product.priceId] ?? 0;
        if (!qty) return sum;

        const unit = getTieredUnitPrice(product, qty);
        return sum + unit * qty;
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
            const qty = isOutOfStock ? 0 : (cart[product.priceId] ?? 0)

            const tiers = product.tiers ?? []
            const bestTier =
                tiers.length > 0
                    ? [...tiers].sort((a, b) => a.minQty - b.minQty)[tiers.length - 1]
                    : null

            // 🔹 NEW: which tier applies for *this* quantity?
            const currentTier = getTierForQuantity(product, qty)

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

                    {/* 🔹 Image wrapper – Out Of Stock badge on top of the image */}
                    <div className="relative aspect-[3/2] sm:aspect-[4/3]">
                        <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            sizes="(min-width: 1024px) 20vw, 50vw"
                            style={{ objectFit: 'contain' }}
                        />

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
                                            <span>${effectiveUnitPrice.toFixed(2)} each</span>
                                        </span>
                                    ) : (
                                        <span className="font-semibold">
                                            {product.priceLabel}
                                        </span>
                                    )}

                                    {/* 🔹 Tier hint (e.g. "10+ for $2.50 each") */}
                                    {bestTier && (
                                        <span className="mt-0.5 text-[11px] text-emerald-700 font-medium">
                                            {bestTier.minQty}
                                            {typeof bestTier.maxQty === 'number'
                                                ? `–${bestTier.maxQty}`
                                                : '+'}{' '}
                                            for ${bestTier.unitPrice.toFixed(2)} each
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
                            ) : (
                                <div className="inline-flex items-center gap-2">
                                    <button
                                        type="button"
                                        className="h-6 w-6 rounded-full border border-neutral-300 text-sm leading-none hover:bg-neutral-200"
                                        onClick={() =>
                                            setQuantity(product.priceId, Math.max(0, qty - 1))
                                        }
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

                                            setQuantity(product.priceId, finalQty)
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

                                            setQuantity(product.priceId, finalQty)
                                        }}
                                    >
                                        +
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </article>
            )
        })


    const handleCheckout = async () => {
        if (!totalItems || isCheckingOut) return

        setIsCheckingOut(true)
        try {
            const items = Object.entries(cart).map(([priceId, quantity]) => ({
                priceId,
                quantity,
            }))

            // const res = await fetch('/api/create-checkout-session', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({
            //         items,
            //         giftEligible: isGiftEligible,
            //         walletAddress: address ?? '',
            //     }),
            // })
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
                    onCheckout={handleCheckout}
                    isCheckingOut={isCheckingOut}
                />

                {/* Cart / checkout bar – now full-width since parent is full-width */}
                <div className="sticky bottom-0 bg-[#f7f7f7] border-t z-40 py-4">
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

                        {/* Shipping region toggle
                        <div className="flex items-center gap-2 text-xs text-neutral-700">
                            <span className="font-medium">Shipping:</span>

                            <div className="inline-flex rounded-md border overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setShippingRegion('domestic')}
                                    className={`px-3 py-1 ${shippingRegion === 'domestic'
                                            ? 'bg-neutral-900 text-white'
                                            : 'bg-white hover:bg-neutral-50'
                                        }`}
                                >
                                    US
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShippingRegion('international')}
                                    className={`px-3 py-1 border-l ${shippingRegion === 'international'
                                            ? 'bg-neutral-900 text-white'
                                            : 'bg-white hover:bg-neutral-50'
                                        }`}
                                >
                                    International
                                </button>
                            </div>
                        </div> */}
                        {/* NEW */}

                        <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                            {/* Shipping region toggle — MOVED HERE */}
                            <div className="flex items-center gap-2 text-xs text-neutral-700">
                                <span className="font-medium">Shipping</span>

                                <div className="inline-flex rounded-md border overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setShippingRegion('domestic')}
                                        className={`px-3 py-1 ${shippingRegion === 'domestic'
                                                ? 'bg-neutral-900 text-white'
                                                : 'bg-white hover:bg-neutral-50'
                                            }`}
                                    >
                                        US
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShippingRegion('international')}
                                        className={`px-3 py-1 border-l ${shippingRegion === 'international'
                                                ? 'bg-neutral-900 text-white'
                                                : 'bg-white hover:bg-neutral-50'
                                            }`}
                                    >
                                        International
                                    </button>
                                </div>
                            </div>
                            {/* CartDrawer */}
                            {/* <button
                                type="button"
                                onClick={() => setIsCartOpen(true)}
                                disabled={!totalItems}
                                className="px-5 py-2 rounded-md text-sm font-medium border
             disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                            >
                                View cart ({totalItems})
                            </button> */}

                            {/* Main checkout button */}
                            <button
                                type="button"
                                onClick={handleCheckout}
                                disabled={!siteConfig.checkoutEnabled || !totalItems || isCheckingOut}
                                // disabled={!totalItems || isCheckingOut}
                                className="px-5 py-2 rounded-md text-sm font-medium bg-black text-white 
               disabled:bg-neutral-300 disabled:cursor-not-allowed w-full sm:w-auto"
                            >
                                {!siteConfig.checkoutEnabled
                                    ? 'Checkout disabled'
                                    : isCheckingOut
                                        ? 'Starting checkout…'
                                        : totalItems > 0
                                            ? `Checkout (${totalItems})`
                                            : 'Checkout'}
                            </button>

                            {/* === $BIRB Coming Soon (Teaser Button) === */}
                            {/* <div
                                className="
      mt-1
      px-5 py-2 rounded-md text-sm font-medium 
      bg-gradient-to-r from-[#0dd19c] to-[#9e54fc] 
      text-white shadow-sm 
      flex items-center gap-2 
      cursor-default select-none opacity-90
      w-full sm:w-auto
    "
                            >
                                <span className="uppercase font-bold tracking-wide text-[11px] opacity-90">
                                    Pay with
                                </span>
                                <span className="font-black text-[13px]">$birb</span>

                            </div> */}

                        </div>
                    </div>


                </div>
                <div className="text-xs text-neutral-500 text-center md:text-right mx-10 my-1 sm:mx-0">
                    <p> Now shipping to the following countries: US, Canada, Mexico, Australia, UK, Germany, Hungary, South Korea, Japan, Thailand, New Zealand, & Singapore</p>


                </div>
            </div>
        </div>
    )
}