// src/app/api/stripe-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { kv } from '@vercel/kv'

const secretKey = process.env.STRIPE_SECRET_KEY!
const stripe = new Stripe(secretKey, {
    apiVersion: '2025-10-29.clover',
})
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
    const sig = req.headers.get('stripe-signature')
    const rawBody = await req.text()

    let event: Stripe.Event

    try {
        if (!endpointSecret || !sig) {
            // Local dev fallback (unsafe for production, but fine if endpointSecret
            // is not set on localhost)
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

            if (giftIntent && wallet) {
                const claimKey = `gift_claimed:${wallet}`

                // Check if we've already recorded a claim for this wallet
                const alreadyClaimed = await kv.get<string | null>(claimKey)

                if (alreadyClaimed) {
                    console.log('Gift already recorded for wallet, skipping increment')
                } else {
                    // First time this wallet claims: mark + increment count
                    const [_, newCount] = await Promise.all([
                        kv.set(claimKey, '1'),
                        kv.incr('gift_count'),
                    ])

                    console.log('KV updated:', { wallet, newCount })
                }
            }
        }

        return NextResponse.json({ received: true })
    } catch (err) {
        console.error('Webhook handler error:', err)
        return NextResponse.json({ received: true }, { status: 500 })
    }
}
