// src/app/api/inventory/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 🔹 Sticker pack & its component price IDs
const PACK_PRICE_ID = 'price_1SSO0a0n54kwZghJjM2dgJBA' // birb Sticker Pack 1

const PACK_COMPONENT_PRICE_IDS = [
  'price_1SSNvA0n54kwZghJiTSORDLI', // birb Logo Sticker
  'price_1SSNvz0n54kwZghJvhG7TsVC', // birb. Sticker
  'price_1SRz6I0n54kwZghJv7x2zRyo', // Head birb Sticker – Mustard
  'price_1SSNuf0n54kwZghJrl0bQDHP', // I ❤️ MB Sticker
  'price_1SSNva0n54kwZghJPTofWD8J', // Toobins Sticker
]

export async function GET() {
  try {
    const rows = await prisma.inventory.findMany({
      include: {
        product: {
          select: {
            priceId: true,
            slug: true,
            name: true,
          },
        },
      },
      orderBy: {
        product: {
          slug: 'asc',
        },
      },
    })

    // 🔹 Build a quick lookup: priceId -> quantity
    const qtyByPriceId = new Map<string, number>()
    for (const row of rows) {
      const pid = row.product?.priceId
      if (!pid) continue
      qtyByPriceId.set(pid, row.quantity)
    }

    // 🔹 Compute pack quantity as min of component quantities
    let packQuantityFromComponents: number | null = null
    {
      const componentQuantities = PACK_COMPONENT_PRICE_IDS.map(
        (pid) => qtyByPriceId.get(pid) ?? 0,
      )

      if (componentQuantities.length > 0) {
        const min = Math.min(...componentQuantities)
        packQuantityFromComponents = Math.max(min, 0)
      }
    }

    return NextResponse.json({
      items: rows.map((row) => {
        const priceId = row.product?.priceId ?? null

        // If this is the pack product, override its quantity with the computed min
        const effectiveQuantity =
          priceId === PACK_PRICE_ID && packQuantityFromComponents !== null
            ? packQuantityFromComponents
            : row.quantity

        return {
          productId: row.productId,
          quantity: effectiveQuantity,
          priceId,
          slug: row.product?.slug ?? null,
          name: row.product?.name ?? null,
        }
      }),
    })
  } catch (err) {
    console.error('Inventory API error', err)
    return NextResponse.json(
      { error: 'Inventory error' },
      { status: 500 },
    )
  }
}
// // src/app/api/inventory/route.ts
// import { NextResponse } from 'next/server'
// import { prisma } from '@/lib/prisma'

// export async function GET() {
//   try {
//     const rows = await prisma.inventory.findMany({
//       include: {
//         product: {
//           select: {
//             priceId: true,
//             slug: true,
//             name: true,
//           },
//         },
//       },
//       orderBy: {
//         product: {
//           slug: 'asc',
//         },
//       },
//     })

//     return NextResponse.json({
//       items: rows.map((row) => ({
//         productId: row.productId,
//         quantity: row.quantity,
//         priceId: row.product?.priceId ?? null,
//         slug: row.product?.slug ?? null,
//         name: row.product?.name ?? null,
//       })),
//     })
//   } catch (err) {
//     console.error('Inventory API error', err)
//     return NextResponse.json(
//       { error: 'Inventory error' },
//       { status: 500 },
//     )
//   }
// }
