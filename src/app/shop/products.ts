// src/app/shop/products.ts
export type CustomCollectionKey = 'moonbirds' | 'mythics' | 'oddities' | 'glyders'
export type Product = {
  id: string;
  name: string;
  priceLabel: string;  // human-readable, e.g. "$5.00"
  description: string;
  image: string;
  priceId: string;     // Stripe price ID
  giftOnly?: boolean
  outOfStock?: boolean;
  tiers?: PriceTier[]
  customCollection?: CustomCollectionKey
};

export type PriceTier = {
  minQty: number;          // inclusive
  maxQty?: number;         // inclusive; if omitted, means "no upper limit"
  unitPrice: number;    // price per sticker in this tier
  priceId: string;      // Stripe price for this tier
};




export const STICKER_PRODUCTS: Product[] = [
  {
    id: "logo-sticker",
    name: "birb Logo Sticker",
    priceLabel: "$3.50",
    description: "Logo Sticker. 3 x 3 inches",
    image: "/assets/store/stickers/birblogosticker.png",
    priceId: "price_1SSNvA0n54kwZghJiTSORDLI", //
    outOfStock: false,
    tiers: [
      {
        minQty: 1,
        maxQty: 5,
        unitPrice: 3.5,
        priceId: "price_1SRz6I0n54kwZghJv7x2zRyo",
      },
      {
        minQty: 6,
        unitPrice: 3.0,
        priceId: "price_1SeKfE0n54kwZghJx584kL6V",
      },
    ],


  },
  {
    id: "birb-sticker",
    name: "birb. Sticker",
    priceLabel: "$3.50",
    description: "birb. Sticker. 4 x 2 inches",
    image: "/assets/store/stickers/birbsticker.png",
    priceId: "price_1SSNvz0n54kwZghJvhG7TsVC", //
    outOfStock: false,
    tiers: [
      {
        minQty: 1,
        maxQty: 5,
        unitPrice: 3.5,
        priceId: "price_1SSNvz0n54kwZghJvhG7TsVC",
      },
      {
        minQty: 6,
        unitPrice: 3.0,
        priceId: "price_1SeL1w0n54kwZghJe3S0flbt", // ← replace with your real bulk price ID
      },
    ],

  },

  // {
  //     id: "head-birb-sticker-must",
  //     name: "Head birb Sticker - Mustard",
  //     priceLabel: "$3.50",
  //     description: "Head birb sticker in mustard. 2 x 3 inches.",
  //     image: "/assets/store/stickers/headbirbsticker-must.png",
  //     priceId: "price_1SRz6I0n54kwZghJv7x2zRyo", //
  //     outOfStock: false, 

  // },
  {
    id: "head-birb-sticker-must",
    name: "Head birb Sticker - Mustard",
    priceLabel: "$3.50", // you can change this to "From $2.50" if you want
    description: "Head birb sticker in mustard. 2 x 3 inches.",
    image: "/assets/store/stickers/headbirbsticker-must.png",
    priceId: "price_1SRz6I0n54kwZghJv7x2zRyo",
    outOfStock: false,
    tiers: [
      {
        minQty: 1,
        maxQty: 5,
        unitPrice: 3.5,
        priceId: "price_1SRz6I0n54kwZghJv7x2zRyo",
      },
      {
        minQty: 6,
        unitPrice: 3.0,
        priceId: "price_1Sc8kS0n54kwZghJ5wDg6g94", // ← replace with your real bulk price ID
      },
    ],

  },
  {
    id: "i-love-mb-sticker",
    name: "I ❤️ MB Sticker",
    priceLabel: "$3.50",
    description: "I ❤️ MB sticker. 3 x 3 inches.",
    image: "/assets/store/stickers/ilovembsticker-pat.png",
    priceId: "price_1SSNuf0n54kwZghJrl0bQDHP", //
    outOfStock: false,

  },
  {
    id: "toobins-sticker",
    name: "Toobins Sticker",
    priceLabel: "$3.50",
    description: "Toobins sticker. 2 x 2 inches",
    image: "/assets/store/stickers/toobinssticker.png",
    priceId: "price_1SSNva0n54kwZghJPTofWD8J", //
    outOfStock: false,
    tiers: [
      {
        minQty: 1,
        maxQty: 5,
        unitPrice: 3.5,
        priceId: "price_1SSNva0n54kwZghJPTofWD8J",
      },
      {
        minQty: 6,
        unitPrice: 3.0,
        priceId: "price_1SeL130n54kwZghJfcngSyk6", // ← replace with your real bulk price ID
      },
    ],


  },
  {
    id: "droobins-sticker",
    name: "Droobins Sticker",
    priceLabel: "$3.50",
    description: "Droobins sticker. 2 x 2 inches",
    image: "/assets/store/stickers/droobinssticker.png",
    priceId: "price_1SVu470n54kwZghJnRSfukak", //
    outOfStock: false,

  },
  {
    id: "gm-stickerpack",
    name: "birb Sticker Pack 1",
    priceLabel: "$15.00",
    description: "Birbs sticker pack - 5 birbish stickers",
    image: "/assets/store/stickers/stickerpack1.png",
    priceId: "price_1SSO0a0n54kwZghJjM2dgJBA", //
    outOfStock: false,

  },

  {
    id: "birb-euro-sticker",
    name: "birb. Euro Sticker",
    priceLabel: "$5.00",
    description: "birb. Euro sticker. 5 x 3 inches.",
    image: "/assets/store/stickers/birbeurosticker.png",
    priceId: "price_1SgPeq0n54kwZghJSPoehneW", //
    outOfStock: false,


  },
  {
    id: "birb-sticker-holo",
    name: "Holographic birb Logo Sticker",
    priceLabel: "$5.00",
    description: "Free for Moonbirds holders w/ $10 purchase *",
    image: "/assets/store/stickers/birblogosticker-holo.png",
    priceId: "price_1STSql0n54kwZghJct2G53rB", //
    giftOnly: true,
    outOfStock: false,

  },


];


// 🔹 New transfer decals
export const DECAL_PRODUCTS: Product[] = [
  {
    id: 'birblogodecal',
    name: 'birb Logo Transfer Sticker',
    priceId: 'price_1SUpO80n54kwZghJuaX7XhLx',        // Live
    priceLabel: '$6.50',
    image: '/assets/store/decals/birblogodecal.png',
    description: 'Cream logo transfer sticker. 3 x 3 inches',
    outOfStock: false,
  },
]

// 🔹 New customized stickers
export const CUSTOM_PRODUCTS: Product[] = [
  {
    id: "square-moonbird",
    name: "Custom Moonbird Sticker",
    priceLabel: "$1.50",
    description: "Custom sticker 1.5 x 1.5 inches",
    image: "/assets/store/stickers/moonbirdsten.png",
    priceId: "price_1So4sv0n54kwZghJcWiv784r",
    giftOnly: false,
    outOfStock: false,
    customCollection: "moonbirds",
    tiers: [
      { minQty: 1, maxQty: 9, unitPrice: 1.50, priceId: "price_1So4sv0n54kwZghJcWiv784r" },
      { minQty: 10, maxQty: 19, unitPrice: 1.25, priceId: "price_1So4zP0n54kwZghJTuBXMVxR" },
      { minQty: 20, unitPrice: 1.00, priceId: "price_1So4zP0n54kwZghJqQDv5G50" },
    ],
  },

  {
    id: "square-oddity",
    name: "Custom Oddity Sticker",
    priceLabel: "$1.50",
    description: "Custom sticker 1.5 x 1.5 inches",
    image: "/assets/store/stickers/oddityten.png",
    priceId: "price_1So4sv0n54kwZghJcWiv784r", //
    giftOnly: false,
    outOfStock: false,
    customCollection: 'oddities',
    tiers: [
      { minQty: 1, maxQty: 9, unitPrice: 1.50, priceId: "price_1So4sv0n54kwZghJcWiv784r" },
      { minQty: 10, maxQty: 19, unitPrice: 1.25, priceId: "price_1So4zP0n54kwZghJTuBXMVxR" },
      { minQty: 20, unitPrice: 1.00, priceId: "price_1So4zP0n54kwZghJqQDv5G50" },
    ],

  },

  {
    id: "square-mythic",
    name: "Custom Mythic Sticker",
    priceLabel: "$1.25",
    description: "Custom sticker 1.5 x 1.5 inches",
    image: "/assets/store/stickers/mythicsten.png",
    priceId: "price_1So4sv0n54kwZghJcWiv784r", //
    giftOnly: false,
    outOfStock: false,
    customCollection: 'mythics',
    tiers: [
      { minQty: 1, maxQty: 9, unitPrice: 1.50, priceId: "price_1So4sv0n54kwZghJcWiv784r" },
      { minQty: 10, maxQty: 19, unitPrice: 1.25, priceId: "price_1So4zP0n54kwZghJTuBXMVxR" },
      { minQty: 20, unitPrice: 1.00, priceId: "price_1So4zP0n54kwZghJqQDv5G50" },
    ],

  },


  {
    id: "square-glyder",
    name: "Custom NightGlyder Sticker",
    priceLabel: "",
    description: "Custom sticker 1.5 x 1.5 inches",
    image: "/assets/store/stickers/glydersten.png",
    priceId: "price_1SicHw0n54kwZghJ9xL1JiGl_UPDATE", //
    giftOnly: false,
    outOfStock: true,
    customCollection: 'glyders',

  },
]

// 🔹 Helper that includes *everything* for totals, etc.
export const ALL_PRODUCTS: Product[] = [
  ...STICKER_PRODUCTS,
  ...DECAL_PRODUCTS,
  ...CUSTOM_PRODUCTS,
]

export function getTierForQuantity(product: Product, qty: number): PriceTier | null {
  if (!product.tiers || qty <= 0) return null

  const tiers = [...product.tiers].sort((a, b) => a.minQty - b.minQty)

  // Choose the last tier where qty >= minQty AND (no max OR qty <= max)
  for (let i = tiers.length - 1; i >= 0; i--) {
    const t = tiers[i]
    if (qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty)) return t
  }

  // If nothing matches because of a gap, fall back to the best minQty <= qty
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (qty >= tiers[i].minQty) return tiers[i]
  }

  return null
}

export function getBaseUnitPrice(product: Product): number {
  return Number(product.priceLabel.replace(/[^0-9.]/g, '')) || 0;
}

export function getTieredUnitPrice(product: Product, qty: number): number {
  const base = getBaseUnitPrice(product);
  const tier = getTierForQuantity(product, qty);
  return tier?.unitPrice ?? base;
}



