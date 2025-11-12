// src/app/api/holder-status/route.ts
import { NextResponse } from 'next/server'
import { JsonRpcProvider, Contract } from 'ethers'

const MOONBIRDS = '0x23581767a106ae21c074b2276d25e5c3e136a68b' as const
const ABI = ['function balanceOf(address owner) view returns (uint256)']
const RPC = process.env.ETH_MAINNET_RPC

export async function POST(req: Request) {
  try {
    const { address } = (await req.json()) as { address?: string }

    if (process.env.FORCE_HOLDER === 'true')
      return NextResponse.json({ isHolder: true, reason: 'forced' })

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address))
      return NextResponse.json({ isHolder: false, reason: 'bad_address' })

    if (!RPC)
      return NextResponse.json({ isHolder: false, reason: 'no_rpc_env' })

    const provider = new JsonRpcProvider(RPC)
    const contract = new Contract(MOONBIRDS, ABI, provider)

    const bal = (await contract.balanceOf(address)) as bigint
    return NextResponse.json({
      isHolder: bal > 0n,
      balance: bal.toString(),
      reason: bal > 0n ? 'owns_token' : 'zero_balance',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ isHolder: false, error: msg })
  }
}

// import { NextResponse } from 'next/server'
// import { ethers } from 'ethers'

// // Moonbirds ERC-721 contract
// const MOONBIRDS_CONTRACT = '0x23581767a106ae21c074b2276d25e5c3e136a68b' as const
// const ABI = ['function balanceOf(address owner) view returns (uint256)']

// // Expected: set this in .env.local → ETH_MAINNET_RPC=<your Alchemy or Infura HTTPS URL>
// const RPC_URL = process.env.ETH_MAINNET_RPC

// export async function POST(req: Request) {
//     try {
//         const { address } = (await req.json()) as { address?: string }

//         // ✅ Optional override for testing — add FORCE_HOLDER=true in .env.local
//         if (process.env.FORCE_HOLDER === 'true') {
//             return NextResponse.json({ isHolder: true })
//         }

//         if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
//             return NextResponse.json({ isHolder: false }, { status: 200 })
//         }

//         if (!RPC_URL) {
//             throw new Error('ETH_MAINNET_RPC is not set in environment variables')
//         }

//         // ✅ ethers v5 syntax
//         const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
//         const contract = new ethers.Contract(MOONBIRDS_CONTRACT, ABI, provider)
//         const balance = await contract.balanceOf(address)

//         // ethers v5 returns a BigNumber → use .gt(0)
//         const isHolder = balance.gt(0)

//         return NextResponse.json({ isHolder })
//     } catch (err) {
//         console.error('Holder check error:', err)
//         // fail closed
//         return NextResponse.json({ isHolder: false }, { status: 200 })
//     }
// }