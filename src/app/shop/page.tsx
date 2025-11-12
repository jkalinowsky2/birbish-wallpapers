
// src/app/shop/page.tsx
'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { PRODUCTS, type Product } from "./products";
import { useAccount } from 'wagmi'

export default function ShopPage() {
    // cart maps priceId -> quantity
    const [cart, setCart] = useState<Record<string, number>>({})
    const [isCheckingOut, setIsCheckingOut] = useState(false)

    // wallet
    const { address } = useAccount()            // address will be undefined if not connected

    // moonbird holder flag
    const [isHolder, setIsHolder] = useState(false)


    //) Call the API to check holder status 
    useEffect(() => {
        let cancelled = false

        async function check() {
            if (!address) {
                setIsHolder(false)
                return
            }
            try {
                const r = await fetch('/api/holder-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address }),
                })
                const data = await r.json()
                if (!cancelled) setIsHolder(!!data?.isHolder)
            } catch {
                if (!cancelled) setIsHolder(false)
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
    const isGiftEligible = isHolder && totalPrice >= REQ_MIN


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
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold mb-2">Sticker Shop - Coming Soon!</h1>
                <p className="text-sm text-neutral-600">
                    Physical stickers, shipped the old-fashioned way. Stickers are die-cut vinyl and perfect for water bottles, laptops, or anywhere else you want to rep the birbs.
                </p>
            </header>

            {/* Product grid */}
            <div className="grid gap-6 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4">
                {PRODUCTS.map((product) => {
                    const qty = cart[product.priceId] ?? 0
                    const isGiftOnly = product.giftOnly === true

                    return (
                        <article
                            key={product.id}
                            className="flex flex-col rounded-2xl border bg-white shadow-sm overflow-hidden"
                        >
                            <div className="relative aspect-square bg-neutral-100">
                                <Image
                                    src={product.image}
                                    alt={product.name}
                                    fill
                                    sizes="(min-width: 1024px) 25vw, 50vw"
                                    style={{ objectFit: 'contain' }}
                                />
                            </div>

                            <div className="p-4 flex flex-col gap-3 flex-1">
                                <div>
                                    <h2 className="text-sm font-semibold">{product.name}</h2>
                                    <p className="text-xs text-neutral-600 mt-1">
                                        {product.description}
                                    </p>
                                </div>

                                <div className="mt-auto flex items-center justify-between">
                                    <span className="text-sm font-semibold">
                                        {product.priceLabel}
                                    </span>

                                    {isGiftOnly ? (
                                        // 👇 No controls – just a little “perk” message
                                        <div className="text-right text-xs leading-tight">
                                            <div className="font-semibold text-[#d12429]">
                                                Moonbirds holder perk
                                            </div>
                                            <div className="text-[11px] text-neutral-600">
                                                Auto-added for eligible carts
                                            </div>
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
            <div className="sticky bottom-0 py-4 bg-gradient-to-t from-[#f7f7f7] to-transparent">
                <div className="max-w-6xl mx-auto flex items-center justify-between rounded-full border bg-white px-4 py-2 shadow-sm">
                    <div className="text-sm text-neutral-700">
                        {totalItems ? (
                            <>
                                <span>
                                    You’ve selected {totalItems} sticker
                                    {totalItems > 1 ? 's' : ''}.
                                </span>
                                {totalPrice > 0 && (
                                    <span className="ml-2 font-semibold">
                                        (~${totalPrice.toFixed(2)})
                                    </span>
                                )}
                                {isGiftEligible ? (
                                    <div className="text-sm font-medium text-[#d12429]">
                                        🎁 Congrats, birb! You're getting a free <span className="font-semibold">Holographic Logo Sticker</span> (Moonbirds holder perk).
                                    </div>
                                ) : (
                                    <div className="text-xs text-neutral-600">
                                        Connect a wallet with a Moonbird and spend ${REQ_MIN}+ to unlock a free holographic sticker (limited run).
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
                        className="px-5 py-2 rounded-full text-sm font-medium bg-black text-white disabled:bg-neutral-300 disabled:cursor-not-allowed"
                    >
                        {isCheckingOut
                            ? 'Starting checkout…'
                            : totalItems
                                ? `Checkout Disabled`
                                // ? `Checkout (${totalItems})`
                                : 'Checkout Disabled'}
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
                <p className="text-sm text-neutral-600 ml-2 py-2">
                    Note: Checkout will bring you to our Stripe checkout page. Crypto payments are not accepted at this time. US & Canada only at this time.
                </p>
            </div>

        </div>
    )
}
