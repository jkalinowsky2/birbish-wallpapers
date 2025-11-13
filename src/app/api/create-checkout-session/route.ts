// src/app/api/create-checkout-session/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

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

// env:
// STRIPE_SHIPPING_RATE_ID=shr_...
// STRIPE_GIFT_PRICE_ID=price_...   (holo sticker price)
// STRIPE_GIFT_COUPON_ID=free-holo-mb (100% off holo price, restricted to that product)
const SHIPPING_RATE_ID = process.env.STRIPE_SHIPPING_RATE_ID
const GIFT_PRICE_ID = process.env.STRIPE_GIFT_PRICE_ID
const GIFT_COUPON_ID = process.env.STRIPE_GIFT_COUPON_ID

export async function POST(request: Request) {
    try {
        const { items, giftEligible, walletAddress } = (await request.json()) as {
            items: CartItem[]
            giftEligible?: boolean
            walletAddress?: string
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
        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
            items
                .filter((i) => i.quantity > 0)
                .map((i) => ({
                    price: i.priceId,
                    quantity: i.quantity,
                }))

        if (lineItems.length === 0) {
            return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 })
        }

        // Base params
        const params: Stripe.Checkout.SessionCreateParams = {
            mode: 'payment',
            line_items: lineItems,
            success_url: `${origin}/success`,
            cancel_url: `${origin}/shop`,
            shipping_address_collection: {
                allowed_countries: ['US', 'CA'],
            },
            shipping_options: SHIPPING_RATE_ID
                ? [{ shipping_rate: SHIPPING_RATE_ID }]
                : undefined,
            metadata: {},
        }

        // If this order SHOULD get the free holo sticker:
        if (giftEligible && GIFT_PRICE_ID && GIFT_COUPON_ID) {
            // add one holographic sticker line item
            params.line_items!.push({
                price: GIFT_PRICE_ID,
                quantity: 1,
            })

            // apply the 100% off coupon (limited to holo product in dashboard)
            params.discounts = [{ coupon: GIFT_COUPON_ID }]

            // mark intent + wallet in metadata so webhook can count it
            params.metadata = {
                ...params.metadata,
                giftIntent: 'true',
                walletAddress: (walletAddress ?? '').toLowerCase(),
            }
        } else if (walletAddress) {
            // still store wallet even if not gift eligible (optional)
            params.metadata = {
                ...params.metadata,
                walletAddress: walletAddress.toLowerCase(),
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

// src/app/api/create-checkout-session/route.ts
// import { NextResponse } from 'next/server'
// import Stripe from 'stripe'

// const secretKey = process.env.STRIPE_SECRET_KEY
// if (!secretKey) {
//     throw new Error('STRIPE_SECRET_KEY is not set')
// }

// const stripe = new Stripe(secretKey)

// // Env vars you should set in .env.local + Vercel
// const SHIPPING_RATE_ID = process.env.STRIPE_SHIPPING_RATE_ID // shr_...
// const GIFT_PRICE_ID = process.env.STRIPE_GIFT_PRICE_ID    // price_... for holographic sticker
// const GIFT_COUPON_ID = process.env.STRIPE_GIFT_COUPON_ID   // free-holo-mb

// type CartItem = {
//     priceId: string
//     quantity: number
// }

// type RequestBody = {
//     items: CartItem[]
//     giftEligible?: boolean
//     walletAddress?: string
// }

// export async function POST(request: Request) {
//     try {
//         const { items, giftEligible, walletAddress } =
//             (await request.json()) as RequestBody

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

//         // Build base line items from the cart
//         const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items
//             .filter((i) => i.quantity > 0)
//             .map((i) => ({
//                 price: i.priceId,
//                 quantity: i.quantity,
//             }))

//         if (lineItems.length === 0) {
//             return NextResponse.json(
//                 { error: 'Cart is empty.' },
//                 { status: 400 },
//             )
//         }

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
//             metadata: {
//                 walletAddress: walletAddress ?? '',
//                 giftIntent: giftEligible ? 'true' : 'false',
//             },
//         }

//         // Only add gift + coupon when all 3 are true:
//         //  - user eligible
//         //  - we have a gift price
//         //  - we have a coupon id
//         if (giftEligible && GIFT_PRICE_ID && GIFT_COUPON_ID) {
//             ; (params.line_items as Stripe.Checkout.SessionCreateParams.LineItem[]).push(
//                 {
//                     price: GIFT_PRICE_ID,
//                     quantity: 1,
//                 },
//             )

//             params.discounts = [
//                 {
//                     coupon: GIFT_COUPON_ID,
//                 },
//             ]
//         }

//         const session = await stripe.checkout.sessions.create(params)

//         return NextResponse.json({ url: session.url })
//     } catch (err) {
//         console.error(err)
//         const message =
//             err instanceof Error
//                 ? err.message
//                 : 'Unexpected error creating checkout session'

//         return NextResponse.json({ error: message }, { status: 500 })
//     }
// }
