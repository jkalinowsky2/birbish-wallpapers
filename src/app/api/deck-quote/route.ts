// app/api/deck-quote/route.ts
import { NextRequest, NextResponse } from 'next/server'

const APPS_SCRIPT_WEBHOOK_URL = process.env.DECK_QUOTE_WEBHOOK_URL

export async function POST(req: NextRequest) {
  try {
    if (!APPS_SCRIPT_WEBHOOK_URL) {
      console.error('Missing DECK_QUOTE_WEBHOOK_URL env var')
      return NextResponse.json(
        { error: 'Server not configured for quotes' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { email, topPng, bottomPng } = body

    if (!email || !topPng || !bottomPng) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Forward to Apps Script
    const gsRes = await fetch(APPS_SCRIPT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Apps Script is fine with normal JSON POST
    })

    if (!gsRes.ok) {
      const text = await gsRes.text().catch(() => '')
      console.error('Apps Script error:', gsRes.status, text)
      return NextResponse.json(
        { error: 'Failed to log quote' },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('deck-quote API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}