// src/app/api/create-checkout-session/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { kv } from '@vercel/kv'

const secretKey = process.env.STRIPE_SECRET_KEY
if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set')
}

const stripe = new Stripe(secretKey, {
    apiVersion: '2025-10-29.clover',
})

type CartItem = {
    priceId: string
    quantity: number
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

        // Normal cart line items
        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items
            .filter((i) => i.quantity > 0)
            .map((i) => ({
                price: i.priceId,
                quantity: i.quantity,
            }))

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
                // fail closed: no gift if KV has issues
                canGrantGift = false
            }
        }

        // -------------------------------
        // Shipping (4 tiers: qty × region)
        // -------------------------------
        const totalQty = items.reduce(
            (sum, i) => sum + (i.quantity || 0),
            0,
        )
        const isLargeOrder = totalQty > 10

        const region: 'domestic' | 'international' =
            shippingRegion === 'international' ? 'international' : 'domestic'

        let shippingRateId: string | undefined

        if (region === 'international') {
            if (isLargeOrder && SHIP_LARGE_INTL) {
                shippingRateId = SHIP_LARGE_INTL
            } else if (!isLargeOrder && SHIP_SMALL_INTL) {
                shippingRateId = SHIP_SMALL_INTL
            }
        } else {
            // domestic
            if (isLargeOrder && SHIP_LARGE_DOMESTIC) {
                shippingRateId = SHIP_LARGE_DOMESTIC
            } else if (!isLargeOrder && SHIP_SMALL_DOMESTIC) {
                shippingRateId = SHIP_SMALL_DOMESTIC
            }
        }

        // Fallback to legacy single-rate if needed
        if (!shippingRateId && SHIPPING_RATE_ID) {
            shippingRateId = SHIPPING_RATE_ID
        }

        // -------------------------------
        // Allowed countries based on region
        // -------------------------------
        const domesticCountries: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
            ['US']

        const internationalCountries: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] = [
            // add/remove as you like
            'CA', //Canada
            'AU', //Australia
            'GB', //United Kingdom
            'DE', //Germany
            'KR', //South Korea
            'JP', //Japan
            'MX', //Mexico

             // 'NZ', //New Zealand
            // 'FR',
            // 'NZ', 
            // 'IE',
            // 'NL',
            // 'SE',
            // 'NO',
            // 'DK',
            // 'FI',
            // 'IT',
            // 'ES',
            // 'PT',
            // 'BE',
            // 'CH',
            // 'AT',
            // 'JP',
            // 'SG',
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
            allow_promotion_codes: true,   // 👈 THIS LINE
            shipping_address_collection: {
                allowed_countries: allowedCountries,
            },
            shipping_options: shippingRateId
                ? [{ shipping_rate: shippingRateId }]
                : undefined,
            metadata: {},
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
            params.metadata = {
                ...params.metadata,
                giftIntent: 'false',
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

// // src/app/api/create-checkout-session/route.ts
// import { NextResponse } from 'next/server'
// import Stripe from 'stripe'
// import { kv } from '@vercel/kv'

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
// }

// // Legacy single-rate fallback
// const SHIPPING_RATE_ID = process.env.STRIPE_SHIPPING_RATE_ID

// // Gift config
// const GIFT_PRICE_ID = process.env.STRIPE_GIFT_PRICE_ID
// const GIFT_COUPON_ID = process.env.STRIPE_GIFT_COUPON_ID

// // New 4-tier shipping
// const SHIP_SMALL_DOMESTIC = process.env.STRIPE_SHIP_SMALL_DOMESTIC
// const SHIP_LARGE_DOMESTIC = process.env.STRIPE_SHIP_LARGE_DOMESTIC
// const SHIP_SMALL_INTL = process.env.STRIPE_SHIP_SMALL_INTL
// const SHIP_LARGE_INTL = process.env.STRIPE_SHIP_LARGE_INTL

// export async function POST(request: Request) {
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

//         // Normal cart line items
//         const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items
//             .filter((i) => i.quantity > 0)
//             .map((i) => ({
//                 price: i.priceId,
//                 quantity: i.quantity,
//             }))

//         if (lineItems.length === 0) {
//             return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 })
//         }

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
//                 canGrantGift = false
//             }
//         }

//         // -------------------------------
//         // Shipping (4 tiers: qty × region)
//         // -------------------------------
//         const totalQty = items.reduce((sum, i) => sum + (i.quantity || 0), 0)
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

//         // -------------------------------
//         // Base params
//         // -------------------------------
//         const params: Stripe.Checkout.SessionCreateParams = {
//             mode: 'payment',
//             line_items: lineItems,
//             success_url: `${origin}/success`,
//             cancel_url: `${origin}/shop`,
//             shipping_address_collection: {
//                 // ❗ add/change to all countries you want to support
//                 allowed_countries: [
//                     'US',
//                     'CA',
//                     'GB',
//                     'DE',
//                     'FR',
//                     'AU',
//                     'NZ',
//                     'IE',
//                     'NL',
//                     'SE',
//                     'NO',
//                     'DK',
//                     'FI',
//                     'IT',
//                     'ES',
//                     'PT',
//                     'BE',
//                     'CH',
//                     'AT',
//                     'JP',
//                     'SG',
//                 ],
//             },
//             shipping_options: shippingRateId
//                 ? [{ shipping_rate: shippingRateId }]
//                 : undefined,
//             metadata: {},
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
//             params.metadata = {
//                 ...params.metadata,
//                 giftIntent: 'false',
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



//OLD OLD OLD OLD
// // src/app/api/create-checkout-session/route.ts
// import { NextResponse } from 'next/server'
// import Stripe from 'stripe'
// import { kv } from '@vercel/kv'

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
// }

// // env:
// // STRIPE_SHIPPING_RATE_ID=shr_...
// // STRIPE_GIFT_PRICE_ID=price_...   (holo sticker price)
// // STRIPE_GIFT_COUPON_ID=free-holo-mb (100% off holo price, restricted to that product)
// const SHIPPING_RATE_ID = process.env.STRIPE_SHIPPING_RATE_ID
// const GIFT_PRICE_ID = process.env.STRIPE_GIFT_PRICE_ID
// const GIFT_COUPON_ID = process.env.STRIPE_GIFT_COUPON_ID

// export async function POST(request: Request) {
//     try {
//         const { items, giftEligible, walletAddress } = (await request.json()) as {
//             items: CartItem[]
//             giftEligible?: boolean
//             walletAddress?: string
//         }

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

//         // Normal cart line items
//         const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items
//             .filter((i) => i.quantity > 0)
//             .map((i) => ({
//                 price: i.priceId,
//                 quantity: i.quantity,
//             }))

//         if (lineItems.length === 0) {
//             return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 })
//         }

//         // -------------------------------
//         // Server-side gift eligibility
//         // -------------------------------
//         const wallet = (walletAddress ?? '').toLowerCase().trim()
//         let canGrantGift = false

//         // Only even *consider* the gift if:
//         // - UI said they're eligible (holder + min spend)
//         // - we have a wallet
//         // - we have the Stripe IDs for gift price & coupon
//         if (giftEligible && wallet && GIFT_PRICE_ID && GIFT_COUPON_ID) {
//             try {
//                 const [alreadyClaimed, rawCount] = await Promise.all([
//                     kv.get<string | null>(`gift_claimed:${wallet}`),
//                     kv.get<string | number | null>('gift_count'),
//                 ])

//                 const count = rawCount == null ? 0 : Number(rawCount) || 0
//                 const claimed = !!alreadyClaimed

//                 // One per wallet + hard cap of 50 gifts
//                 if (!claimed && count < 50) {
//                     canGrantGift = true
//                 } else {
//                     console.log(
//                         '[create-checkout-session] gift blocked',
//                         { wallet, claimed, count },
//                     )
//                 }
//             } catch (kvErr) {
//                 // If KV lookup fails, fail closed (no gift) so we don't over-issue
//                 console.error('[create-checkout-session] KV lookup failed:', kvErr)
//                 canGrantGift = false
//             }
//         }

//         // Base params
//         const params: Stripe.Checkout.SessionCreateParams = {
//             mode: 'payment',
//             line_items: lineItems,
//             success_url: `${origin}/success`,
//             cancel_url: `${origin}/shop`,
//             shipping_address_collection: {
//                 allowed_countries: ['US', 'CA'],
//             },
//             shipping_options: SHIPPING_RATE_ID
//                 ? [{ shipping_rate: SHIPPING_RATE_ID }]
//                 : undefined,
//             metadata: {},
//         }

//         // Attach wallet to metadata either way (handy for reconciliation)
//         if (wallet) {
//             params.metadata = {
//                 ...params.metadata,
//                 walletAddress: wallet,
//             }
//         }

//         // If the server has decided this order SHOULD get the free holo sticker:
//         if (canGrantGift) {
//             // Add one holographic sticker line item
//             params.line_items!.push({
//                 price: GIFT_PRICE_ID!,
//                 quantity: 1,
//             })

//             // Apply the 100% off coupon (scoped to the holo product in Stripe dashboard)
//             params.discounts = [{ coupon: GIFT_COUPON_ID! }]

//             // Mark intent so the webhook can record the claim + increment count
//             params.metadata = {
//                 ...params.metadata,
//                 giftIntent: 'true',
//             }
//         } else {
//             // Explicitly mark no-gift path (useful for debugging in webhook logs)
//             params.metadata = {
//                 ...params.metadata,
//                 giftIntent: 'false',
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
