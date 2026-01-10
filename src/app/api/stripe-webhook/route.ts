// src/app/api/stripe-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { kv } from '@vercel/kv'
import { prisma } from '@/lib/prisma'

const secretKey = process.env.STRIPE_SECRET_KEY!
const stripe = new Stripe(secretKey, {
  apiVersion: '2025-10-29.clover',
})

const endpointSecrets = [
  process.env.STRIPE_WEBHOOK_SECRET_TEST, // test endpoint secret from Stripe Dashboard (test mode)
  process.env.STRIPE_WEBHOOK_SECRET,      // live endpoint secret from Stripe Dashboard (live mode)
].filter(Boolean) as string[]

if (endpointSecrets.length === 0) {
  throw new Error('No Stripe webhook secrets configured')
}

const SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL
const SHEETS_SHARED_SECRET = process.env.GOOGLE_SHEETS_SHARED_SECRET

// 🔹 Sticker pack & component price IDs (keep in sync with seed.ts & inventory API)
const PACK_PRICE_ID = 'price_1SSO0a0n54kwZghJjM2dgJBA' // birb Sticker Pack 1

const PACK_COMPONENT_PRICE_IDS = [
  'price_1SSNvA0n54kwZghJiTSORDLI', // birb Logo Sticker
  'price_1SSNvz0n54kwZghJvhG7TsVC', // birb. Sticker
  'price_1SRz6I0n54kwZghJv7x2zRyo', // Head birb Sticker – Mustard
  'price_1SSNuf0n54kwZghJrl0bQDHP', // I ❤️ MB Sticker
  'price_1SSNva0n54kwZghJPTofWD8J', // Toobins Sticker
]



export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  const rawBody = await req.text()

  console.log('sig?', !!sig, 'secrets:', endpointSecrets.length)

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event | null = null
  let lastErr: unknown = null

  for (const secret of endpointSecrets) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, secret)
      break
    } catch (e) {
      lastErr = e
    }
  }

  if (!event) {
    console.error('Webhook signature verification failed:', lastErr)
    return NextResponse.json({ error: 'Bad signature' }, { status: 400 })
  }

  try {
    console.log('Webhook event type:', event.type)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // --- NEW: load custom token breakdown from KV (if present) ---
      const customRef = session.metadata?.customRef
      let customizationData:
        | { customizations: Array<{ priceId: string; tokenId: string; quantity: number }> }
        | null = null

      if (customRef) {
        try {
          customizationData = await kv.get(`customizations:${customRef}`)
        } catch (e) {
          console.error('[stripe-webhook] Failed to load customizations from KV:', e)
        }
      }

      const giftIntent = session.metadata?.giftIntent === 'true'
      const wallet = (session.metadata?.walletAddress || '').toLowerCase()


      let customizations: Array<{ priceId: string; tokenId: string; quantity: number }> = []

      if (customRef) {
        try {
          const stored = await kv.get<any>(`customizations:${customRef}`)
          if (stored?.customizations && Array.isArray(stored.customizations)) {
            customizations = stored.customizations
          }
        } catch (e) {
          console.error('[stripe-webhook] failed to load customizations from KV', e)
        }
      }

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

      // 2) Fetch line items (used for BOTH Sheets + inventory)
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 100,
        expand: ['data.price.product'],
      })

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

      // 3) 🔥 NEW: decrement inventory in Postgres (with idempotency)
      try {
        const invKey = `inventory_processed:${session.id}`
        const alreadyProcessed = await kv.get<string | null>(invKey)

        if (alreadyProcessed) {
          console.log(
            'Inventory already processed for this session – skipping decrement:',
            session.id,
          )
        } else {
          // Collect all priceIds present in this order
          const priceIdsInOrder = new Set<string>()

          for (const li of lineItems.data) {
            const price = li.price
            let priceId: string | null = null

            if (!price) continue

            if (typeof price === 'string') {
              priceId = price
            } else {
              priceId = price.id
            }

            if (priceId) priceIdsInOrder.add(priceId)
          }

          // Ensure we ALSO have the pack + its component priceIds loaded
          priceIdsInOrder.add(PACK_PRICE_ID)
          for (const pid of PACK_COMPONENT_PRICE_IDS) {
            priceIdsInOrder.add(pid)
          }

          const products = await prisma.product.findMany({
            where: {
              priceId: {
                in: Array.from(priceIdsInOrder),
              },
            },
            select: {
              id: true,
              priceId: true,
            },
          })

          const productByPriceId = new Map<string, { id: string }>()

          for (const p of products) {
            productByPriceId.set(p.priceId, { id: p.id })
          }

          // Loop over each line item and decrement the right inventory rows
          for (const li of lineItems.data) {
            const qty = li.quantity ?? 0
            if (qty <= 0) continue

            const price = li.price
            let priceId: string | null = null

            if (!price) continue

            if (typeof price === 'string') {
              priceId = price
            } else {
              priceId = price.id
            }

            if (!priceId) continue

            // If it's the sticker pack, decrement each of the 5 component stickers
            if (priceId === PACK_PRICE_ID) {
              console.log(
                `Decrementing component inventory for pack (${qty}x):`,
                PACK_COMPONENT_PRICE_IDS,
              )

              for (const componentPriceId of PACK_COMPONENT_PRICE_IDS) {
                const compProduct = productByPriceId.get(componentPriceId)
                if (!compProduct) {
                  console.warn(
                    'No DB product found for pack component priceId:',
                    componentPriceId,
                  )
                  continue
                }

                await prisma.inventory.update({
                  where: { productId: compProduct.id },
                  data: {
                    quantity: {
                      decrement: qty,
                    },
                  },
                })
              }
            } else {
              // Normal, single product
              const product = productByPriceId.get(priceId)

              if (!product) {
                console.warn('No DB product found for priceId:', priceId)
                continue
              }

              await prisma.inventory.update({
                where: { productId: product.id },
                data: {
                  quantity: {
                    decrement: qty,
                  },
                },
              })
            }
          }

          await kv.set(invKey, '1')
          console.log('Inventory decremented for session:', session.id)
        }
      } catch (invErr) {
        console.error(
          'Error while decrementing inventory for session',
          session.id,
          invErr,
        )
      }

      // 4) Push order to Google Sheets
      if (!SHEETS_WEBHOOK_URL) {
        console.warn(
          'GOOGLE_SHEETS_WEBHOOK_URL not set – skipping Google Sheets logging',
        )
      } else {
        try {
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

          // ✅ If this was a custom order, build a readable token summary for Sheets
          // ✅ If this was a custom order, build a readable token summary for Sheets
          let customTokens = ''

          if (customizationData?.customizations?.length) {
            customTokens = customizationData.customizations
              .slice()
              .sort((a, b) => Number(a.tokenId) - Number(b.tokenId))
              .map((c) => `Token #${c.tokenId} ×${c.quantity}`)
              .join(', ')
          }

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
            customTokens,
            customRef,
            customizations,
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
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ received: true }, { status: 500 })
  }
}
