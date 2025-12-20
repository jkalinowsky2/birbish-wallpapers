'use client'

import Image from 'next/image'
import type { Product } from '@/app/shop/products'

type Props = {
    open: boolean
    onClose: () => void
    cart: Record<string, number> // priceId -> qty
    products: Product[]          // ALL_PRODUCTS
    setQuantity: (priceId: string, qty: number) => void
    totalPrice: number
    onCheckout: () => void
    isCheckingOut?: boolean
}

export function CartDrawer({
    open,
    onClose,
    cart,
    products,
    setQuantity,
    totalPrice,
    onCheckout,
    isCheckingOut = false,
}: Props) {
    if (!open) return null

    const lines = Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([priceId, qty]) => {
            const product = products.find((p) => p.priceId === priceId)
            return { priceId, qty, product }
        })

    return (
        <>
            {/* overlay */}
            <button
                type="button"
                aria-label="Close cart"
                onClick={onClose}
                className="fixed inset-0 z-50 bg-black/40"
            />

            {/* panel */}
            <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-xl border-l flex flex-col">        <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="font-semibold">Your cart</div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md px-3 py-1 text-sm border hover:bg-neutral-50"
                >
                    Close
                </button>
            </div>

                <div className="p-4 space-y-3 overflow-auto flex-1">                    {lines.length === 0 ? (
                    <div className="text-sm text-neutral-600">No items yet.</div>
                ) : (
                    lines.map(({ priceId, qty, product }) => (
                        <div key={priceId} className="flex gap-3 border rounded-lg p-3">
                            <div className="relative h-14 w-14 shrink-0">
                                {product?.image ? (
                                    <Image
                                        src={product.image}
                                        alt={product.name}
                                        fill
                                        sizes="56px"
                                        style={{ objectFit: 'contain' }}
                                    />
                                ) : (
                                    <div className="h-14 w-14 bg-neutral-100 rounded-md" />
                                )}
                            </div>

                            <div className="flex-1">
                                <div className="text-sm font-semibold leading-tight">
                                    {product?.name ?? 'Unknown item'}
                                </div>
                                <div className="text-xs text-neutral-600 mt-0.5">
                                    {product?.priceLabel ?? ''}
                                </div>

                                <div className="mt-2 flex items-center gap-2">
                                    <button
                                        type="button"
                                        className="h-7 w-7 rounded-full border text-sm hover:bg-neutral-100"
                                        onClick={() => setQuantity(priceId, Math.max(0, qty - 1))}
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
                                            setQuantity(priceId, clean)
                                        }}
                                        className="w-12 h-8 text-center text-sm border rounded-md bg-neutral-50"
                                    />

                                    <button
                                        type="button"
                                        className="h-7 w-7 rounded-full border bg-neutral-900 text-white text-sm hover:bg-[#b20b2b]"
                                        onClick={() => setQuantity(priceId, qty + 1)}
                                    >
                                        +
                                    </button>

                                    <button
                                        type="button"
                                        className="ml-auto text-xs font-semibold text-neutral-500 hover:text-neutral-900"
                                        onClick={() => setQuantity(priceId, 0)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                </div>

                <div className="border-t px-4 pt-4 pb-8 pb-[calc(env(safe-area-inset-bottom)+2rem)]">                    <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-600">Subtotal</span>
                    <span className="font-semibold">${totalPrice.toFixed(2)}</span>
                </div>

                    <button
                        type="button"
                        onClick={onCheckout}
                        disabled={lines.length === 0 || isCheckingOut}
                        className="mt-3 w-full px-4 py-2 rounded-md text-sm font-medium bg-black text-white
                       disabled:bg-neutral-300 disabled:cursor-not-allowed"
                    >
                        {isCheckingOut ? 'Starting checkout…' : 'Checkout'}
                    </button>
                </div>
            </aside>
        </>
    )
}