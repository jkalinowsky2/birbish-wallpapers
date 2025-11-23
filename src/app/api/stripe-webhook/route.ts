// src/app/api/stripe-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { kv } from '@vercel/kv'

const secretKey = process.env.STRIPE_SECRET_KEY!
const stripe = new Stripe(secretKey, {
    apiVersion: '2025-10-29.clover',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

// 👇 new envs for Google Sheets
const SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL
const SHEETS_SHARED_SECRET = process.env.GOOGLE_SHEETS_SHARED_SECRET

export async function POST(req: NextRequest) {
    const sig = req.headers.get('stripe-signature')
    const rawBody = await req.text()

    let event: Stripe.Event

    try {
        if (!endpointSecret || !sig) {
            // Local dev fallback – in production we *should* always have a secret
            event = JSON.parse(rawBody)
        } else {
            event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret)
        }
    } catch (err) {
        console.error('Webhook signature verification failed:', err)
        return NextResponse.json({ error: 'Bad signature' }, { status: 400 })
    }

    try {
        console.log('Webhook event type:', event.type)

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session

            const giftIntent = session.metadata?.giftIntent === 'true'
            const wallet = (session.metadata?.walletAddress || '').toLowerCase()

            console.log('Gift metadata from session:', { giftIntent, wallet })

            // ----------------------------
            // 1) Gift KV logic (existing)
            // ----------------------------
            if (giftIntent && wallet) {
                const claimKey = `gift_claimed:${wallet}`
                const alreadyClaimed = await kv.get<string | null>(claimKey)

                if (alreadyClaimed) {
                    console.log(
                        'Gift already recorded for wallet, skipping increment',
                        wallet,
                    )
                } else {
                    const [, newCount] = await Promise.all([
                        kv.set(claimKey, '1'),
                        kv.incr('gift_count'),
                    ])
                    console.log('KV updated:', { wallet, newCount })
                }
            }

            // -----------------------------------
            // 2) Push order to Google Sheets
            // -----------------------------------
            if (!SHEETS_WEBHOOK_URL) {
                console.warn(
                    'GOOGLE_SHEETS_WEBHOOK_URL not set – skipping Google Sheets logging',
                )
            } else {
                try {
                    // Get line items for this session
                    const lineItems = await stripe.checkout.sessions.listLineItems(
                        session.id,
                        { limit: 100 },
                    )

                    const items: { name: string; quantity: number }[] = []

                    for (const li of lineItems.data) {
                        const qty = li.quantity ?? 0
                        let name = 'Unknown item'

                        if (li.description) {
                            name = li.description
                        } else if (li.price?.product) {
                            if (typeof li.price.product === 'string') {
                                const productRef = await stripe.products.retrieve(li.price.product)

                                // ✅ if there's no `deleted` flag, it's a normal Product
                                if (!('deleted' in productRef)) {
                                    name = productRef.name
                                }
                            } else {
                                const productRef = li.price.product

                                // ✅ same logic here
                                if (!('deleted' in productRef)) {
                                    name = productRef.name
                                }
                            }
                        }

                        items.push({ name, quantity: qty })
                    }

                    // Address + customer info
                    const customerDetails = session.customer_details ?? null
                    const address = customerDetails?.address ?? null

                    // Region heuristic: domestic vs international if you ever need it
                    const country = address?.country ?? ''
                    const region =
                        country === 'US' || country === 'CA' ? 'domestic' : 'international'

                    const payload = {
                        secret: SHEETS_SHARED_SECRET,
                        orderId: session.id,
                        email: customerDetails?.email ?? session.customer_email ?? '',
                        name: customerDetails?.name ?? '',
                        address: {
                            line1: address?.line1 ?? '',
                            line2: address?.line2 ?? '',
                            city: address?.city ?? '',
                            state: address?.state ?? '',
                            postal_code: address?.postal_code ?? '',
                            country: address?.country ?? '',
                        },
                        items,
                        total: session.amount_total != null ? session.amount_total / 100 : '',
                        currency: session.currency ?? 'usd',
                        wallet,
                        region,
                    }

                    console.log(
                        'Sending order to Google Sheets:',
                        JSON.stringify(payload, null, 2),
                    )

                    const res = await fetch(SHEETS_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    })

                    const text = await res.text()
                    console.log(
                        'Google Sheets webhook response:',
                        res.status,
                        text.slice(0, 200),
                    )
                } catch (err) {
                    console.error('Error sending order to Google Sheets:', err)
                }
            }
        }

        return NextResponse.json({ received: true })
    } catch (err) {
        console.error('Webhook handler error:', err)
        return NextResponse.json({ received: true }, { status: 500 })
    }
}


