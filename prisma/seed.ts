// prisma/seed.ts
import { prisma } from '../src/lib/prisma'

async function main() {
    // --- Define your current products ---
    const products = [
        {
            slug: "logo-sticker",
            name: "birb Logo Sticker",
            priceId: "price_1SSNvA0n54kwZghJiTSORDLI",
            description: "Logo Sticker. 3 x 3 inches.",
            image: "/assets/store/stickers/birblogosticker.png",
            price: 3.5,
            quantity: 14,  // update as needed
        },
        {
            slug: "birb-sticker",
            name: "birb. Sticker",
            priceId: "price_1SSNvz0n54kwZghJvhG7TsVC",
            description: "birb. Sticker. 4 x 2 inches.",
            image: "/assets/store/stickers/birbsticker.png",
            price: 3.5,
            quantity: 16,
        },
        {
            slug: "head-birb-sticker-mustard",
            name: "Head birb Sticker – Mustard",
            priceId: "price_1SRz6I0n54kwZghJv7x2zRyo",
            description: "Head birb sticker in mustard. 2 x 3 inches.",
            image: "/assets/store/stickers/headbirbsticker-must.png",
            price: 3.5,
            quantity: 14,
        },
        {
            slug: "i-love-mb-sticker",
            name: "I ❤️ MB Sticker",
            priceId: "price_1SSNuf0n54kwZghJrl0bQDHP",
            description: "I ❤️ MB sticker. 3 x 3 inches.",
            image: "/assets/store/stickers/ilovembsticker-pat.png",
            price: 3.5,
            quantity: 7,
        },
        {
            slug: "toobins-sticker",
            name: "Toobins Sticker",
            priceId: "price_1SSNva0n54kwZghJPTofWD8J",
            description: "Toobins sticker. 2 x 2 inches.",
            image: "/assets/store/stickers/toobinssticker.png",
            price: 3.5,
            quantity: 14,
        },
        {
            slug: "droobins-sticker",
            name: "Droobins Sticker",
            priceId: "price_1SVu470n54kwZghJnRSfukak",
            description: "Droobins sticker. 2 x 2 inches.",
            image: "/assets/store/stickers/droobinssticker.png",
            price: 3.5,
            quantity: 6,
        },
        {
            slug: "gm-stickerpack",
            name: "birb Sticker Pack 1",
            priceId: "price_1SSO0a0n54kwZghJjM2dgJBA",
            description: "Birbs sticker pack – 5 birbish stickers.",
            image: "/assets/store/stickers/stickerpack1.png",
            price: 15.0,
            quantity: 5,
        },
        {
            slug: "birb-euro-sticker",
            name: "birb. Euro Sticker",
            priceId: "price_1SRxuC0n54kwZghJqVLWMmbI",
            description: "birb. Euro sticker. 5 x 3 inches.",
            image: "/assets/store/stickers/birbeurosticker.png",
            price: 5.0,
            quantity: 6,
        },
        {
            slug: "holo-birb-logo",
            name: "Holographic birb Logo Sticker",
            priceId: "price_1STSql0n54kwZghJct2G53rB",
            description: "Free for Moonbirds holders w/ $10 purchase.",
            image: "/assets/store/stickers/birblogosticker-holo.png",
            price: 5.0,
            quantity: 5,   // or whatever you actually have
        },
        {
            slug: "my-other-birb-custom-10-pack",
            name: "Custom 'My Other Birb...' Sticker – 10 Pack",
            priceId: "price_1STSql0n54kwZghJct2G53rB-UPDATE",
            description: "10 pack of customizable bird-themed stickers. 3 x 3 inches.",
            image: "/assets/store/stickers/myotherbirb.png",
            price: 32.0,
            quantity: 10,
        },

        {
            slug: "birblogodecal",
            name: "birb Logo Transfer Sticker",
            priceId: "price_1SUpO80n54kwZghJuaX7XhLx",
            description: "Cream logo transfer sticker. 3 x 3 inches",
            image: "/assets/store/decals/birblogodecal.png",
            price: 6.5,
            quantity: 7,
        },

    ]

    // --- Insert / upsert each product ---
    for (const p of products) {
        const product = await prisma.product.upsert({
            where: { priceId: p.priceId },
            update: {
                name: p.name,
                slug: p.slug,
                description: p.description,
                image: p.image,
                price: p.price,
            },
            create: {
                name: p.name,
                slug: p.slug,
                priceId: p.priceId,
                description: p.description,
                image: p.image,
                price: p.price,
            },
        })

        // Upsert inventory
        await prisma.inventory.upsert({
            where: { productId: product.id },
            update: { quantity: p.quantity },
            create: {
                productId: product.id,
                quantity: p.quantity,
            },
        })

        console.log(`Seeded: ${p.name}`)
    }
}

main()
    .then(() => {
        console.log("Inventory seed completed.")
        process.exit(0)
    })
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })