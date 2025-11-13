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

        // Only even *consider* the gift if:
        // - UI said they're eligible (holder + min spend)
        // - we have a wallet
        // - we have the Stripe IDs for gift price & coupon
        if (giftEligible && wallet && GIFT_PRICE_ID && GIFT_COUPON_ID) {
            try {
                const [alreadyClaimed, rawCount] = await Promise.all([
                    kv.get<string | null>(`gift_claimed:${wallet}`),
                    kv.get<string | number | null>('gift_count'),
                ])

                const count = rawCount == null ? 0 : Number(rawCount) || 0
                const claimed = !!alreadyClaimed

                // One per wallet + hard cap of 50 gifts
                if (!claimed && count < 50) {
                    canGrantGift = true
                } else {
                    console.log(
                        '[create-checkout-session] gift blocked',
                        { wallet, claimed, count },
                    )
                }
            } catch (kvErr) {
                // If KV lookup fails, fail closed (no gift) so we don't over-issue
                console.error('[create-checkout-session] KV lookup failed:', kvErr)
                canGrantGift = false
            }
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

        // Attach wallet to metadata either way (handy for reconciliation)
        if (wallet) {
            params.metadata = {
                ...params.metadata,
                walletAddress: wallet,
            }
        }

        // If the server has decided this order SHOULD get the free holo sticker:
        if (canGrantGift) {
            // Add one holographic sticker line item
            params.line_items!.push({
                price: GIFT_PRICE_ID!,
                quantity: 1,
            })

            // Apply the 100% off coupon (scoped to the holo product in Stripe dashboard)
            params.discounts = [{ coupon: GIFT_COUPON_ID! }]

            // Mark intent so the webhook can record the claim + increment count
            params.metadata = {
                ...params.metadata,
                giftIntent: 'true',
            }
        } else {
            // Explicitly mark no-gift path (useful for debugging in webhook logs)
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
//         const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
//             items
//                 .filter((i) => i.quantity > 0)
//                 .map((i) => ({
//                     price: i.priceId,
//                     quantity: i.quantity,
//                 }))

//         if (lineItems.length === 0) {
//             return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 })
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

//         // If this order SHOULD get the free holo sticker:
//         if (giftEligible && GIFT_PRICE_ID && GIFT_COUPON_ID) {
//             // add one holographic sticker line item
//             params.line_items!.push({
//                 price: GIFT_PRICE_ID,
//                 quantity: 1,
//             })

//             // apply the 100% off coupon (limited to holo product in dashboard)
//             params.discounts = [{ coupon: GIFT_COUPON_ID }]

//             // mark intent + wallet in metadata so webhook can count it
//             params.metadata = {
//                 ...params.metadata,
//                 giftIntent: 'true',
//                 walletAddress: (walletAddress ?? '').toLowerCase(),
//             }
//         } else if (walletAddress) {
//             // still store wallet even if not gift eligible (optional)
//             params.metadata = {
//                 ...params.metadata,
//                 walletAddress: walletAddress.toLowerCase(),
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
