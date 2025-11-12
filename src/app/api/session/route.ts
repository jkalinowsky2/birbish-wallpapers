// src/app/api/session/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const s = await stripe.checkout.sessions.retrieve(id)
  return NextResponse.json({
    id: s.id,
    gift_holo: s.metadata?.gift_holo ?? 'no',
    gift_wallet: s.metadata?.gift_wallet ?? '',
  })
}