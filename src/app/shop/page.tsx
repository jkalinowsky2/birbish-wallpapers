// src/app/shop/page.tsx
'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import {
    STICKER_PRODUCTS,
    DECAL_PRODUCTS,
    ALL_PRODUCTS,
    type Product,
} from './products'
import { useAccount } from 'wagmi'

export default function ShopPage() {
    // cart maps priceId -> quantity
    const [cart, setCart] = useState<Record<string, number>>({})
    const [isCheckingOut, setIsCheckingOut] = useState(false)

    // wallet
    const { address } = useAccount() // address will be undefined if not connected

    // moonbird holder flag
    const [isHolder, setIsHolder] = useState(false)
    const [hasClaimedGift, setHasClaimedGift] = useState(false)
    const [remainingGifts, setRemainingGifts] = useState<number | null>(null)

    const [shippingRegion, setShippingRegion] =
        useState<'domestic' | 'international'>('domestic')

    // Call the API to check holder status
    useEffect(() => {
        let cancelled = false

        async function check() {
            if (!address) {
                setIsHolder(false)
                setHasClaimedGift(false)
                setRemainingGifts(null)
                return
            }
            try {
                const r = await fetch('/api/holder-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address }),
                })
                const data = await r.json()

                if (cancelled) return

                setIsHolder(!!data?.isHolder)
                setHasClaimedGift(!!data?.hasClaimedGift)
                setRemainingGifts(
                    typeof data?.remainingGifts === 'number' ? data.remainingGifts : null,
                )
            } catch {
                if (!cancelled) {
                    setIsHolder(false)
                    setHasClaimedGift(false)
                    setRemainingGifts(null)
                }
            }
        }

        check()
        return () => {
            cancelled = true
        }
    }, [address])

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
    const totalPrice = ALL_PRODUCTS.reduce((sum, product) => {
        const qty = cart[product.priceId] ?? 0
        if (!qty) return sum
        const numeric = Number(product.priceLabel.replace(/[^0-9.]/g, '')) || 0
        return sum + numeric * qty
    }, 0)

    // Compute eligibility for free sticker
    const REQ_MIN = 10
    const isGiftEligible =
        isHolder &&
        !hasClaimedGift &&
        totalPrice >= REQ_MIN &&
        (remainingGifts === null || remainingGifts > 0)

    // helper to render products for a given category
    const renderProducts = (items: Product[]) =>
        items.map((product) => {
            const qty = cart[product.priceId] ?? 0
            const isGiftOnly = product.giftOnly === true

            return (
                <article
                    key={product.id}
                    className={`relative flex flex-col rounded-lg overflow-hidden shadow-sm border border-neutral-200/60
      bg-white transition duration-150 ease-out
      hover:shadow-md hover:brightness-[1.03] hover:border-neutral-300
      ${isGiftOnly ? 'bg-[#fffdf7] ring-1 ring-amber-200/60' : ''}
    `}
                >
                    {/* 🔸 Small badge in the top-left for the gift card only */}
                    {isGiftOnly && (
                        <span
                            className="absolute left-2 top-2 rounded-full bg-amber-100 px-2 py-0.5
  text-[10px] font-semibold uppercase tracking-wide text-[#b20000] border border-amber-300 shadow-sm"
                        >
                            Holder perk
                        </span>
                    )}

                    {/* image */}
                    <div className="relative aspect-[3/2] sm:aspect-[4/3]">
                        <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            sizes="(min-width: 1024px) 20vw, 50vw"
                            style={{ objectFit: 'contain' }}
                        />
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
                        </div>

                        <div className="mt-auto flex items-center justify-between">
                            {product.giftOnly ? (
                                <span className="text-sm font-semibold flex items-center gap-2">
                                    <span className="line-through text-neutral-400">
                                        {product.priceLabel}
                                    </span>
                                </span>
                            ) : (
                                <span className="text-sm font-semibold">
                                    {product.priceLabel}
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
                                        step={1}                       // 👈 blocks decimals in the browser UI
                                        value={qty}
                                        onChange={(e) => {
                                            const raw = Number(e.target.value);
                                            const clean = Math.max(0, Math.floor(raw) || 0);  // 👈 ensures integer only
                                            setQuantity(product.priceId, clean);
                                        }}
                                        className="w-10 h-8 text-center text-sm border border-neutral-300 rounded-md bg-neutral-50"
                                    />
                                    <button
                                        type="button"
                                        className="h-6 w-6 rounded-full border bg-neutral-900 text-white text-sm leading-none hover:bg-[#b20b2b]"
                                        onClick={() => setQuantity(product.priceId, qty + 1)}
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
                </div>

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
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">

                            {/* Region selector aligned to the right */}
                            <div className="inline-flex items-center gap-2 text-xs md:text-sm justify-end">
                                <span className="text-neutral-600">Select shipping region:</span>

                                <div className="inline-flex rounded-md border border-neutral-200 bg-neutral-50 p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setShippingRegion('domestic')}
                                        className={`px-2 py-0.5 text-[11px] rounded-md
        ${shippingRegion === 'domestic'
                                                ? 'bg-neutral-900 text-white'
                                                : 'text-neutral-700'}
      `}
                                    >
                                        United States
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShippingRegion('international')}
                                        className={`px-2 py-0.5 text-[11px] rounded-md
        ${shippingRegion === 'international'
                                                ? 'bg-neutral-900 text-white'
                                                : 'text-neutral-700'}
      `}
                                    >
                                        International
                                    </button>
                                </div>
                            </div>

                            {/* Buttons (you keep both versions) */}
                            <div className="flex flex-col items-end gap-2 w-full sm:w-auto">

                                {/* Main checkout button Enable*/}
                                {/* <button
      type="button"
      onClick={handleCheckout}
      disabled={!totalItems || isCheckingOut}
      className="px-5 py-2 rounded-md text-sm font-medium bg-black text-white 
                 disabled:bg-neutral-300 disabled:cursor-not-allowed w-full sm:w-auto"
    >
      {isCheckingOut
        ? 'Starting checkout…'
        : totalItems
          ? `Checkout (${totalItems})`
          : 'Checkout'}
    </button> */}

                                {/* This is the alternate/disabled button you want to keep */}
                                <button
                                    type="button"
                                    disabled={!totalItems || isCheckingOut}
                                    className="px-5 py-2 rounded-md text-sm font-medium bg-black text-white 
                 disabled:bg-neutral-300 disabled:cursor-not-allowed w-full sm:w-auto"
                                >
                                    {isCheckingOut
                                        ? 'Starting checkout…'
                                        : totalItems
                                            ? 'Checkout Disabled'
                                            : 'Checkout Disabled'}
                                </button>

                            </div>
                        </div>
                    </div>


                </div>
                    <div className="text-xs text-neutral-500 text-center md:text-right mx-10 my-1 sm:mx-0">
                        <p> Now shipping to the following countries: US, Canada, Mexico, Australia, UK, Germany, South Korea, Japan</p>


                    </div>
            </div>
        </div>
    )
}