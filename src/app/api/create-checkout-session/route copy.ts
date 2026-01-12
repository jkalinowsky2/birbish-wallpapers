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

const MIN_CUSTOM_QTY = 5

const PRODUCT_BY_PRICE_ID = new Map(ALL_PRODUCTS.map((p) => [p.priceId, p]))
const CUSTOM_PRICE_IDS = new Set(CUSTOM_PRODUCTS.map((p) => p.priceId))

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

type Variant = 'illustrated' | 'pixel'
type GroupKey = string

type Group = {
    priceId: string
    variant?: Variant
    totalQty: number
}

function groupKey(item: CartItem): GroupKey {
    // Only split into separate Stripe line items when a variant is present
    // (Moonbirds pixel vs illustrated).
    return item.variant ? `${item.priceId}:${item.variant}` : item.priceId
}

function dollarsToCents(n: number) {
    return Math.round(n * 100)
}

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

        // -------------------------------
        // Build grouped quantities:
        // - Non-variant items group by priceId
        // - Variant items group by priceId + variant (so Stripe shows separate lines)
        // Also capture custom token breakdown for fulfillment
        // -------------------------------
        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
        const groups = new Map<GroupKey, Group>()

        const customizations: Array<{
            priceId: string
            tokenId: string
            variant: Variant
            quantity: number
            collection?: string
        }> = []

        for (const item of items) {
            if (!item.quantity || item.quantity <= 0) continue

            // ✅ If it’s a custom product, it MUST include tokenId
            if (CUSTOM_PRICE_IDS.has(item.priceId) && !item.tokenId) {
                return NextResponse.json(
                    {
                        error: 'Custom sticker items must include tokenId.',
                        code: 'CUSTOM_TOKEN_REQUIRED',
                    },
                    { status: 400 },
                )
            }

            // Group totals (variant groups kept separate)
            const key = groupKey(item)
            const g =
                groups.get(key) ?? {
                    priceId: item.priceId,
                    variant: item.variant,
                    totalQty: 0,
                }
            g.totalQty += item.quantity
            groups.set(key, g)

            // Capture fulfillment breakdown (per token)
            if (item.tokenId) {
                const product = PRODUCT_BY_PRICE_ID.get(item.priceId)
                customizations.push({
                    priceId: item.priceId,
                    tokenId: String(item.tokenId),
                    variant: item.variant ?? 'illustrated',
                    quantity: item.quantity,
                    collection: product?.customCollection,
                })
            }
        }

        // ✅ total custom qty across ALL custom products (mix & match)
        const totalCustomQty = items.reduce((sum, it) => {
            if (!it.quantity || it.quantity <= 0) return sum
            return CUSTOM_PRICE_IDS.has(it.priceId) ? sum + it.quantity : sum
        }, 0)

        // ✅ Hard guard: if they have any custom stickers, they must have at least MIN_CUSTOM_QTY
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
        // Build Stripe line items (tier-aware)
        // Variant groups use price_data so Stripe doesn't merge them.
        // -------------------------------
        for (const g of groups.values()) {
            const product = PRODUCT_BY_PRICE_ID.get(g.priceId)

            // If we can't find the product, fall back to whatever came from the client
            if (!product) {
                lineItems.push({ price: g.priceId, quantity: g.totalQty })
                continue
            }

            // Custom products tier based on TOTAL custom qty (mix & match)
            // Non-custom products tier based on qty for that group
            const pricingQty = product.customCollection ? totalCustomQty : g.totalQty
            const tier = getTierForQuantity(product, pricingQty)
            const baseUnit = getBaseUnitPrice(product)

            // Determine unit price in dollars for this line
            const unitPriceDollars = tier ? tier.unitPrice : baseUnit
            const unitAmount = dollarsToCents(unitPriceDollars)

            // If this group has a variant, force separate lines in Stripe Checkout
            if (g.variant) {
                // In both test/live, use price_data (so we don't need separate Stripe Price IDs per variant)
                lineItems.push({
                    price_data: {
                        currency: 'usd',
                        unit_amount: unitAmount,
                        product_data: {
                            name: `${product.name} (${g.variant})`,
                            // you can add a short description if you want:
                            // description: `Variant: ${g.variant}`,
                        },
                    },
                    quantity: g.totalQty,
                })
                continue
            }

            // Non-variant items keep your existing Stripe Price ID logic.
            // TEST: always use mapped base priceIds only
            if (IS_TEST) {
                lineItems.push({
                    price: mapToTestPrice(product.priceId),
                    quantity: g.totalQty,
                })
                continue // ✅ critical: prevent adding a 2nd live line item
            }

            // LIVE: tier-aware pricing via tier priceId when needed
            if (!tier || tier.unitPrice === baseUnit) {
                lineItems.push({
                    price: product.priceId,
                    quantity: g.totalQty,
                })
            } else {
                lineItems.push({
                    price: tier.priceId,
                    quantity: g.totalQty,
                })
            }
        }

        if (lineItems.length === 0) {
            return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 })
        }

        console.log('[checkout] items:', items)
        console.log(
            '[checkout] groups:',
            Array.from(groups.entries()).map(([k, v]) => [k, v.totalQty]),
        )

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
            else if (!isLargeOrder && SHIP_SMALL_INTL)
                shippingRateId = SHIP_SMALL_INTL
        } else {
            if (isLargeOrder && SHIP_LARGE_DOMESTIC)
                shippingRateId = SHIP_LARGE_DOMESTIC
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
            [
                'CA',
                'AU',
                'GB',
                'DE',
                'KR',
                'JP',
                'MX',
                'TH',
                'NZ',
                'SG',
                'HU',
            ]

        const allowedCountries =
            region === 'domestic' ? domesticCountries : internationalCountries

        // -------------------------------
        // Base params
        // -------------------------------
        const params: Stripe.Checkout.SessionCreateParams = {
            mode: 'payment',
            line_items: lineItems,
            success_url: `${origin}/success`,
            cancel_url: `${origin}/shop`,
            shipping_address_collection: {
                allowed_countries: allowedCountries,
            },
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
                {
                    customizations,
                    wallet: wallet || null,
                    createdAt: Date.now(),
                },
                { ex: 60 * 60 * 24 * 30 },
            )

            params.metadata = {
                ...params.metadata,
                customRef,
                customCount: String(customizations.length),
            }
        }

        // Attach wallet for reconciliation
        if (wallet) {
            params.metadata = {
                ...params.metadata,
                walletAddress: wallet,
            }
        }

        // Gift add-on
        if (canGrantGift) {
            params.line_items!.push({
                price: GIFT_PRICE_ID!,
                quantity: 1,
            })

            params.discounts = [{ coupon: GIFT_COUPON_ID! }]

            params.metadata = {
                ...params.metadata,
                giftIntent: 'true',
            }
        } else {
            params.allow_promotion_codes = true
            params.metadata = {
                ...params.metadata,
                giftIntent: 'false',
            }
        }

        // Basic test guard (only validate li.price when present)
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
            err instanceof Error
                ? err.message
                : 'Unexpected error creating checkout session'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}