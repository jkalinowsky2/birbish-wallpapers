// src/app/page.tsx
import Link from "next/link";
import Image from "next/image";

const heroImages = [
  "/assets//images/hero/birbish-2.jpg",
  "/assets//images/hero/birbish-5.jpg",
  "/assets//images/hero/birbish-4.jpg",
  "/assets//images/hero/birbish-3.jpg", // remove if you want only 3
];

const collections = [
  { id: "moonbirds", name: "Moonbirds", cover: "/collections/moonbirds/cover.png", blurb: "Classic birbs — build wallpapers & banners." },
  { id: "glyders", name: "NightGlyders", cover: "/collections/glyders/cover.png", blurb: "Glide into custom looks and layouts." },
  { id: "trenchers", name: "Trenchers on Ape", cover: "/collections/trenchers/cover.png", blurb: "Pixel-perfect Trenchers, ready to compose." },
];

export default function HomePage() {
  return (
    <main className="min-h-dvh text-neutral-900">

                // Full-width wrapper that breaks out of the centered layout
        <div className="w-screen relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] bg-neutral-50">
            <div className="bg-[#faf7f2] p-0 m-0">
                {/* Hero band */}
                <section className="w-full bg-gradient-to-b from-[#ce0000] to-[#b20000] text-white border-b border-neutral-900">
                    <div className="px-4 md:px-8 lg:px-10 pt-8 pb-10 md:pt-10 md:pb-12 lg:pt-16 lg:pb-16">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                            Merch Shop
                        </h1>

                        <p className="mt-3 text-sm md:text-base text-white">
                            Premium die-cut vinyl stickers and decals for water bottles,
                            laptops, and everywhere you rep the birbs.
                        </p>

                        <div
                            className="inline-flex items-center gap-3 rounded-full bg-black/60 border border-white/10
                    px-4 py-1.5 text-xs md:text-sm text-neutral-100 mt-8"
                        >
                            <span className="font-semibold uppercase tracking-[0.18em] text-[11px] text-[#ffd28f]">
                                PRE-ORDER COMING SOON
                            </span>

                            <span className="text-[11px] md:text-xs">
                                Free Moonbird-exclusive holographic sticker with $10+ order.
                            </span>
                        </div>

                        {/* Paused Message */}
                        {/* <div
                            className="inline-flex items-center gap-3 rounded-full bg-black/60 border border-white/10
                    px-4 py-1.5 text-xs md:text-sm text-neutral-100 mt-8"
                        >
                            <span className="font-semibold uppercase tracking-[0.18em] text-[11px] text-[#ffd28f]">
                                CHECKOUT PAUSED. 
                            </span>

                            <span className="text-[11px] md:text-xs">
                                We're currently filling orders. Please check back soon!
                            </span>
                        </div> */}
                        {/* End Paused Message */}

                    </div>
                </section>
            </div>
            </div>
            

      {/* Hero */}
      <section className="bg-[#f7f7f7]">
        <div className="mx-auto max-w-6xl px-4 pt-10 md:pt-12">
          <h1 className="text-center text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Generational Merch
          </h1>
          <h2 className="text-center text-xl md:text-xl tracking-tight mb-10">
              High-quality custom merch for your NFTs.
          </h2>
          {/* Full-width top hero image */}
          <div className="relative w-full rounded-md overflow-hidden border shadow-sm mb-2">
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

          {/* Grid of 4 square images */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {["/assets/images/hero/birbish5.jpg", "/assets/images/MacBook-Office.png","/assets/images/hero/birbish2.jpg", "/assets/images/Yeti-Office.png", "/assets/images/hero/birbish4.jpg"].map(
              (src, i) => (
                <div key={i} className="relative aspect-square rounded-md overflow-hidden border shadow-sm">
                  <Image
                    src={src}
                    alt={`Birbish ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(min-width:1024px) 25vw, 50vw"
                  />
                </div>
              )
            )}
          </div>

          {/* Copy below the images */}
          <div className="w-full px-10 py-10">
            <p className="text-neutral-700 leading-relaxed">
              Welcome to Generational Merch, your (future) source for high-quality custom merch for your NFTs.
              We&apos;re working on building out the tools and products to show off your
              favorite NFTs with physical products. Custom prints, skateboard decks, and more coming soon.
              <br /><br />
              For now, we&apos;ve built some tools to create custom backgrounds for your phone, tablet, computer,
              or pfp. Try the wallpaper builder, or head to the banner builder to make the perfect X banner.
              <br /><br />
              Have fun, and follow{" "}
              <a
                href="https://x.com/_genmerch"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Generational&nbsp;Merch
              </a>{" "}
              for updates as we add more collections and physicals! If you&apos;re a founder and want to add your
              collection to the builders, ping{" "}
              <a
                href="https://x.com/_jknft_"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                @_jknft_
              </a>{" "}
              on X and we&apos;ll talk.
              <br /><br />
              Cheers <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-JK
            </p>
          </div>
        </div>
      </section>

      {/* Collections grid (unchanged) */}
      <section id="collections" className="bg-[#f7f7f7]">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-xl font-semibold mb-6">Wallpaper & Banner Builders</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => (
              <div key={c.id} className="rounded-md overflow-hidden border bg-white shadow-sm flex flex-col">
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
                  <h3 className="text-lg font-semibold">{c.name}</h3>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link href={`/${c.id}/wallpaper`} className="btn">Wallpaper</Link>
                    <Link href={`/${c.id}/banner`} className="btn">Banner</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* <footer className="border-t mt-12">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-neutral-500">
          © {new Date().getFullYear()} Generational Merch — not affiliated with Moonbirds or Orange Cap Games.
        </div>
      </footer> */}
    </main>
  );
}

