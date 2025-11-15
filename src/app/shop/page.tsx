
// src/app/shop/page.tsx
'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { PRODUCTS } from "./products";
import { useAccount } from 'wagmi'

export default function ShopPage() {
    // cart maps priceId -> quantity
    const [cart, setCart] = useState<Record<string, number>>({})
    const [isCheckingOut, setIsCheckingOut] = useState(false)

    // wallet
    const { address } = useAccount()            // address will be undefined if not connected

    // moonbird holder flag
    const [isHolder, setIsHolder] = useState(false)
    const [hasClaimedGift, setHasClaimedGift] = useState(false)
    const [remainingGifts, setRemainingGifts] = useState<number | null>(null)


    //) Call the API to check holder status 
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
        return () => { cancelled = true }
    }, [address])
    ////

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
    const totalPrice = PRODUCTS.reduce((sum, product) => {
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleCheckout = async () => {
        if (!totalItems || isCheckingOut) return


        setIsCheckingOut(true)
        try {
            const items = Object.entries(cart).map(([priceId, quantity]) => ({
                priceId,
                quantity,
            }))

            const res = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items,
                    giftEligible: isGiftEligible,
                    walletAddress: address ?? '',
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
        <div className="space-y-6">
            <header className="mb-2">
                <h1 className="text-3xl font-bold mb-2">Sticker Shop Szn 1</h1>
                <p className="text-sm text-neutral-600">
                    Premium die-cut vinyl stickers, perfect for water bottles, laptops, or anywhere else you want to rep the birbs.
                </p>
            </header>
            <div className="grid grid-cols-2 w-full gap-2 aspect-[16/6] md:aspect-[16/5] lg:h-[380px]">

                <div className="relative w-full h-full rounded-lg overflow-hidden">
                    <Image
                        src="/assets/images/MacBook-Office.png"
                        alt="Birbish Left"
                        fill
                        className="object-cover"
                        sizes="50vw"
                        priority
                    />
                </div>

                <div className="relative w-full h-full rounded-lg overflow-hidden">
                    <Image
                        src="/assets/images/Yeti-Office.png"
                        alt="Birbish Right"
                        fill
                        className="object-cover"
                        sizes="50vw"
                        priority
                    />
                </div>

            </div>

            {/* Product grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 py-4">
                {PRODUCTS.map((product) => {
                    const qty = cart[product.priceId] ?? 0
                    const isGiftOnly = product.giftOnly === true

                    return (
                        <article
                            key={product.id}
                            className="flex flex-col rounded-lg border bg-white shadow-sm overflow-hidden"
                        >
                            <div className="relative aspect-[3/2] sm:aspect-[4/3] bg-neutral-100">
                                <Image
                                    src={product.image}
                                    alt={product.name}
                                    fill
                                    sizes="(min-width: 1024px) 25vw, 50vw"
                                    style={{ objectFit: 'contain' }}
                                />
                            </div>

                            <div className="p-3 flex flex-col gap-2 flex-1">
                                <div>
                                    <h2 className="text-sm font-semibold">{product.name}</h2>
                                    <p className="text-xs text-neutral-600 mt-1">
                                        {product.description}
                                    </p>
                                </div>

                                <div className="mt-auto flex items-center justify-between">
                                    {product.giftOnly ? (
                                        <span className="text-sm font-semibold flex items-center gap-2">
                                            <span className="line-through text-neutral-400">{product.priceLabel}</span>
                                            {/* <span className="text-[#d12429] font-semibold">Moonbirds holder perk</span> */}
                                        </span>
                                    ) : (
                                        <span className="text-sm font-semibold">
                                            {product.priceLabel}
                                        </span>
                                    )}

                                    {isGiftOnly ? (
                                        <div className="text-right text-sm leading-tight">
                                            {/* <div className="font-semibold text-[#d12429]">
                                                Moonbirds holder perk
                                            </div> */}

                                            {typeof remainingGifts === 'number' && (
                                                <div className="text-sm font-semibold text-neutral-400">
                                                    {remainingGifts} stickers left
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        // Normal quantity controls for buyable products
                                        <div className="inline-flex items-center gap-2">
                                            <button
                                                type="button"
                                                className="h-8 w-8 rounded-full border border-neutral-300 text-sm leading-none"
                                                onClick={() => setQuantity(product.priceId, Math.max(0, qty - 1))}
                                            >
                                                –
                                            </button>
                                            <input
                                                type="number"
                                                min={0}
                                                value={qty}
                                                onChange={(e) =>
                                                    setQuantity(
                                                        product.priceId,
                                                        Math.max(0, Number(e.target.value) || 0),
                                                    )
                                                }
                                                className="w-10 h-8 text-center text-sm border border-neutral-300 rounded-md"
                                            />
                                            <button
                                                type="button"
                                                className="h-8 w-8 rounded-full border border-neutral-900 bg-neutral-900 text-white text-sm leading-none"
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
                })}
            </div>


            {/* Cart / checkout bar */}
            {/* <div className="sticky bottom-0 py-4 bg-gradient-to-t from-[#f7f7f7] to-transparent"> */}
            <div className="sticky bottom-0 py-4 bg-[#f7f7f7] border-t z-40">
                <div className="max-w-6xl mx-auto flex items-center justify-between rounded-lg border bg-white px-4 py-2 shadow-sm">
                    <div className="text-sm text-neutral-700">
                        {totalItems ? (
                            <>
                                <span>
                                    You&apos;ve selected {totalItems} sticker{totalItems > 1 ? 's' : ''}.
                                </span>
                                {totalPrice > 0 && (
                                    <span className="ml-2 font-semibold">
                                        (~${totalPrice.toFixed(2)})
                                    </span>
                                )}

                                {isHolder && hasClaimedGift && (
                                    <div className="text-xs text-neutral-600 mt-1">
                                        You&apos;ve already claimed your free holographic sticker on a previous
                                        order. 🦉
                                    </div>
                                )}

                                {isHolder && !hasClaimedGift && (remainingGifts ?? 1) <= 0 && (
                                    <div className="text-xs text-neutral-600 mt-1">
                                        This round of holographic stickers have all been claimed. Thanks, birbs! ❤️
                                    </div>
                                )}

                                {isGiftEligible && (remainingGifts ?? 1) > 0 && (
                                    <div className="text-xs font-medium text-green-700 mt-1">
                                        🎁 Congrats, birb! You&apos;re getting a free sticker
                                        with this order for holding a Moonbird.
                                    </div>
                                )}

                                {/* Show instructions to *anyone* not eligible */}
                                {!isGiftEligible &&
                                    !hasClaimedGift &&          // ← NEW: don't show if already claimed
                                    totalItems > 0 && (
                                        <div className="text-xs text-neutral-600 mt-1">
                                            Connect a wallet that holds a Moonbird and spend ${REQ_MIN}+
                                            to unlock a free holographic sticker.
                                        </div>
                                    )}
                            </>
                        ) : (
                            <span>No stickers selected yet.</span>
                        )}
                    </div>

                    {/* DISABLE CHECKOUT */}
                    <button
                        type="button"
                        // onClick={handleCheckout}
                        disabled={!totalItems || isCheckingOut}
                        className="px-5 py-2 rounded-md text-sm font-medium bg-black text-white disabled:bg-neutral-300 disabled:cursor-not-allowed"
                    >
                        {isCheckingOut
                            ? 'Starting checkout…'
                            : totalItems
                                ? `Disabled`
                                // ? `Checkout (${totalItems})`
                                : 'Disabled'}
                    </button>


                    {/* <button
                        type="button"
                        onClick={handleCheckout}
                        disabled={!totalItems || isCheckingOut}
                        className="px-5 py-2 rounded-full text-sm font-medium bg-black text-white disabled:bg-neutral-300 disabled:cursor-not-allowed"
                    >
                        {isCheckingOut
                            ? 'Starting checkout…'
                            : totalItems
                                ? `Checkout (${totalItems})`
                                : 'Checkout'}
                    </button> */}
                </div>
                <p className="text-xs text-neutral-600 ml-2 py-2">
                    Note: Checkout will bring you to our Stripe checkout page. Crypto payments are not accepted at this time. US & Canada only at this time.
                </p>
            </div>

        </div>
    )
}
