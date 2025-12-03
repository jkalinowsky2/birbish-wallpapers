// src/app/api/inventory/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    return NextResponse.json({
      items: rows.map((row) => ({
        productId: row.productId,
        quantity: row.quantity,
        priceId: row.product?.priceId ?? null,
        slug: row.product?.slug ?? null,
        name: row.product?.name ?? null,
      })),
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
//     // Get all products + their inventory record (if any)
//     const products = await prisma.product.findMany({
//       include: { inventory: true },
//     })

//     // Return a simple shape keyed by Stripe priceId
//     const payload = products.map((p) => ({
//       priceId: p.priceId,
//       slug: p.slug,
//       name: p.name,
//       quantity: p.inventory?.quantity ?? 0,
//     }))

//     return NextResponse.json(payload)
//   } catch (err) {
//     console.error('Error in /api/inventory GET:', err)
//     return NextResponse.json(
//       { error: 'Inventory endpoint error' },
//       { status: 500 },
//     )
//   }
// }