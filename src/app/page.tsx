// src/app/page.tsx
import Link from "next/link";
import Image from "next/image";

const heroImages = [
  "/assets/images/hero/birbish2.jpg",
  "/assets/images/hero/birbish5.jpg",
  "/assets/images/hero/birbish4.jpg",
  "/assets/images/hero/birbish3.jpg", // remove if you want only 3
];

const collections = [
  { id: "moonbirds", name: "Moonbirds", cover: "/collections/moonbirds/cover.png", blurb: "Classic birbs — build wallpapers & banners." },
  { id: "glyders", name: "NightGlyders", cover: "/collections/glyders/cover.png", blurb: "Glide into custom looks and layouts." },
  { id: "trenchers", name: "Trenchers on Ape", cover: "/collections/trenchers/cover.png", blurb: "Pixel-perfect Trenchers, ready to compose." },
];

export default function HomePage() {
  return (
    <main className="min-h-dvh text-neutral-900">
      {/* Full-width wrapper, same as shop page */}
      <div className="w-screen relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] bg-neutral-50">
        <div className="bg-[#faf7f2] p-0 m-0">
          {/* Hero band */}
          <section className="w-full bg-gradient-to-b from-[#ce0000] to-[#b20000] text-white border-b border-neutral-900">
            <div className="px-4 md:px-8 lg:px-10 pt-8 pb-10 md:pt-10 md:pb-12 lg:pt-16 lg:pb-16">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                Generational Merch
              </h1>

              <p className="mt-3 text-sm md:text-base text-white">
                High-quality custom merch for your NFTs.
              </p>

              <Link href="/shop">
                <div className="inline-flex items-center gap-3 rounded-full bg-black/60 border border-white/10 px-4 py-1.5 text-xs md:text-sm text-neutral-100 mt-8">
                  <span className="font-semibold uppercase tracking-[0.18em] text-[11px] text-[#ffd28f]">
                    OUR SHOP IS OPEN!!
                  </span>
                  <span className="text-[11px] md:text-xs">
                    Check out our new selection of Moonbirds stickers!
                  </span>
                </div>
              </Link>

              {/* Paused message variant – keep commented for later use */}
              {/*
            <div className="inline-flex items-center gap-3 rounded-full bg-black/60 border border-white/10 px-4 py-1.5 text-xs md:text-sm text-neutral-100 mt-8">
              <span className="font-semibold uppercase tracking-[0.18em] text-[11px] text-[#ffd28f]">
                CHECKOUT PAUSED.
              </span>
              <span className="text-[11px] md:text-xs">
                We're currently filling orders. Please check back soon!
              </span>
            </div>
            */}
            </div>
          </section>
        </div>

        {/* Inner content – matches shop page padding & max width */}
        <div className="px-4 md:px-6 lg:px-8 pb-10">
          <div className="max-w-7xl mx-auto space-y-10">
            {/* Top content block: hero images + copy */}
            <section className="pt-8 space-y-6">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start">
                {/* Right: copy in a card, styled like the shop cart */}
                <div className="rounded-lg px-6 py-5 text-sm md:text-base leading-relaxed text-neutral-700">
                  <p>
                    Welcome to Generational&nbsp;Merch, your home for high-quality custom merch
                    designed for NFT communities. We&apos;re building tools and products that bring
                    your NFTs into the physical world: skate decks, stickers, decals, and more
                    coming soon.
                  </p>

                  <p className="mt-4">
                    The Moonbirds shop is now open with a growing catalog of stickers and decals for your laptop, water bottles, bumpers, or anywhere you want to rep your birbs.
                  </p>

                  <p className="mt-4">
                    Also check out our tools to create custom backgrounds for
                    your phone, tablet, computer, or pfp. Try the wallpaper builder,
                    or head to the banner builder to make the perfect X banner.
                  </p>

                  <p className="mt-4">
                    Have fun, and follow{' '}
                    <a
                      href="https://x.com/_genmerch"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Generational&nbsp;Merch
                    </a>{' '}
                    for updates as we add more collections and physicals. 
                    {/* If you&apos;re
                    a founder and want to add your collection to the builders, ping{' '}
                    <a
                      href="https://x.com/_jknft_"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      @_jknft_
                    </a>{' '}
                    on X and we&apos;ll talk. */}
                  </p>

                  <p className="mt-4">
                    Cheers,
                    <br />
                    – JK
                  </p>
                </div>

                {/* Left: hero image + 5 thumbs */}
                <div>
                  {/* Big hero image */}
                  <div className="relative w-full rounded-md overflow-hidden border shadow-sm mb-3">
                    <div className="relative w-full aspect-[16/6] md:aspect-[16/5] lg:h-[380px]">
                      <Image
                        src="/assets/images/hero/birbish-wide.jpg"
                        alt="Birbish Hero"
                        fill
                        className="object-cover"
                        sizes="100vw"
                        priority
                      />
                    </div>
                  </div>

                  {/* Grid of 5 images */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      '/assets/images/hero/birbish.jpg',
                      '/assets/images/MacBook-Office.png',
                      '/assets/images/hero/birbish2.jpg',
                      '/assets/images/Yeti-Office.png',
                      '/assets/images/hero/birbish4.jpg',
                    ].map((src, i) => (
                      <div
                        key={i}
                        className="relative aspect-square rounded-md overflow-hidden border shadow-sm"
                      >
                        <Image
                          src={src}
                          alt={`Birbish ${i + 1}`}
                          fill
                          className="object-cover"
                          sizes="(min-width:1024px) 25vw, 50vw"
                        />
                      </div>
                    ))}
                  </div>
                </div>


              </div>
            </section>

            <section className="w-full h-[15px] bg-gradient-to-b from-[#ce0000] to-[#b20000] border-b border-neutral-900 rounded-full" />

            {/* <section className="
  w-screen h-[15px]
  relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw]
  bg-gradient-to-b from-[#ce0000] to-[#b20000]
"></section> */}

            {/* Collections grid – just bumped to 7xl and shop-style heading */}
            <section id="collections" className="pb-4">
              <h2 className="text-lg font-semibold tracking-wide text-neutral-800 mb-4">
                Wallpaper &amp; Banner Builders
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {collections.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-md overflow-hidden border bg-white shadow-sm flex flex-col"
                  >
                    <div className="relative w-full aspect-[1/1]">
                      <Image
                        src={c.cover}
                        alt={`${c.name} cover`}
                        fill
                        className="object-cover"
                        sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                      />
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="text-md font-semibold">{c.name}</h3>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Link href={`/${c.id}/wallpaper`} className="btn">
                          Wallpaper
                        </Link>
                        <Link href={`/${c.id}/banner`} className="btn">
                          Banner
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}