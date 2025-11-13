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

export const PRODUCTS: Product[] = [
    {
        id: "logo-sticker",
        name: "Logo Sticker",
        priceLabel: "$3.50",
        description: "Logo Sticker. 3 x 3 inches",
        image: "/assets/store/stickers/birblogosticker.png",
        priceId: "price_1SSKdr14Mz115Jiaesv22eeK", //test
        //priceId: "price_1SSNvA0n54kwZghJiTSORDLI", //live

    },
    {
        id: "birb-sticker",
        name: "birb. Sticker",
        priceLabel: "$3.50",
        description: "birb. Sticker. 2 x 4 inches",
        image: "/assets/store/stickers/birbsticker.png",
        priceId: "price_1SSOKI14Mz115Jias8p53AYV", //price_1SSNvz0n54kwZghJvhG7TsVC
    },

    {
        id: "head-birb-sticker-must",
        name: "Head Birb Sticker - Mustard",
        priceLabel: "$3.50",
        description: "Head birb sticker in mustard. 2 x 3 inches.",
        image: "/assets/store/stickers/headbirbsticker-must.png",
        priceId: "price_1SSOML14Mz115JiaLy6zZA5a", //price_1SRz6I0n54kwZghJv7x2zRyo
    },
    {
        id: "i-love-mb-sticker",
        name: "I ❤️ MB Sticker",
        priceLabel: "$3.50",
        description: "I ❤️ MB sticker. 3 x 3 inches.",
        image: "/assets/store/stickers/ilovembsticker.png",
        priceId: "price_1SSOM914Mz115JiaQ6FwT8Lh", //price_1SSNuf0n54kwZghJrl0bQDHP
    },
    {
        id: "toobins-sticker",
        name: "Toobins Sticker",
        priceLabel: "$3.50",
        description: "Toobins sticker. 2 x 3 inches",
        image: "/assets/store/stickers/toobinssticker.png",
        priceId: "price_1SSOLi14Mz115JiaUs96IXlh", //price_1SSNva0n54kwZghJPTofWD8J
    },
    {
        id: "gm-stickerpack",
        name: "Sticker Pack 1",
        priceLabel: "$15.00",
        description: "Birbs sticker sack - 5 birbish stickers",
        image: "/assets/store/stickers/stickerpack1.png",
        priceId: "price_1SSOIE14Mz115JiaVt3sskqi", //price_1SSO0a0n54kwZghJjM2dgJBA
    },

    {
        id: "birb-euro-sticker",
        name: "birb.  Euro Sticker",
        priceLabel: "$7.00",
        description: "Classic birb. Euro sticker. 6 x 3.5 inches.",
        image: "/assets/store/stickers/birbeurosticker.png",
        priceId: "price_1SSOMa14Mz115JiaaYaEHJDB", //price_1SRxuC0n54kwZghJqVLWMmbI

    },
    {
        id: "birb-sticker-holo",
        name: "Holographic Logo Sticker",
        priceLabel: "$5.00",
        description: "Free for Moonbirds holders w/ $10 purchase *",
        image: "/assets/store/stickers/birblogosticker-holo.png",
        priceId: "price_1SSifY14Mz115JiadL5lXegX", //price_1SSNvz0n54kwZghJvhG7TsVC
        giftOnly: true,
    },
];

// {
//     id: "head-birb-sticker-org",
//     name: "Head Birb Sticker - Orange",
//     priceLabel: "$5.00",
//     description: "Head birb sticker in orange. 2 x 3 inches.",
//     image: "/assets/store/stickers/headbirbsticker-org.png",
//     priceId: "price3",
// },
// {
//     id: "dont-toob-sticker",
//     name: "Don't Toob Sticker",
//     priceLabel: "$5.00",
//     description: "Don't Toob On Me sticker. 3 x 3 inches",
//     image: "/assets/store/stickers/donttoobsticker.png",
//     priceId: "price7",
// },

// {
//     id: "Birb-sticker-red",
//     name: "Birb Sticker",
//     priceLabel: "$3.00",
//     description: "Birb sticker. 2 x 3 inches",
//     image: "/assets/store/stickers/birbsticker-red.png",
//     priceId: "price9",
// },

// {
//     id: "gm-sticker",
//     name: "GM Sticker",
//     priceLabel: "$3.00",
//     description: "Generational Merch sticker. 3 x 3 inches",
//     image: "/assets/store/stickers/gmsticker.png",
//     priceId: "price8",
// },

