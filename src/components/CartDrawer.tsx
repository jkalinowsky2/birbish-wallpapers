'use client'

import Image from 'next/image'
import { getTieredUnitPrice } from '@/app/shop/products'
import type { Product } from '@/app/shop/products'
import { buildCustomTokenUrl } from '@/app/shop/customCollections'

const CUSTOM_KEY_SEP = '::'

function parseCartKey(cartKey: string): {
    productId: string
    tokenId?: string
    variant?: 'illustrated' | 'pixel'
} {
    const parts = cartKey.split(CUSTOM_KEY_SEP)

    // custom with variant: productId::variant::tokenId
    if (parts.length === 3) {
        const [productId, variantRaw, tokenId] = parts
        const variant = variantRaw === 'pixel' ? 'pixel' : 'illustrated'
        return { productId, variant, tokenId }
    }

    // custom without variant: productId::tokenId
    if (parts.length === 2) {
        const [productId, tokenId] = parts
        return { productId, tokenId }
    }

    // normal: just productId
    return { productId: cartKey }
}

function findProduct(products: Product[], productId: string) {
    // ✅ new world: keys are product.id
    const byId = products.find((p) => p.id === productId)
    if (byId) return byId

    // ✅ optional back-compat if any old cart keys exist
    return products.find((p) => p.priceId === productId)
}



type Props = {
    open: boolean
    onClose: () => void

    // ✅ cartKey -> qty (cartKey can be "priceId" OR "priceId::token:8209")
    cart: Record<string, number>

    products: Product[] // ALL_PRODUCTS

    // ✅ first arg is cartKey now (not necessarily a raw priceId)
    setQuantity: (cartKey: string, qty: number) => void

    totalPrice: number
    totalCustomQty: number
    minCustomQty: number
    customMinNotMet: boolean
    onCheckout: () => void
    isCheckingOut?: boolean
    checkoutEnabled?: boolean
    shippingRegion: 'domestic' | 'international'
    setShippingRegion: (v: 'domestic' | 'international') => void
}

export function CartDrawer({
    open,
    onClose,
    cart,
    products,
    setQuantity,
    totalPrice,
    totalCustomQty,
    minCustomQty,
    customMinNotMet,
    onCheckout,
    isCheckingOut = false,
    checkoutEnabled = true,
    shippingRegion,
    setShippingRegion,
}: Props) {
    if (!open) return null

    const lines = Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([cartKey, qty]) => {
            const { productId, tokenId, variant } = parseCartKey(cartKey)
            const product = findProduct(products, productId)
            return { cartKey, qty, tokenId, variant, product }
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
            <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-xl border-l flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="font-semibold">Your cart</div>
                    {/* <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md px-3 py-1 text-sm border hover:bg-neutral-50"
                    >
                        Close
                    </button> */}
                </div>

                <div className="p-4 space-y-3 overflow-auto flex-1">
                    {lines.length === 0 ? (
                        <div className="text-sm text-neutral-600">No items yet.</div>
                    ) : (
                        lines.map(({ cartKey, qty, tokenId, variant, product }) => {
                            const collection = product?.customCollection

                            const imgSrc =
                                tokenId && collection
                                    ? buildCustomTokenUrl(tokenId, collection, variant ?? 'illustrated')
                                    : product?.image

                            return (
                                <div key={cartKey} className="flex gap-3 border p-3">
                                    <div className="relative h-14 w-14 shrink-0 rounded-md overflow-hidden bg-white">
                                        {imgSrc ? (
                                            <Image
                                                src={imgSrc}
                                                alt={product?.name ?? (tokenId ? `Token #${tokenId}` : 'Item')}
                                                fill
                                                sizes="56px"
                                                className="object-contain"
                                            />
                                        ) : (
                                            <div className="h-full w-full bg-neutral-100" />
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <div className="text-sm font-semibold leading-tight">
                                            {product?.name ?? 'Unknown item'}
                                        </div>
                                        {tokenId && (
                                            <div className="text-[11px] text-neutral-500 mt-0.5">
                                                Token #{tokenId}
                                                {variant ? ` (${variant})` : ''}
                                            </div>
                                        )}

                                        {product && (
                                            <div className="text-xs text-neutral-600 mt-0.5">
                                                ${getTieredUnitPrice(
                                                    product,
                                                    product.customCollection ? totalCustomQty : qty // ✅ custom uses global qty
                                                ).toFixed(2)} each
                                            </div>
                                        )}

                                        <div className="mt-2 flex items-center gap-2">
                                            <button
                                                type="button"
                                                className="h-7 w-7 rounded-full border text-sm hover:bg-neutral-100"
                                                onClick={() => setQuantity(cartKey, Math.max(0, qty - 1))}
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
                                                    setQuantity(cartKey, clean)
                                                }}
                                                className="w-12 h-8 text-center text-sm border rounded-md bg-neutral-50"
                                            />

                                            <button
                                                type="button"
                                                className="h-7 w-7 rounded-full border bg-neutral-900 text-white text-sm hover:bg-[#b20b2b]"
                                                onClick={() => setQuantity(cartKey, qty + 1)}
                                            >
                                                +
                                            </button>

                                            <button
                                                type="button"
                                                className="ml-auto text-xs font-semibold text-neutral-500 hover:text-neutral-900"
                                                onClick={() => setQuantity(cartKey, 0)}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
                {customMinNotMet && (
                    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                        Custom stickers are <strong>mix &amp; match</strong>, but require a minimum of{' '}
                        <strong>{minCustomQty}</strong> total custom stickers per order. Add{' '}
                        <strong>{minCustomQty - totalCustomQty}</strong> more to checkout.

                    </div>
                )}
                <div className="border-t px-4 pt-4 pb-8 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-600">Subtotal</span>
                        <span className="font-semibold">${totalPrice.toFixed(2)}</span>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-neutral-600">
                        <span className="font-medium">Shipping (added at checkout)</span>

                        <div className="inline-flex rounded-md border overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShippingRegion('domestic')}
                                className={`px-3 py-1.5 ${shippingRegion === 'domestic'
                                    ? 'bg-neutral-900 text-white'
                                    : 'bg-white hover:bg-neutral-50'
                                    }`}
                            >
                                US
                            </button>

                            <button
                                type="button"
                                onClick={() => setShippingRegion('international')}
                                className={`px-3 py-1.5 border-l ${shippingRegion === 'international'
                                    ? 'bg-neutral-900 text-white'
                                    : 'bg-white hover:bg-neutral-50'
                                    }`}
                            >
                                International
                            </button>
                        </div>
                    </div>
                    {totalCustomQty > 0 && (
                        <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
                            <strong className="block text-neutral-800 mb-1">Rights Certification</strong>
                            By purchasing custom stickers, you certify that you own or have permission to use and reproduce the underlying artwork or IP associated with the selected asset(s). Generational Merch does not verify ownership or licensing rights.
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={onCheckout}
                        disabled={!checkoutEnabled || lines.length === 0 || isCheckingOut || customMinNotMet}

                        className="mt-3 w-full px-4 py-2 rounded-md text-sm font-medium bg-black text-white
                       disabled:bg-neutral-300 disabled:cursor-not-allowed"
                    >
                        {!checkoutEnabled
                            ? 'Checkout disabled'
                            : isCheckingOut
                                ? 'Starting checkout…'
                                : 'Checkout'}
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="
    mt-2
    w-full
    text-xs
    text-neutral-500
    hover:text-neutral-800
    underline
    underline-offset-2
  "
                    >
                        Continue shopping
                    </button>

                </div>
            </aside>
        </>
    )
}
