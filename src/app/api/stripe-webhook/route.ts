// src/app/api/stripe-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { kv } from '@vercel/kv'

const secretKey = process.env.STRIPE_SECRET_KEY!
const stripe = new Stripe(secretKey, {
  apiVersion: '2025-10-29.clover', // or whatever your dashboard shows
})
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  const rawBody = await req.text()

  let event: Stripe.Event

  try {
    if (!endpointSecret || !sig) {
      // local dev fallback
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

      console.log('Gift metadata:', { giftIntent, wallet })

      if (giftIntent && wallet) {
        console.log('🎁 Would record gift for wallet:', wallet)

        // ⬇️ comment KV out for a moment
        await kv.set(`gift_claimed:${wallet}`, '1')
        await kv.incr('gift_count')
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ received: true }, { status: 500 })
  }
}
// // src/app/api/stripe-webhook/route.ts
// import { NextRequest, NextResponse } from 'next/server'
// import Stripe from 'stripe'
// import { hasClaimed, markClaimed } from '@/lib/kv' // <- uses the wrapper we made in src/lib/kv.ts

// const secretKey = process.env.STRIPE_SECRET_KEY!
// const stripe = new Stripe(secretKey)
// const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

// export async function POST(req: NextRequest) {
//     const sig = req.headers.get('stripe-signature')
//     const rawBody = await req.text()

//     let event: Stripe.Event
//     try {
//         if (!endpointSecret || !sig) {
//             // (Dev fallback) unsafe: accept unsigned events locally
//             event = JSON.parse(rawBody)
//         } else {
//             event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret)
//         }
//     } catch (err) {
//         console.error('❌ Webhook signature verification failed:', err)
//         return NextResponse.json({ error: 'Bad signature' }, { status: 400 })
//     }

//     try {
//         if (event.type === 'checkout.session.completed') {
//             const session = event.data.object as Stripe.Checkout.Session

//             const giftIntent = session.metadata?.giftIntent === 'true'
//             const wallet = (session.metadata?.walletAddress || '').toLowerCase()

//             // Only handle wallets with the gift intent
//             if (giftIntent && wallet) {
//                 const alreadyClaimed = await hasClaimed(wallet)

//                 if (!alreadyClaimed) {
//                     await markClaimed(wallet, session.id)
//                     console.log(`✅ Gift claim recorded for wallet: ${wallet}`)
//                 } else {
//                     console.log(`⚠️ Wallet ${wallet} already claimed gift.`)
//                 }
//             }
//         }
//     } catch (err) {
//         console.error('⚠️ Webhook handler error:', err)
//         return NextResponse.json({ received: true }, { status: 500 })
//     }

//     return NextResponse.json({ received: true })
// }