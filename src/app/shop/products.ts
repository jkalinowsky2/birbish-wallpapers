// src/app/shop/products.ts

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
    {id: "droobins-sticker",
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

// 🔹 New transfer decals
export const CUSTOM_PRODUCTS: Product[] = [
 {
    id: "my-other-birb",
        name: "Custom 'My Other Birb...' Sticker - 10 Pack",
            priceLabel: "$15.00",
                description: "10 pack of stickers customized for your birb. 3 x 3 inches.",
                    image: "/assets/store/stickers/myotherbirb.png",
                        priceId: "price_1STSql0n54kwZghJct2G53rB-UPDATE", //
                        giftOnly: false,
                        outOfStock: true, 
                        
    },

     {
    id: "square-moonbird",
        name: "Custom Moonbird Square 10 Pack",
            priceLabel: "$12.00",
                description: "10 pack of stickers customized for your birb. 3 x 3 inches.",
                    image: "/assets/store/stickers/tenpack.png",
                        priceId: "price_1STSql0n54kwZghJct2G53rB-UPDATE", //
                        giftOnly: false,
                        outOfStock: true, 
                        
    },
]

// 🔹 Helper that includes *everything* for totals, etc.
export const ALL_PRODUCTS: Product[] = [
    ...STICKER_PRODUCTS,
    ...DECAL_PRODUCTS,
    ...CUSTOM_PRODUCTS,
]

export function getTierForQuantity(product: Product, qty: number): PriceTier | null {
  if (!product.tiers || qty <= 0) return null;

  // ensure tiers sorted by min ascending
  const tiers = [...product.tiers].sort((a, b) => a.minQty - b.minQty);

  // pick the *last* tier whose min <= qty and (max == undefined or qty <= max)
  let chosen: PriceTier | null = null;
  for (const tier of tiers) {
    if (qty >= tier.minQty && (tier.maxQty == null || qty <= tier.maxQty)) {
      chosen = tier;
    }
  }
  return chosen;
}

export function getBaseUnitPrice(product: Product): number {
  return Number(product.priceLabel.replace(/[^0-9.]/g, '')) || 0;
}

export function getTieredUnitPrice(product: Product, qty: number): number {
  const base = getBaseUnitPrice(product);
  const tier = getTierForQuantity(product, qty);
  return tier?.unitPrice ?? base;
}


// TEST CHECKOUT PRICE ID'S - UNCOMMENT BELOW AND COMMENT OUT ABOVE

// export type Product = {
//     id: string;
//     name: string;
//     priceLabel: string;  // human-readable, e.g. "$5.00"
//     description: string;
//     image: string;
//     priceId: string;     // Stripe price ID
//     giftOnly?: boolean
// };

// export const STICKER_PRODUCTS: Product[] = [
//     {
//         id: "logo-sticker",
//         name: "Logo Sticker",
//         priceLabel: "$3.50",
//         description: "Logo Sticker. 3 x 3 inches",
//         image: "/assets/store/stickers/birblogosticker.png",
//         // priceId: "price_1SSNvA0n54kwZghJiTSORDLI", //
//         priceId: "price_1SSKdr14Mz115Jiaesv22eeK", //test

//     },
//     {
//         id: "birb-sticker",
//         name: "birb. Sticker",
//         priceLabel: "$3.50",
//         description: "birb. Sticker. 4 x 2 inches",
//         image: "/assets/store/stickers/birbsticker.png",
//         // priceId: "price_1SSNvz0n54kwZghJvhG7TsVC", //
//         priceId: "price_1SSOKI14Mz115Jias8p53AYV", //test
//     },

//     {
//         id: "head-birb-sticker-must",
//         name: "Head Birb Sticker - Mustard",
//         priceLabel: "$3.50",
//         description: "Head birb sticker in mustard. 2 x 3 inches.",
//         image: "/assets/store/stickers/headbirbsticker-must.png",
//         // priceId: "price_1SRz6I0n54kwZghJv7x2zRyo", //
//         priceId: "price_1SSOML14Mz115JiaLy6zZA5a", //test
//     },
//     {
//         id: "i-love-mb-sticker",
//         name: "I ❤️ MB Sticker",
//         priceLabel: "$3.50",
//         description: "I ❤️ MB sticker. 3 x 3 inches.",
//         image: "/assets/store/stickers/ilovembsticker-pat.png",
//         // priceId: "price_1SSNuf0n54kwZghJrl0bQDHP", //
//         priceId: "price_1SSOM914Mz115JiaQ6FwT8Lh", //test
//     },
//     {
//         id: "toobins-sticker",
//         name: "Toobins Sticker",
//         priceLabel: "$3.50",
//         description: "Toobins sticker. 2 x 2 inches",
//         image: "/assets/store/stickers/toobinssticker.png",
//         // priceId: "price_1SSNva0n54kwZghJPTofWD8J", //
//         priceId: "price_1SSOLi14Mz115JiaUs96IXlh", //test
//     },
//     {
//         id: "droobins-sticker",
//         name: "Droobins Sticker",
//         priceLabel: "$3.50",
//         description: "Droobins sticker. 2 x 2 inches",
//         image: "/assets/store/stickers/droobinssticker.png",
//         // priceId: "price_1SVu470n54kwZghJnRSfukak", //
//         priceId: "price_1SW0pd14Mz115JiaZt5iBOSk", //test


//     },
//     {
//         id: "gm-stickerpack",
//         name: "Sticker Pack 1",
//         priceLabel: "$15.00",
//         description: "Birbs sticker pack - 5 birbish stickers",
//         image: "/assets/store/stickers/stickerpack1.png",
//         // priceId: "price_1SSO0a0n54kwZghJjM2dgJBA", //price_1SSOIE14Mz115JiaVt3sskqi
//         priceId: "price_1SSOIE14Mz115JiaVt3sskqi", //testing price ID
//     },

//     {
//         id: "birb-euro-sticker",
//         name: "birb.  Euro Sticker",
//         priceLabel: "$5.00",
//         description: "birb. Euro sticker. 5 x 3 inches.",
//         image: "/assets/store/stickers/birbeurosticker.png",
//         // priceId: "price_1SRxuC0n54kwZghJqVLWMmbI", //
//         priceId: "price_1STXcv14Mz115JiauynzDoBI", //test

//     },
//     {
//         id: "birb-sticker-holo",
//         name: "Holographic Logo Sticker",
//         priceLabel: "$5.00",
//         description: "Free for Moonbirds holders w/ $10 purchase *",
//         image: "/assets/store/stickers/birblogosticker-holo.png",
//         // priceId: "price_1STSql0n54kwZghJct2G53rB", //
//         priceId: "price_1SSifY14Mz115JiadL5lXegX", // testing price ID
        
//         giftOnly: true,
//     },
// ];


// // 🔹 New transfer decals
// export const DECAL_PRODUCTS: Product[] = [
//     {
//         id: 'birblogodecal',
//         name: 'birb logo transfer',
//         // priceId: 'price_1SUpO80n54kwZghJuaX7XhLx',        // Live
//         priceId: 'price_1SUpEv14Mz115JiaLjZ5awBJ',        // Testing price ID
//         priceLabel: '$6.50',
//         image: '/assets/store/decals/birblogodecal.png',
//         description: 'Cream logo transfer sticker. 3 x 3 inches',
//     },
// ]
// // 🔹 Helper that includes *everything* for totals, etc.
// export const ALL_PRODUCTS: Product[] = [
//     ...STICKER_PRODUCTS,
//     ...DECAL_PRODUCTS,
// ]

