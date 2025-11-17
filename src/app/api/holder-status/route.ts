// src/app/api/holder-status/route.ts
import { NextResponse } from 'next/server'
import { JsonRpcProvider, Contract } from 'ethers'
import { kv } from '@vercel/kv'

const MOONBIRDS = (process.env.MOONBIRDS_CONTRACT ??
  '0x23581767a106ae21c074b2276D25e5C3e136a68b') as string

const ABI = ['function balanceOf(address owner) view returns (uint256)']

const RPC = process.env.ETH_MAINNET_RPC
const FREE_GIFT_MAX = Number(process.env.FREE_GIFT_MAX ?? '50')

// Delegate.xyz
const DELEGATE_API_BASE = 'https://api.delegate.xyz/registry/v2'
const DELEGATE_API_KEY = process.env.DELEGATE_API_KEY

function normalizeAddress(addr: string): string {
  return addr.toLowerCase()
}

function isValidAddress(addr: string | undefined): addr is string {
  return !!addr && /^0x[a-fA-F0-9]{40}$/.test(addr)
}

async function getProvider() {
  if (!RPC) {
    throw new Error('ETH_MAINNET_RPC is not set')
  }
  return new JsonRpcProvider(RPC)
}

/**
 * Check if this address directly holds any Moonbirds.
 */
async function checkDirectHolder(address: string): Promise<boolean> {
  const provider = await getProvider()
  const contract = new Contract(MOONBIRDS, ABI, provider)
  const bal = (await contract.balanceOf(address)) as bigint
  return bal > 0n
}

/**
 * Ask Delegate.xyz for delegations involving this wallet and return
 * the vault (cold) wallets that have delegated rights to this wallet
 * for Moonbirds (ALL or CONTRACT-level delegations).
 */
async function getDelegatedVaults(delegate: string): Promise<string[]> {
  const url = `${DELEGATE_API_BASE}/${delegate}?chainId=1`

  const headers: Record<string, string> = {}
  if (DELEGATE_API_KEY) {
    headers['X-API-KEY'] = DELEGATE_API_KEY
  }

  const res = await fetch(url, { headers, cache: 'no-store' })
  if (!res.ok) {
    console.warn('[holder-status] Delegate.xyz request failed:', res.status)
    return []
  }

  type Delegation = {
    type: 'NONE' | 'ALL' | 'CONTRACT' | 'TOKEN'
    from: string
    to: string
    contract: string | null
    tokenId: number | null
  }

  const data = (await res.json()) as Delegation[]

  const result = new Set<string>()
  for (const d of data) {
    // We only care about delegations where THIS wallet is the delegate ("to")
    if (normalizeAddress(d.to) !== delegate) continue

    // Accept:
    //  - type ALL (entire wallet)
    //  - type CONTRACT for Moonbirds contract
    const isAll = d.type === 'ALL'
    const isContractMoonbirds =
      d.type === 'CONTRACT' &&
      d.contract &&
      normalizeAddress(d.contract) === normalizeAddress(MOONBIRDS)

    if (isAll || isContractMoonbirds) {
      result.add(normalizeAddress(d.from)) // vault / cold wallet
    }
  }

  return Array.from(result)
}

/**
 * Check if this wallet is a DELEGATE for any Moonbirds-holding vaults.
 */
async function checkDelegatedHolder(delegate: string): Promise<boolean> {
  try {
    const vaults = await getDelegatedVaults(delegate)
    if (!vaults.length) return false

    const provider = await getProvider()
    const contract = new Contract(MOONBIRDS, ABI, provider)

    for (const vault of vaults) {
      try {
        const bal = (await contract.balanceOf(vault)) as bigint
        if (bal > 0n) {
          return true
        }
      } catch (err) {
        console.warn('[holder-status] Error checking vault balance', vault, err)
      }
    }

    return false
  } catch (err) {
    console.error('[holder-status] checkDelegatedHolder error:', err)
    // On error, we just say "not delegated holder" instead of failing outright
    return false
  }
}

export async function POST(req: Request) {
  try {
    const { address } = (await req.json()) as { address?: string }

    // Force flag for easy testing
    if (process.env.FORCE_HOLDER === 'true') {
      // Still return KV info for UI
      const wallet = address && isValidAddress(address)
        ? normalizeAddress(address)
        : '0x0000000000000000000000000000000000000000'

      const claimedKey = `gift_claimed:${wallet}`
      const claimedRaw = await kv.get<string | null>(claimedKey)
      const countRaw = await kv.get<number>('gift_count')

      const hasClaimedGift = !!claimedRaw
      const used = typeof countRaw === 'number' ? countRaw : 0
      const remainingGifts = Math.max(0, FREE_GIFT_MAX - used)

      return NextResponse.json({
        isHolder: true,
        hasClaimedGift,
        remainingGifts,
      })
    }

    if (!isValidAddress(address)) {
      return NextResponse.json(
        { isHolder: false, hasClaimedGift: false, remainingGifts: FREE_GIFT_MAX },
        { status: 200 },
      )
    }

    const wallet = normalizeAddress(address)

    // 1) Direct ownership check
    let isHolder = await checkDirectHolder(wallet)

    // 2) If not, see if this wallet is a delegate for a Moonbirds-holding vault
    if (!isHolder) {
      isHolder = await checkDelegatedHolder(wallet)
    }

    // 3) KV: check if this wallet has already claimed the gift
    const claimedKey = `gift_claimed:${wallet}`
    const claimedRaw = await kv.get<string | null>(claimedKey)
    const countRaw = await kv.get<number>('gift_count')

    const hasClaimedGift = !!claimedRaw
    const used = typeof countRaw === 'number' ? countRaw : 0
    const remainingGifts = Math.max(0, FREE_GIFT_MAX - used)

    return NextResponse.json({
      isHolder,
      hasClaimedGift,
      remainingGifts,
    })
  } catch (err) {
    console.error('[holder-status] error:', err)
    // Fail "closed": not a holder and no gift info
    return NextResponse.json(
      {
        isHolder: false,
        hasClaimedGift: false,
        remainingGifts: FREE_GIFT_MAX,
      },
      { status: 200 },
    )
  }
}

// // src/app/api/holder-status/route.ts
// import { NextResponse } from 'next/server'
// import { ethers } from 'ethers'
// import { kv } from '@vercel/kv'

// const MOONBIRDS = '0x23581767a106ae21c074b2276d25e5c3e136a68b' as const
// const ABI = ['function balanceOf(address owner) view returns (uint256)']
// const RPC = process.env.ETH_MAINNET_RPC

// const GIFT_CAP = 50 // total holo stickers

// export async function POST(req: Request) {
//   try {
//     const { address } = (await req.json()) as { address?: string }
//     const addr = address?.toLowerCase()

//     // Default response shape
//     let isHolder = false

//     // ---- DEV override (still works) ----
//     if (process.env.FORCE_HOLDER === 'true') {
//       isHolder = true
//     } else {
//       if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
//         return NextResponse.json({
//           isHolder: false,
//           hasClaimedGift: false,
//           remainingGifts: GIFT_CAP,
//         })
//       }

//       if (!RPC) throw new Error('ETH_MAINNET_RPC is not set')

//       const provider = new ethers.JsonRpcProvider(RPC)
//       const c = new ethers.Contract(MOONBIRDS, ABI, provider)
//       const bal: bigint = await c.balanceOf(addr)
//       isHolder = bal > 0n
//     }

//     // Read KV for claim status & count (non-blocking-ish)
//     let hasClaimedGift = false
//     let remainingGifts = GIFT_CAP

//     if (addr) {
//       const [claimed, countRaw] = await Promise.all([
//         kv.get<string | null>(`gift_claimed:${addr}`),
//         kv.get<number | null>('gift_count'),
//       ])

//       hasClaimedGift = !!claimed
//       const count = typeof countRaw === 'number' ? countRaw : 0
//       remainingGifts = Math.max(0, GIFT_CAP - count)
//     }

//     return NextResponse.json({
//       isHolder,
//       hasClaimedGift,
//       remainingGifts,
//     })
//   } catch (err) {
//     console.error('[holder-status] error:', err)
//     // Fail closed: not holder, no gift info
//     return NextResponse.json(
//       { isHolder: false, hasClaimedGift: false, remainingGifts: 0 },
//       { status: 200 },
//     )
//   }
// }