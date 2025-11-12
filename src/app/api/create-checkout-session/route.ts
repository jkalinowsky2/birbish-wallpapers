// src/app/api/create-checkout-session/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const secretKey = process.env.STRIPE_SECRET_KEY
if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set')
}

const stripe = new Stripe(secretKey)

// Env vars you should set in .env.local + Vercel
const SHIPPING_RATE_ID = process.env.STRIPE_SHIPPING_RATE_ID // shr_...
const GIFT_PRICE_ID = process.env.STRIPE_GIFT_PRICE_ID    // price_... for holographic sticker
const GIFT_COUPON_ID = process.env.STRIPE_GIFT_COUPON_ID   // free-holo-mb

type CartItem = {
    priceId: string
    quantity: number
}

type RequestBody = {
    items: CartItem[]
    giftEligible?: boolean
    walletAddress?: string
}

export async function POST(request: Request) {
    try {
        const { items, giftEligible, walletAddress } =
            (await request.json()) as RequestBody

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

        // Build base line items from the cart
        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items
            .filter((i) => i.quantity > 0)
            .map((i) => ({
                price: i.priceId,
                quantity: i.quantity,
            }))

        if (lineItems.length === 0) {
            return NextResponse.json(
                { error: 'Cart is empty.' },
                { status: 400 },
            )
        }

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
            metadata: {
                walletAddress: walletAddress ?? '',
                giftIntent: giftEligible ? 'true' : 'false',
            },
        }

        // Only add gift + coupon when all 3 are true:
        //  - user eligible
        //  - we have a gift price
        //  - we have a coupon id
        if (giftEligible && GIFT_PRICE_ID && GIFT_COUPON_ID) {
            ; (params.line_items as Stripe.Checkout.SessionCreateParams.LineItem[]).push(
                {
                    price: GIFT_PRICE_ID,
                    quantity: 1,
                },
            )

            params.discounts = [
                {
                    coupon: GIFT_COUPON_ID,
                },
            ]
        }

        const session = await stripe.checkout.sessions.create(params)

        return NextResponse.json({ url: session.url })
    } catch (err) {
        console.error(err)
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

// const secretKey = process.env.STRIPE_SECRET_KEY
// if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set')
// //const stripe = new Stripe(secretKey)
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
// const GIFT_PRICE_ID   = process.env.GIFT_PRICE_ID!      // price_xxx for "Holographic Logo Sticker"
// const GIFT_COUPON_ID  = process.env.GIFT_COUPON_ID!     // your coupon id (e.g. "free-holo-mb")
// const SHIPPING_RATE_ID = process.env.STRIPE_SHIPPING_RATE_ID

// type CartItem = { priceId: string; quantity: number }
// type CreateCheckoutBody = {
//   items: CartItem[]
//   giftEligible?: boolean
//   walletAddress?: string
// }

// export async function POST(request: Request) {
//   try {
//     const { items, giftEligible, walletAddress } = (await request.json()) as CreateCheckoutBody

//     if (!items || !Array.isArray(items) || items.length === 0) {
//       return NextResponse.json({ error: 'No items passed to checkout.' }, { status: 400 })
//     }

//     const origin =
//       request.headers.get('origin') ??
//       process.env.NEXT_PUBLIC_SITE_URL ??
//       'http://localhost:3000'

//     const shippingRateId = process.env.STRIPE_SHIPPING_RATE_ID
//     const giftPriceId = process.env.GIFT_PRICE_ID       // price_... for gift sticker
//     const giftCouponId = process.env.GIFT_COUPON_ID     // coupon_... restricted to gift product

//     // Normal cart items
//     const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items
//       .filter((i) => i.quantity > 0)
//       .map((i) => ({ price: i.priceId, quantity: i.quantity }))

//     if (lineItems.length === 0) {
//       return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 })
//     }

//     // If eligible, add the gift as a normal line item
//     if (giftEligible && giftPriceId) {
//       lineItems.push({ price: giftPriceId, quantity: 1 })
//     }

//     // Session-level discounts (coupon restricted to the gift product in Stripe)
//     const sessionDiscounts: Stripe.Checkout.SessionCreateParams.Discount[] =
//       giftEligible && giftCouponId ? [{ coupon: giftCouponId }] : []

//     const session = await stripe.checkout.sessions.create({
//       mode: 'payment',
//       line_items: lineItems,
//       discounts: sessionDiscounts, // <-- apply here, not per line
//       shipping_address_collection: { allowed_countries: ['US', 'CA'] },
//       shipping_options: shippingRateId ? [{ shipping_rate: shippingRateId }] : undefined,
//       success_url: `${origin}/success`,
//       cancel_url: `${origin}/shop`,
//       metadata: {
//         giftIntent: giftEligible ? 'true' : 'false',
//         walletAddress: (walletAddress ?? '').toLowerCase(),
//       },
//     })

//     return NextResponse.json({ url: session.url })
//   } catch (err) {
//     console.error(err)
//     const message = err instanceof Error ? err.message : 'Unexpected error creating checkout session'
//     return NextResponse.json({ error: message }, { status: 500 })
//   }
// }

