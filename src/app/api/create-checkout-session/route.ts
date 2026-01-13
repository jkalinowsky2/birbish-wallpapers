// src/app/api/create-checkout-session/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { kv } from '@vercel/kv'
import {
    ALL_PRODUCTS,
    CUSTOM_PRODUCTS,
    getTierForQuantity,
    getBaseUnitPrice,
} from '@/app/shop/products'
import { randomUUID } from 'crypto'

console.log('[checkout] ROUTE VERSION = split-variants-v2')

const MIN_CUSTOM_QTY = 5

// ✅ Identify custom products by *productId* (NOT priceId)
const CUSTOM_PRODUCT_IDS = new Set(CUSTOM_PRODUCTS.map((p) => p.id))

// ✅ Fast lookup by productId
const PRODUCT_BY_ID = new Map(ALL_PRODUCTS.map((p) => [p.id, p]))

const IS_TEST = (process.env.STRIPE_MODE ?? 'live') === 'test'

const TEST_PRICE_MAP: Record<string, string> = process.env.STRIPE_TEST_PRICE_MAP
    ? JSON.parse(process.env.STRIPE_TEST_PRICE_MAP)
    : {}

function mapToTestPrice(priceId: string) {
    return TEST_PRICE_MAP[priceId] ?? priceId
}

const TEST_SHIP_MAP: Record<string, string> =
    process.env.STRIPE_TEST_SHIPPING_RATE_MAP
        ? JSON.parse(process.env.STRIPE_TEST_SHIPPING_RATE_MAP)
        : {}

function mapToTestShippingRate(shippingRateId: string) {
    return TEST_SHIP_MAP[shippingRateId] ?? shippingRateId
}

const secretKey = process.env.STRIPE_SECRET_KEY
if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set')

const stripe = new Stripe(secretKey, { apiVersion: '2025-10-29.clover' })

type CartItem = {
    productId: string
    priceId: string
    quantity: number
    tokenId?: string
    variant?: 'illustrated' | 'pixel'
}

// Legacy single-rate fallback
const SHIPPING_RATE_ID = process.env.STRIPE_SHIPPING_RATE_ID

// Gift config
const GIFT_PRICE_ID = process.env.STRIPE_GIFT_PRICE_ID
const GIFT_COUPON_ID = process.env.STRIPE_GIFT_COUPON_ID

// New 4-tier shipping: small/large × domestic/international
const SHIP_SMALL_DOMESTIC = process.env.STRIPE_SHIP_SMALL_DOMESTIC
const SHIP_LARGE_DOMESTIC = process.env.STRIPE_SHIP_LARGE_DOMESTIC
const SHIP_SMALL_INTL = process.env.STRIPE_SHIP_SMALL_INTL
const SHIP_LARGE_INTL = process.env.STRIPE_SHIP_LARGE_INTL

export async function POST(request: Request) {
    try {
        const { items, giftEligible, walletAddress, shippingRegion } =
            (await request.json()) as {
                items: CartItem[]
                giftEligible?: boolean
                walletAddress?: string
                shippingRegion?: 'domestic' | 'international'
            }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: 'No items passed to checkout.' },
                { status: 400 },
            )
        }

        const origin =
            request.headers.get('origin') ??
            process.env.NEXT_PUBLIC_SITE_URL ??
            'http://localhost:3000'

        // ---- Safety guard: never allow STRIPE_MODE=test on the live domain ----
        const isLiveOrigin =
            typeof origin === 'string' &&
            (origin.includes('https://www.genmerch.xyz') ||
                origin.includes('https://genmerch.xyz'))

        if (isLiveOrigin && IS_TEST) {
            return NextResponse.json(
                { error: 'Refusing to run STRIPE_MODE=test on the live domain.' },
                { status: 400 },
            )
        }

        console.log('[checkout] items:', items)

        // -------------------------------
        // Validate items + compute totals
        // -------------------------------
        // ✅ total custom qty across ALL custom products (mix & match)
        const totalCustomQty = items.reduce((sum, it) => {
            if (!it.quantity || it.quantity <= 0) return sum
            return CUSTOM_PRODUCT_IDS.has(it.productId) ? sum + it.quantity : sum
        }, 0)

        if (totalCustomQty > 0 && totalCustomQty < MIN_CUSTOM_QTY) {
            return NextResponse.json(
                {
                    error: `Custom stickers require a minimum of ${MIN_CUSTOM_QTY} total (mix & match).`,
                    code: 'CUSTOM_MIN_NOT_MET',
                    totalCustomQty,
                    minCustomQty: MIN_CUSTOM_QTY,
                },
                { status: 400 },
            )
        }

        // -------------------------------
        // Grouping rules for Stripe:
        // - Non-custom: group by productId (normal behavior)
        // - Custom:
        //   - Moonbirds: split by variant (illustrated vs pixel)
        //   - All others: group by productId
        // -------------------------------
        const qtyByGroupKey = new Map<string, number>()

        function getGroupKey(item: CartItem, product: (typeof ALL_PRODUCTS)[number]) {
            if (product.customCollection === 'moonbirds') {
                // split in Stripe
                const v = item.variant ?? 'illustrated'
                return `${item.productId}::${v}`
            }
            // all other products group by productId
            return item.productId
        }

        const customizations: Array<{
            productId: string
            priceId: string
            tokenId: string
            variant: 'illustrated' | 'pixel'
            quantity: number
            collection?: string
        }> = []

        for (const item of items) {
            if (!item.quantity || item.quantity <= 0) continue

            const product = PRODUCT_BY_ID.get(item.productId)
            if (!product) {
                return NextResponse.json(
                    { error: `Unknown productId: ${item.productId}`, code: 'UNKNOWN_PRODUCT' },
                    { status: 400 },
                )
            }

            // ✅ Server-side guard: never trust client priceId
            // - Require that incoming priceId matches one of the product's tier priceIds (or base)
            const validPriceIds = new Set<string>([
                product.priceId,
                ...(product.tiers?.map((t) => t.priceId) ?? []),
            ])
            if (!validPriceIds.has(item.priceId)) {
                return NextResponse.json(
                    {
                        error: `Invalid priceId for productId ${item.productId}`,
                        code: 'INVALID_PRICE',
                        productId: item.productId,
                    },
                    { status: 400 },
                )
            }

            // ✅ If it’s a custom product, it MUST include tokenId
            if (CUSTOM_PRODUCT_IDS.has(item.productId) && !item.tokenId) {
                return NextResponse.json(
                    {
                        error: 'Custom sticker items must include tokenId.',
                        code: 'CUSTOM_TOKEN_REQUIRED',
                    },
                    { status: 400 },
                )
            }

            const key = getGroupKey(item, product)
            qtyByGroupKey.set(key, (qtyByGroupKey.get(key) ?? 0) + item.quantity)

            if (item.tokenId) {
                customizations.push({
                    productId: item.productId,
                    priceId: item.priceId,
                    tokenId: String(item.tokenId),
                    variant: item.variant ?? 'illustrated',
                    quantity: item.quantity,
                    collection: product.customCollection,
                })
            }
        }

        console.log(
            '[checkout] grouped qtyByGroupKey:',
            Array.from(qtyByGroupKey.entries()),
        )

        // -------------------------------
        // Build Stripe line items
        // -------------------------------
        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

        for (const [groupKey, groupQty] of qtyByGroupKey.entries()) {
            // groupKey is either:
            //  - productId
            //  - productId::variant  (moonbirds only)
            const parts = groupKey.split('::')
            const productId = parts[0]
            const variant = (parts[1] as 'illustrated' | 'pixel' | undefined) ?? undefined

            const product = PRODUCT_BY_ID.get(productId)
            if (!product) {
                // should not happen due to validation above
                continue
            }

            const isCustom = !!product.customCollection
            const pricingQty = isCustom ? totalCustomQty : groupQty

            const tier = getTierForQuantity(product, pricingQty)
            const baseUnit = getBaseUnitPrice(product)
            const unitPrice = tier ? tier.unitPrice : baseUnit

            // Which Stripe priceId should we use for this line?
            // - LIVE: use tier priceId
            // - TEST: map tier priceId via STRIPE_TEST_PRICE_MAP
            const livePriceId =
                tier && tier.unitPrice !== baseUnit ? tier.priceId : product.priceId
            const chosenPriceId = IS_TEST ? mapToTestPrice(livePriceId) : livePriceId

            // ✅ Moonbird variant lines: force separate display using price_data
            // (Stripe would otherwise combine identical price IDs.)
            if (product.customCollection === 'moonbirds' && variant) {
                lineItems.push({
                    price_data: {
                        currency: 'usd',
                        unit_amount: Math.round(unitPrice * 100),
                        product_data: {
                            name: `${product.name} (${variant})`,
                            description: product.description,
                        },
                    },
                    quantity: groupQty,
                })
                continue
            }

            // ✅ Everything else: use Stripe price IDs normally
            lineItems.push({
                price: chosenPriceId,
                quantity: groupQty,
            })
        }

        if (lineItems.length === 0) {
            return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 })
        }

        // -------------------------------
        // Server-side gift eligibility
        // -------------------------------
        const wallet = (walletAddress ?? '').toLowerCase().trim()
        let canGrantGift = false

        if (giftEligible && wallet && GIFT_PRICE_ID && GIFT_COUPON_ID) {
            try {
                const [alreadyClaimed, rawCount] = await Promise.all([
                    kv.get<string | null>(`gift_claimed:${wallet}`),
                    kv.get<string | number | null>('gift_count'),
                ])

                const count = rawCount == null ? 0 : Number(rawCount) || 0
                const claimed = !!alreadyClaimed

                if (!claimed && count < 50) {
                    canGrantGift = true
                } else {
                    console.log('[create-checkout-session] gift blocked', {
                        wallet,
                        claimed,
                        count,
                    })
                }
            } catch (kvErr) {
                console.error('[create-checkout-session] KV lookup failed:', kvErr)
                canGrantGift = false
            }
        }

        // -------------------------------
        // Shipping (4 tiers: qty × region)
        // -------------------------------
        const totalQty = items.reduce((sum, i) => sum + (i.quantity || 0), 0)
        const isLargeOrder = totalQty > 10

        const region: 'domestic' | 'international' =
            shippingRegion === 'international' ? 'international' : 'domestic'

        let shippingRateId: string | undefined

        if (region === 'international') {
            if (isLargeOrder && SHIP_LARGE_INTL) shippingRateId = SHIP_LARGE_INTL
            else if (!isLargeOrder && SHIP_SMALL_INTL) shippingRateId = SHIP_SMALL_INTL
        } else {
            if (isLargeOrder && SHIP_LARGE_DOMESTIC) shippingRateId = SHIP_LARGE_DOMESTIC
            else if (!isLargeOrder && SHIP_SMALL_DOMESTIC)
                shippingRateId = SHIP_SMALL_DOMESTIC
        }

        // Fallback to legacy single-rate if needed
        if (!shippingRateId && SHIPPING_RATE_ID) shippingRateId = SHIPPING_RATE_ID
        if (shippingRateId) shippingRateId = mapToTestShippingRate(shippingRateId)

        // -------------------------------
        // Allowed countries based on region
        // -------------------------------
        const domesticCountries: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
            ['US']

        const internationalCountries: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
            ['CA', 'AU', 'GB', 'DE', 'KR', 'JP', 'MX', 'TH', 'NZ', 'SG', 'HU']

        const allowedCountries = region === 'domestic' ? domesticCountries : internationalCountries

        // -------------------------------
        // Base params
        // -------------------------------
        const params: Stripe.Checkout.SessionCreateParams = {
            mode: 'payment',
            line_items: lineItems,
            success_url: `${origin}/success`,
            cancel_url: `${origin}/shop`,
            shipping_address_collection: { allowed_countries: allowedCountries },
            shipping_options: shippingRateId ? [{ shipping_rate: shippingRateId }] : undefined,
            metadata: {},
        }

        // -------------------------------
        // Persist custom token breakdown for fulfillment
        // -------------------------------
        if (customizations.length > 0) {
            const customRef = randomUUID()

            await kv.set(
                `customizations:${customRef}`,
                { customizations, wallet: wallet || null, createdAt: Date.now() },
                { ex: 60 * 60 * 24 * 30 }, // 30 days
            )

            params.metadata = {
                ...params.metadata,
                customRef,
                customCount: String(customizations.length),
            }
        }

        if (wallet) {
            params.metadata = { ...params.metadata, walletAddress: wallet }
        }

        // Gift add-on
        if (canGrantGift) {
            params.line_items!.push({ price: GIFT_PRICE_ID!, quantity: 1 })
            params.discounts = [{ coupon: GIFT_COUPON_ID! }]
            params.metadata = { ...params.metadata, giftIntent: 'true' }
        } else {
            params.allow_promotion_codes = true
            params.metadata = { ...params.metadata, giftIntent: 'false' }
        }

        // Basic sanity check for mapped test prices (only for "price:" line items)
        if (IS_TEST) {
            for (const li of lineItems) {
                if (li.price && !li.price.startsWith('price_')) {
                    throw new Error(`Invalid test price detected: ${li.price}`)
                }
            }
        }

        const session = await stripe.checkout.sessions.create(params)
        return NextResponse.json({ url: session.url })
    } catch (err: unknown) {
        console.error('[create-checkout-session] error:', err)
        const message =
            err instanceof Error ? err.message : 'Unexpected error creating checkout session'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

// // src/app/api/create-checkout-session/route.ts
// import { NextResponse } from 'next/server'
// import Stripe from 'stripe'
// import { kv } from '@vercel/kv'
// import { ALL_PRODUCTS, CUSTOM_PRODUCTS, getTierForQuantity, getBaseUnitPrice } from '@/app/shop/products';
// import { randomUUID } from 'crypto'


// const MIN_CUSTOM_QTY = 5
// const PRODUCT_BY_PRICE_ID = new Map(ALL_PRODUCTS.map(p => [p.priceId, p]))
// const CUSTOM_PRICE_IDS = new Set(CUSTOM_PRODUCTS.map(p => p.priceId))

// const IS_TEST = (process.env.STRIPE_MODE ?? 'live') === 'test'

// const TEST_PRICE_MAP: Record<string, string> = process.env.STRIPE_TEST_PRICE_MAP
//     ? JSON.parse(process.env.STRIPE_TEST_PRICE_MAP)
//     : {}

// function mapToTestPrice(priceId: string) {
//     return TEST_PRICE_MAP[priceId] ?? priceId
// }
// const TEST_SHIP_MAP: Record<string, string> = process.env.STRIPE_TEST_SHIPPING_RATE_MAP
//     ? JSON.parse(process.env.STRIPE_TEST_SHIPPING_RATE_MAP)
//     : {}

// function mapToTestShippingRate(shippingRateId: string) {
//     return TEST_SHIP_MAP[shippingRateId] ?? shippingRateId
// }

// const secretKey = process.env.STRIPE_SECRET_KEY
// if (!secretKey) {
//     throw new Error('STRIPE_SECRET_KEY is not set')
// }

// const stripe = new Stripe(secretKey, {
//     apiVersion: '2025-10-29.clover',
// })

// type CartItem = {
//     priceId: string
//     quantity: number
//     tokenId?: string
//     variant?: 'illustrated' | 'pixel'
// }

// // Legacy single-rate fallback
// const SHIPPING_RATE_ID = process.env.STRIPE_SHIPPING_RATE_ID

// // Gift config
// const GIFT_PRICE_ID = process.env.STRIPE_GIFT_PRICE_ID
// const GIFT_COUPON_ID = process.env.STRIPE_GIFT_COUPON_ID

// // New 4-tier shipping: small/large × domestic/international
// const SHIP_SMALL_DOMESTIC = process.env.STRIPE_SHIP_SMALL_DOMESTIC
// const SHIP_LARGE_DOMESTIC = process.env.STRIPE_SHIP_LARGE_DOMESTIC
// const SHIP_SMALL_INTL = process.env.STRIPE_SHIP_SMALL_INTL
// const SHIP_LARGE_INTL = process.env.STRIPE_SHIP_LARGE_INTL



// export async function POST(request: Request) {
//     console.log('[checkout] ROUTE VERSION = split-variants-v1')

//     try {
//         const { items, giftEligible, walletAddress, shippingRegion } =
//             (await request.json()) as {
//                 items: CartItem[]
//                 giftEligible?: boolean
//                 walletAddress?: string
//                 shippingRegion?: 'domestic' | 'international'
//             }

//         if (!items || !Array.isArray(items) || items.length === 0) {
//             return NextResponse.json(
//                 { error: 'No items passed to checkout.' },
//                 { status: 400 },
//             )
//         }

//         const origin =
//             request.headers.get('origin') ??
//             process.env.NEXT_PUBLIC_SITE_URL ??
//             'http://localhost:3000'

//         // ---- Safety guard: never allow STRIPE_MODE=test on the live domain ----
//         const isLiveOrigin =
//             typeof origin === 'string' &&
//             (origin.includes('https://www.genmerch.xyz') || origin.includes('https://genmerch.xyz'))

//         if (isLiveOrigin && IS_TEST) {
//             return NextResponse.json(
//                 { error: 'Refusing to run STRIPE_MODE=test on the live domain.' },
//                 { status: 400 },
//             )
//         }

//         // -------------------------------
//         // Build tier-aware line items (grouped by priceId)
//         // Also capture custom token breakdown for fulfillment
//         // -------------------------------
//         const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

//         // priceId -> totalQty
//         // const qtyByPriceId = new Map<string, number>()

//         // groupKey -> totalQty
//         // groupKey = priceId OR priceId:variant (when variant exists)
//         const qtyByGroupKey = new Map<string, number>()

//         function getGroupKey(item: CartItem) {
//             // If variant is present (moonbirds), keep it separate in Stripe
//             return item.variant ? `${item.priceId}:${item.variant}` : item.priceId
//         }

//         // store token breakdowns (only for custom lines)
//         // const customizations: Array<{ priceId: string; tokenId: string; quantity: number }> = []
//         const customizations: Array<{
//             priceId: string
//             tokenId: string
//             variant: 'illustrated' | 'pixel'
//             quantity: number
//             collection?: string
//         }> = []

//         for (const item of items) {
//             if (!item.quantity || item.quantity <= 0) continue

//             // qtyByPriceId.set(item.priceId, (qtyByPriceId.get(item.priceId) ?? 0) + item.quantity)
//             const key = getGroupKey(item)
//             qtyByGroupKey.set(key, (qtyByGroupKey.get(key) ?? 0) + item.quantity)

//             // ✅ If it’s a custom product, it MUST include tokenId
//             if (CUSTOM_PRICE_IDS.has(item.priceId) && !item.tokenId) {
//                 return NextResponse.json(
//                     { error: 'Custom sticker items must include tokenId.', code: 'CUSTOM_TOKEN_REQUIRED' },
//                     { status: 400 }
//                 )
//             }

//             if (item.tokenId) {
//                 const product = ALL_PRODUCTS.find((p) => p.priceId === item.priceId)

//                 customizations.push({
//                     priceId: item.priceId,
//                     tokenId: String(item.tokenId),
//                     variant: item.variant ?? 'illustrated',
//                     quantity: item.quantity,
//                     collection: product?.customCollection, // e.g. 'moonbirds' | 'mythics'
//                 })
//             }
//         }

//         // ✅ total custom qty across ALL custom products (mix & match)
//         const totalCustomQty = items.reduce((sum, it) => {
//             if (!it.quantity || it.quantity <= 0) return sum
//             return CUSTOM_PRICE_IDS.has(it.priceId) ? sum + it.quantity : sum
//         }, 0)

//         // ✅ Hard guard: if they have any custom stickers, they must have at least MIN_CUSTOM_QTY
//         if (totalCustomQty > 0 && totalCustomQty < MIN_CUSTOM_QTY) {
//             return NextResponse.json(
//                 {
//                     error: `Custom stickers require a minimum of ${MIN_CUSTOM_QTY} total (mix & match).`,
//                     code: 'CUSTOM_MIN_NOT_MET',
//                     totalCustomQty,
//                     minCustomQty: MIN_CUSTOM_QTY,
//                 },
//                 { status: 400 }
//             )
//         }

//         // Build Stripe line items from grouped totals (this is what fixes tier pricing across tokens)
//         // Build Stripe line items from grouped totals
//         for (const [groupKey, totalQtyForThisGroup] of qtyByGroupKey.entries()) {
//             const parts = groupKey.split(':')
//             const priceId = parts[0]
//             const variant = parts[1] as 'illustrated' | 'pixel' | undefined

//             const product = ALL_PRODUCTS.find((p) => p.priceId === priceId)

//             // If we can't find the product, fall back to whatever came from the client
//             if (!product) {
//                 lineItems.push({ price: priceId, quantity: totalQtyForThisGroup })
//                 continue
//             }

//             // Tier qty basis:
//             // - Custom products tier based on TOTAL custom qty (mix & match)
//             // - Non-custom products tier based on qty for that group
//             const pricingQty = product.customCollection ? totalCustomQty : totalQtyForThisGroup
//             const tier = getTierForQuantity(product, pricingQty)
//             const baseUnit = getBaseUnitPrice(product)
//             const unitPrice = tier ? tier.unitPrice : baseUnit

//             // ✅ If this is a variant line, force Stripe to show it separately
//             // Do this BEFORE any normal `price:` line items, then continue.
//             if (variant) {
//                 lineItems.push({
//                     price_data: {
//                         currency: 'usd',
//                         unit_amount: Math.round(unitPrice * 100),
//                         product_data: {
//                             name: `${product.name} (${variant})`,
//                             description: product.description,
//                         },
//                     },
//                     quantity: totalQtyForThisGroup,
//                 })
//                 continue
//             }

//             // ✅ TEST mode: use mapped base priceIds only, then continue
//             if (IS_TEST) {
//                 lineItems.push({
//                     price: mapToTestPrice(product.priceId),
//                     quantity: totalQtyForThisGroup,
//                 })
//                 continue
//             }

//             // ✅ LIVE mode: tier-aware pricing via Stripe price IDs
//             if (!tier || tier.unitPrice === baseUnit) {
//                 lineItems.push({
//                     price: product.priceId,
//                     quantity: totalQtyForThisGroup,
//                 })
//             } else {
//                 lineItems.push({
//                     price: tier.priceId,
//                     quantity: totalQtyForThisGroup,
//                 })
//             }
//         }

//         if (lineItems.length === 0) {
//             return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 })
//         }
//         console.log('[checkout] items:', items)
//         console.log('[checkout] grouped qtyByGroupKey:', Array.from(qtyByGroupKey.entries()))

//         // -------------------------------
//         // Server-side gift eligibility
//         // -------------------------------
//         const wallet = (walletAddress ?? '').toLowerCase().trim()
//         let canGrantGift = false

//         if (giftEligible && wallet && GIFT_PRICE_ID && GIFT_COUPON_ID) {
//             try {
//                 const [alreadyClaimed, rawCount] = await Promise.all([
//                     kv.get<string | null>(`gift_claimed:${wallet}`),
//                     kv.get<string | number | null>('gift_count'),
//                 ])

//                 const count = rawCount == null ? 0 : Number(rawCount) || 0
//                 const claimed = !!alreadyClaimed

//                 if (!claimed && count < 50) {
//                     canGrantGift = true
//                 } else {
//                     console.log('[create-checkout-session] gift blocked', {
//                         wallet,
//                         claimed,
//                         count,
//                     })
//                 }
//             } catch (kvErr) {
//                 console.error('[create-checkout-session] KV lookup failed:', kvErr)
//                 // fail closed: no gift if KV has issues
//                 canGrantGift = false
//             }
//         }

//         // -------------------------------
//         // Shipping (4 tiers: qty × region)
//         // -------------------------------
//         const totalQty = items.reduce(
//             (sum, i) => sum + (i.quantity || 0),
//             0,
//         )
//         const isLargeOrder = totalQty > 10

//         const region: 'domestic' | 'international' =
//             shippingRegion === 'international' ? 'international' : 'domestic'

//         let shippingRateId: string | undefined

//         if (region === 'international') {
//             if (isLargeOrder && SHIP_LARGE_INTL) {
//                 shippingRateId = SHIP_LARGE_INTL
//             } else if (!isLargeOrder && SHIP_SMALL_INTL) {
//                 shippingRateId = SHIP_SMALL_INTL
//             }
//         } else {
//             // domestic
//             if (isLargeOrder && SHIP_LARGE_DOMESTIC) {
//                 shippingRateId = SHIP_LARGE_DOMESTIC
//             } else if (!isLargeOrder && SHIP_SMALL_DOMESTIC) {
//                 shippingRateId = SHIP_SMALL_DOMESTIC
//             }
//         }

//         // Fallback to legacy single-rate if needed
//         if (!shippingRateId && SHIPPING_RATE_ID) {
//             shippingRateId = SHIPPING_RATE_ID
//         }
//         if (shippingRateId) {
//             shippingRateId = mapToTestShippingRate(shippingRateId)
//         }

//         // -------------------------------
//         // Allowed countries based on region
//         // -------------------------------
//         const domesticCountries: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
//             ['US']

//         const internationalCountries: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] = [
//             // add/remove as you like
//             'CA', //Canada
//             'AU', //Australia
//             'GB', //United Kingdom
//             'DE', //Germany
//             'KR', //South Korea
//             'JP', //Japan
//             'MX', //Mexico
//             'TH', //Thailand
//             'NZ', //New Zealand
//             'SG', //Singapore
//             'HU', //Hungary

//             // 'FR',
//             // 'NZ', 
//             // 'IE',
//             // 'NL',
//             // 'SE',
//             // 'NO',
//             // 'DK',
//             // 'FI',
//             // 'IT',
//             // 'ES',
//             // 'PT',
//             // 'BE',
//             // 'CH',
//             // 'AT',
//             // 'JP',
//             // 'SG',
//         ]

//         const allowedCountries =
//             region === 'domestic' ? domesticCountries : internationalCountries

//         // -------------------------------
//         // Base params
//         // -------------------------------
//         // Base params (no allow_promotion_codes here)
//         const params: Stripe.Checkout.SessionCreateParams = {
//             mode: 'payment',
//             line_items: lineItems,
//             success_url: `${origin}/success`,
//             cancel_url: `${origin}/shop`,
//             shipping_address_collection: {
//                 allowed_countries: allowedCountries,
//             },
//             shipping_options: shippingRateId
//                 ? [{ shipping_rate: shippingRateId }]
//                 : undefined,
//             metadata: {},
//         }

//         // -------------------------------
//         // Persist custom token breakdown for fulfillment
//         // -------------------------------
//         if (customizations.length > 0) {
//             const customRef = randomUUID()

//             // Store full detail in KV (keep Stripe metadata small)
//             await kv.set(
//                 `customizations:${customRef}`,
//                 {
//                     customizations,
//                     wallet: wallet || null,
//                     createdAt: Date.now(),
//                 },
//                 { ex: 60 * 60 * 24 * 30 } // 30 days
//             )

//             params.metadata = {
//                 ...params.metadata,
//                 customRef,
//                 customCount: String(customizations.length),
//             }
//         }

//         // Attach wallet for reconciliation
//         if (wallet) {
//             params.metadata = {
//                 ...params.metadata,
//                 walletAddress: wallet,
//             }
//         }

//         // Gift add-on
//         if (canGrantGift) {
//             params.line_items!.push({
//                 price: GIFT_PRICE_ID!,
//                 quantity: 1,
//             })

//             params.discounts = [{ coupon: GIFT_COUPON_ID! }]

//             params.metadata = {
//                 ...params.metadata,
//                 giftIntent: 'true',
//             }
//         } else {
//             // Only allow promotion codes when we're *not* auto-applying a discount
//             params.allow_promotion_codes = true

//             params.metadata = {
//                 ...params.metadata,
//                 giftIntent: 'false',
//             }
//         }

//         if (IS_TEST) {
//             for (const li of lineItems) {
//                 if (!li.price?.startsWith('price_')) {
//                     throw new Error(`Invalid test price detected: ${li.price}`)
//                 }
//             }
//         }

//         const session = await stripe.checkout.sessions.create(params)
//         return NextResponse.json({ url: session.url })
//     } catch (err: unknown) {
//         console.error('[create-checkout-session] error:', err)
//         const message =
//             err instanceof Error
//                 ? err.message
//                 : 'Unexpected error creating checkout session'
//         return NextResponse.json({ error: message }, { status: 500 })
//     }
// }
