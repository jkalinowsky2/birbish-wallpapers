// src/app/api/stripe-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { kv } from '@vercel/kv'
import { prisma } from '@/lib/prisma'


const secretKey = process.env.STRIPE_SECRET_KEY!
const stripe = new Stripe(secretKey, {
  apiVersion: '2025-10-29.clover',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET
const SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL
const SHEETS_SHARED_SECRET = process.env.GOOGLE_SHEETS_SHARED_SECRET

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  const rawBody = await req.text()

  let event: Stripe.Event

  try {
    if (!endpointSecret || !sig) {
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

    //OLD IF EVENT
    // if (event.type === 'checkout.session.completed') {
    //   const session = event.data.object as Stripe.Checkout.Session

    //   const giftIntent = session.metadata?.giftIntent === 'true'
    //   const wallet = (session.metadata?.walletAddress || '').toLowerCase()

    //   console.log('Gift metadata from session:', { giftIntent, wallet })

    //   // ---------- NEW: receipt + shipping from PaymentIntent ----------
    //   let receiptNumber: string | null = null
    //   let receiptUrl: string | null = null
    //   let shippingName: string | undefined
    //   let shippingAddress: Stripe.Address | undefined

    //   if (session.payment_intent) {
    //     try {
    //       const paymentIntentId =
    //         typeof session.payment_intent === 'string'
    //           ? session.payment_intent
    //           : session.payment_intent.id

    //       const paymentIntent = await stripe.paymentIntents.retrieve(
    //         paymentIntentId,
    //         { expand: ['latest_charge', 'shipping'] },
    //       )

    //       const latestCharge = paymentIntent.latest_charge as Stripe.Charge | null

    //       receiptNumber = latestCharge?.receipt_number ?? null
    //       receiptUrl = latestCharge?.receipt_url ?? null

    //       if (paymentIntent.shipping) {
    //         shippingName = paymentIntent.shipping.name ?? undefined
    //         shippingAddress = paymentIntent.shipping.address ?? undefined
    //       }
    //     } catch (piErr) {
    //       console.error('[stripe-webhook] Failed to fetch PI details:', piErr)
    //     }
    //   }

    //   // 1) Gift KV logic (unchanged)
    //   if (giftIntent && wallet) {
    //     const claimKey = `gift_claimed:${wallet}`
    //     const alreadyClaimed = await kv.get<string | null>(claimKey)

    //     if (alreadyClaimed) {
    //       console.log(
    //         'Gift already recorded for wallet, skipping increment',
    //         wallet,
    //       )
    //     } else {
    //       const [, newCount] = await Promise.all([
    //         kv.set(claimKey, '1'),
    //         kv.incr('gift_count'),
    //       ])
    //       console.log('KV updated:', { wallet, newCount })
    //     }
    //   }

    //   // 2) Push order to Google Sheets
    //   if (!SHEETS_WEBHOOK_URL) {
    //     console.warn(
    //       'GOOGLE_SHEETS_WEBHOOK_URL not set – skipping Google Sheets logging',
    //     )
    //   } else {
    //     try {
    //       const lineItems = await stripe.checkout.sessions.listLineItems(
    //         session.id,
    //         { limit: 100 },
    //       )

    //       const items: { name: string; quantity: number }[] = []

    //       for (const li of lineItems.data) {
    //         const qty = li.quantity ?? 0
    //         let name = 'Unknown item'

    //         if (li.description) {
    //           name = li.description
    //         } else if (li.price?.product) {
    //           if (typeof li.price.product === 'string') {
    //             const productRef = await stripe.products.retrieve(li.price.product)
    //             if (!('deleted' in productRef)) {
    //               name = productRef.name
    //             }
    //           } else {
    //             const productRef = li.price.product
    //             if (!('deleted' in productRef)) {
    //               name = productRef.name
    //             }
    //           }
    //         }

    //         items.push({ name, quantity: qty })
    //       }

    //       const customerDetails = session.customer_details ?? null

    //       // 🔹 Prefer shipping from PaymentIntent; fall back to customer_details
    //       const chosenAddress = shippingAddress ?? customerDetails?.address ?? null
    //       const chosenName =
    //         shippingName ??
    //         customerDetails?.name ??
    //         ''

    //       const country = chosenAddress?.country ?? ''
    //       const region =
    //         country === 'US' || country === 'CA' ? 'domestic' : 'international'

    //       const payload = {
    //         secret: SHEETS_SHARED_SECRET,
    //         orderId: session.id,
    //         receiptNumber,
    //         receiptUrl,
    //         email: customerDetails?.email ?? session.customer_email ?? '',
    //         name: chosenName,
    //         address: {
    //           line1: chosenAddress?.line1 ?? '',
    //           line2: chosenAddress?.line2 ?? '',
    //           city: chosenAddress?.city ?? '',
    //           state: chosenAddress?.state ?? '',
    //           postal_code: chosenAddress?.postal_code ?? '',
    //           country: chosenAddress?.country ?? '',
    //         },
    //         items,
    //         total:
    //           session.amount_total != null ? session.amount_total / 100 : '',
    //         currency: session.currency ?? 'usd',
    //         wallet,
    //         region,
    //       }

    //       console.log(
    //         'Sending order to Google Sheets:',
    //         JSON.stringify(payload, null, 2),
    //       )

    //       const res = await fetch(SHEETS_WEBHOOK_URL, {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify(payload),
    //       })

    //       const text = await res.text()
    //       console.log(
    //         'Google Sheets webhook response:',
    //         res.status,
    //         text.slice(0, 200),
    //       )
    //     } catch (err) {
    //       console.error('Error sending order to Google Sheets:', err)
    //     }
    //   }
    // }

    //NEW IF EVENT WITH INVENTORY DECREMENT
    if (event.type === 'checkout.session.completed') {
  const session = event.data.object as Stripe.Checkout.Session

  const giftIntent = session.metadata?.giftIntent === 'true'
  const wallet = (session.metadata?.walletAddress || '').toLowerCase()

  console.log('Gift metadata from session:', { giftIntent, wallet })

  // ---------- NEW: receipt + shipping from PaymentIntent ----------
  let receiptNumber: string | null = null
  let receiptUrl: string | null = null
  let shippingName: string | undefined
  let shippingAddress: Stripe.Address | undefined

  if (session.payment_intent) {
    try {
      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent.id

      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId,
        { expand: ['latest_charge', 'shipping'] },
      )

      const latestCharge = paymentIntent.latest_charge as Stripe.Charge | null

      receiptNumber = latestCharge?.receipt_number ?? null
      receiptUrl = latestCharge?.receipt_url ?? null

      if (paymentIntent.shipping) {
        shippingName = paymentIntent.shipping.name ?? undefined
        shippingAddress = paymentIntent.shipping.address ?? undefined
      }
    } catch (piErr) {
      console.error('[stripe-webhook] Failed to fetch PI details:', piErr)
    }
  }

  // We’ll reuse line items both for Sheets and inventory
  let lineItems: Stripe.ApiList<Stripe.LineItem> | null = null

  // 1) Gift KV logic (unchanged)
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

  // 2) Push order to Google Sheets
  if (!SHEETS_WEBHOOK_URL) {
    console.warn(
      'GOOGLE_SHEETS_WEBHOOK_URL not set – skipping Google Sheets logging',
    )
  } else {
    try {
      // 🔹 Fetch line items (with price expanded so we have price.id)
      lineItems =
        lineItems ??
        (await stripe.checkout.sessions.listLineItems(session.id, {
          limit: 100,
          expand: ['data.price'],
        }))

      const items: { name: string; quantity: number }[] = []

      for (const li of lineItems.data) {
        const qty = li.quantity ?? 0
        let name = 'Unknown item'

        if (li.description) {
          name = li.description
        } else if (li.price?.product) {
          if (typeof li.price.product === 'string') {
            const productRef = await stripe.products.retrieve(li.price.product)
            if (!('deleted' in productRef)) {
              name = productRef.name
            }
          } else {
            const productRef = li.price.product
            if (!('deleted' in productRef)) {
              name = productRef.name
            }
          }
        }

        items.push({ name, quantity: qty })
      }

      const customerDetails = session.customer_details ?? null

      // 🔹 Prefer shipping from PaymentIntent; fall back to customer_details
      const chosenAddress = shippingAddress ?? customerDetails?.address ?? null
      const chosenName =
        shippingName ??
        customerDetails?.name ??
        ''

      const country = chosenAddress?.country ?? ''
      const region =
        country === 'US' || country === 'CA' ? 'domestic' : 'international'

      const payload = {
        secret: SHEETS_SHARED_SECRET,
        orderId: session.id,
        receiptNumber,
        receiptUrl,
        email: customerDetails?.email ?? session.customer_email ?? '',
        name: chosenName,
        address: {
          line1: chosenAddress?.line1 ?? '',
          line2: chosenAddress?.line2 ?? '',
          city: chosenAddress?.city ?? '',
          state: chosenAddress?.state ?? '',
          postal_code: chosenAddress?.postal_code ?? '',
          country: chosenAddress?.country ?? '',
        },
        items,
        total:
          session.amount_total != null ? session.amount_total / 100 : '',
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

  // 3) 🔻 Decrement inventory in Postgres when the session is paid
  try {
    if (session.payment_status === 'paid') {
      // Ensure we have line items (reuse the same call as above)
      lineItems =
        lineItems ??
        (await stripe.checkout.sessions.listLineItems(session.id, {
          limit: 100,
          expand: ['data.price'],
        }))

      for (const li of lineItems.data) {
        const qty = li.quantity ?? 0
        if (qty <= 0) continue

        const priceId =
          typeof li.price === 'string'
            ? li.price
            : li.price?.id

        if (!priceId) continue

        // Look up product in Postgres by Stripe priceId
        const product = await prisma.product.findUnique({
          where: { priceId },
          select: { id: true },
        })

        if (!product) {
          console.log(
            '[inventory] No Product found for priceId, skipping:',
            priceId,
          )
          continue
        }

        // Decrement inventory (safe even if row missing, updateMany just no-ops)
        const result = await prisma.inventory.updateMany({
          where: { productId: product.id },
          data: {
            quantity: { decrement: qty },
          },
        })

        console.log(
          '[inventory] Decremented',
          qty,
          'for productId',
          product.id,
          'rows updated:',
          result.count,
        )
      }
    } else {
      console.log(
        '[inventory] Session not paid (status:',
        session.payment_status,
        ') – skipping inventory adjustment.',
      )
    }
  } catch (invErr) {
    console.error('[inventory] Error updating inventory:', invErr)
    // We log but don’t fail the webhook; Stripe will retry on 500s anyway
  }
}

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ received: true }, { status: 500 })
  }
}