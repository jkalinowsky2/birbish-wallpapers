// src/app/shop/products.ts

export type Product = {
    id: string;
    name: string;
    priceLabel: string;  // human-readable, e.g. "$5.00"
    description: string;
    image: string;
    priceId: string;     // Stripe price ID
    giftOnly?: boolean
};

export const STICKER_PRODUCTS: Product[] = [
    {
        id: "logo-sticker",
        name: "Logo Sticker",
        priceLabel: "$3.50",
        description: "Logo Sticker. 3 x 3 inches",
        image: "/assets/store/stickers/birblogosticker.png",
        priceId: "price_1SSNvA0n54kwZghJiTSORDLI", //
    

    },
    {
        id: "birb-sticker",
        name: "birb. Sticker",
        priceLabel: "$3.50",
        description: "birb. Sticker. 4 x 2 inches",
        image: "/assets/store/stickers/birbsticker.png",
        priceId: "price_1SSNvz0n54kwZghJvhG7TsVC", //

    },

    {
        id: "head-birb-sticker-must",
        name: "Head Birb Sticker - Mustard",
        priceLabel: "$3.50",
        description: "Head birb sticker in mustard. 2 x 3 inches.",
        image: "/assets/store/stickers/headbirbsticker-must.png",
        priceId: "price_1SRz6I0n54kwZghJv7x2zRyo", //

    },
    {
        id: "i-love-mb-sticker",
        name: "I ❤️ MB Sticker",
        priceLabel: "$3.50",
        description: "I ❤️ MB sticker. 3 x 3 inches.",
        image: "/assets/store/stickers/ilovembsticker-pat.png",
        priceId: "price_1SSNuf0n54kwZghJrl0bQDHP", //

    },
    {
        id: "toobins-sticker",
        name: "Toobins Sticker",
        priceLabel: "$3.50",
        description: "Toobins sticker. 2 x 2 inches",
        image: "/assets/store/stickers/toobinssticker.png",
        priceId: "price_1SSNva0n54kwZghJPTofWD8J", //

    },
    {id: "droobins-sticker",
    name: "Droobins Sticker",
    priceLabel: "$3.50",
    description: "Droobins sticker. 2 x 2 inches",
    image: "/assets/store/stickers/droobinssticker.png",
    priceId: "price_1SVu470n54kwZghJnRSfukak", //

    },
{
    id: "gm-stickerpack",
        name: "Sticker Pack 1",
            priceLabel: "$15.00",
                description: "Birbs sticker pack - 5 birbish stickers",
                    image: "/assets/store/stickers/stickerpack1.png",
                        priceId: "price_1SSO0a0n54kwZghJjM2dgJBA", //

    },

{
    id: "birb-euro-sticker",
        name: "birb.  Euro Sticker",
            priceLabel: "$5.00",
                description: "birb. Euro sticker. 5 x 3 inches.",
                    image: "/assets/store/stickers/birbeurosticker.png",
                        priceId: "price_1SRxuC0n54kwZghJqVLWMmbI", //


    },
{
    id: "birb-sticker-holo",
        name: "Holographic Logo Sticker",
            priceLabel: "$5.00",
                description: "Free for Moonbirds holders w/ $10 purchase *",
                    image: "/assets/store/stickers/birblogosticker-holo.png",
                        priceId: "price_1STSql0n54kwZghJct2G53rB", //
                        giftOnly: true,
                        
    },
];


// 🔹 New transfer decals
export const DECAL_PRODUCTS: Product[] = [
    {
        id: 'birblogodecal',
        name: 'birb logo transfer',
        priceId: 'price_1SUpO80n54kwZghJuaX7XhLx',        // Live
        priceLabel: '$6.50',
        image: '/assets/store/decals/birblogodecal.png',
        description: 'Cream logo transfer sticker. 3 x 3 inches',
    },
]

// 🔹 Helper that includes *everything* for totals, etc.
export const ALL_PRODUCTS: Product[] = [
    ...STICKER_PRODUCTS,
    ...DECAL_PRODUCTS,
]



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

