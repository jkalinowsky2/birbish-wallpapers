// src/app/api/create-checkout-session/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

type CartItem = {
    priceId: string
    quantity: number
}

export async function POST(request: Request) {
    try {
        const { items } = (await request.json()) as { items: CartItem[] }

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

        const shippingRateId = process.env.STRIPE_SHIPPING_RATE_ID

        const lineItems = items
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

        const session = await stripe.checkout.sessions.create({
            line_items: lineItems,
            mode: 'payment',
            success_url: `${origin}/success`,
            cancel_url: `${origin}/shop`,
            shipping_address_collection: {
                allowed_countries: ['US', 'CA'],
            },
            shipping_options: shippingRateId
                ? [{ shipping_rate: shippingRateId }]
                : undefined,
        })

        return NextResponse.json({ url: session.url })
    } catch (err: unknown) {
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

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// type CartItem = {
//     priceId: string
//     quantity: number
// }

// export async function POST(request: Request) {
//     const { items } = (await request.json()) as { items: CartItem[] }

//     if (!items || !Array.isArray(items) || items.length === 0) {
//         return NextResponse.json(
//             { error: 'No items passed to checkout.' },
//             { status: 400 },
//         )
//     }

//     try {
//         const origin =
//             request.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL!

//              const shippingRateId = process.env.STRIPE_SHIPPING_RATE_ID

//         const session = await stripe.checkout.sessions.create({
//             line_items: items.map((item) => ({
//                 price: item.priceId,
//                 quantity: item.quantity,
//             })),
//             mode: 'payment',
//             success_url: `${origin}/success`,
//             cancel_url: `${origin}/shop`,
//             shipping_address_collection: { allowed_countries: ['US', 'CA'] },  //GB for great britain, DE for Germany

//             // 👇 Flat $0.75 per order via Stripe Shipping Rate
//             shipping_options: shippingRateId
//                 ? [{ shipping_rate: shippingRateId }]
//                 : undefined,

//         })

//         return NextResponse.json({ url: session.url })
//     } catch (err: any) {
//         console.error(err)
//         return NextResponse.json({ error: err.message }, { status: 500 })
//     }
// }
