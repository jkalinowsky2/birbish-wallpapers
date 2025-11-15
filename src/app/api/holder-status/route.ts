// src/app/api/holder-status/route.ts
import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { kv } from '@vercel/kv'

const MOONBIRDS = '0x23581767a106ae21c074b2276d25e5c3e136a68b' as const
const ABI = ['function balanceOf(address owner) view returns (uint256)']
const RPC = process.env.ETH_MAINNET_RPC

const GIFT_CAP = 50 // total holo stickers

export async function POST(req: Request) {
  try {
    const { address } = (await req.json()) as { address?: string }
    const addr = address?.toLowerCase()

    // Default response shape
    let isHolder = false

    // ---- DEV override (still works) ----
    if (process.env.FORCE_HOLDER === 'true') {
      isHolder = true
    } else {
      if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
        return NextResponse.json({
          isHolder: false,
          hasClaimedGift: false,
          remainingGifts: GIFT_CAP,
        })
      }

      if (!RPC) throw new Error('ETH_MAINNET_RPC is not set')

      const provider = new ethers.JsonRpcProvider(RPC)
      const c = new ethers.Contract(MOONBIRDS, ABI, provider)
      const bal: bigint = await c.balanceOf(addr)
      isHolder = bal > 0n
    }

    // Read KV for claim status & count (non-blocking-ish)
    let hasClaimedGift = false
    let remainingGifts = GIFT_CAP

    if (addr) {
      const [claimed, countRaw] = await Promise.all([
        kv.get<string | null>(`gift_claimed:${addr}`),
        kv.get<number | null>('gift_count'),
      ])

      hasClaimedGift = !!claimed
      const count = typeof countRaw === 'number' ? countRaw : 0
      remainingGifts = Math.max(0, GIFT_CAP - count)
    }

    return NextResponse.json({
      isHolder,
      hasClaimedGift,
      remainingGifts,
    })
  } catch (err) {
    console.error('[holder-status] error:', err)
    // Fail closed: not holder, no gift info
    return NextResponse.json(
      { isHolder: false, hasClaimedGift: false, remainingGifts: 0 },
      { status: 200 },
    )
  }
}