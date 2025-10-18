// src/app/page.tsx
import Link from "next/link";
import Image from "next/image";

const heroImages = [
  "/hero/birbish-2.jpg",
  "/hero/birbish-5.jpg",
  "/hero/birbish-4.jpg",
  "/hero/birbish-3.jpg", // remove if you want only 3
];

const collections = [
  { id: "moonbirds", name: "Moonbirds", cover: "/collections/moonbirds/cover.png", blurb: "Classic birbs — build wallpapers & banners." },
  { id: "glyders", name: "NightGlyders", cover: "/collections/glyders/cover.png", blurb: "Glide into custom looks and layouts." },
  { id: "trenchers", name: "Trenchers on Ape", cover: "/collections/trenchers/cover.png", blurb: "Pixel-perfect Trenchers, ready to compose." },
];

export default function HomePage() {
  return (
    <main className="min-h-dvh text-neutral-900">
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
          <div className="relative w-full rounded-lg overflow-hidden border shadow-sm mb-4">
            <div className="relative w-full aspect-[16/6] md:aspect-[16/5] lg:h-[380px]">
              <Image
                src="/hero/birbish-wide.jpg"
                alt="Birbish Hero"
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
            </div>
          </div>

          {/* Grid of 4 square images */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {["/hero/birbish1.jpg", "/hero/birbish2.jpg", "/hero/birbish3.jpg", "/hero/birbish4.jpg"].map(
              (src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border shadow-sm">
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
              Cheers <br /> — JK
            </p>
          </div>
        </div>
      </section>

      {/* Collections grid (unchanged) */}
      <section id="collections" className="bg-[#f7f7f7]">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-xl font-semibold mb-6">Collections</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => (
              <div key={c.id} className="rounded-2xl overflow-hidden border bg-white shadow-sm flex flex-col">
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

      <footer className="border-t mt-12">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-neutral-500">
          © {new Date().getFullYear()} Generational Merch — not affiliated with Moonbirds or Orange Cap Games.
        </div>
      </footer>
    </main>
  );
}

// // src/app/page.tsx
// import Link from "next/link";
// import Image from "next/image";

// const collections = [
//   {
//     id: "moonbirds",
//     name: "Moonbirds",
//     cover: "/collections/moonbirds/cover.png",
//     blurb: "Classic birbs — build wallpapers & banners.",
//   },
//   {
//     id: "glyders",
//     name: "NightGlyders",
//     cover: "/collections/glyders/cover.png",
//     blurb: "Glide into custom looks and layouts.",
//   },
//   {
//     id: "trenchers",
//     name: "Trenchers on Ape",
//     cover: "/collections/trenchers/cover.png",
//     blurb: "Pixel-perfect Trenchers, ready to compose.",
//   },
//   // Add Gobs or others as you enable them:
//   // {
//   //   id: "gobs",
//   //   name: "Gobs",
//   //   cover: "/collections/gobs/cover.jpg",
//   //   blurb: "Goblins with style.",
//   // },
// ];

// export default function HomePage() {
//   return (
//     <main className="min-h-dvh text-neutral-900">
//       {/* Hero */}
//       <section className="bg-white">
//         <div className="mx-auto max-w-6xl px-4 py-16 md:py-0">
//           <h1 className="text-3xl md:text-5xl font-bold tracking-tight md:py-10 ">
//             Generational Merch
//           </h1>
//           <div className="mx-auto max-w-6xl px-2 py-0">
//             <p className="text-neutral-700 leading-relaxed">
//               {/* Welcome to <strong>genmerch.xyz</strong> — a simple, fast way to build
//             custom wallpapers and banners using on-chain collections. Pick a background,
//             add glyphs or overlays, drop in your token ID, and download in one click. */}
//               Welcome to Generational Merch, your (future) source for high-quality customer merch for your NFTs. We&apos;re working on building out the tools and products to show off your
//               favorite NFTs with physical products. Custom prints, skateboard decks, and more coming soon.
//               <br />
//               <br />

//               For now, we&apos;ve built out some fun tools to create custom backgrounds for your phone, tablet, computer, or to rock as a pfp. Check out the
//               wallpaper builder to try these out, or head over the banner builders to create the perfect banner for your X profile and rep your community.

//               <br />
//               <br />

//               Have fun, and follow {" "}<a
//                 href="https://x.com/_genmerch"
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="text-blue-600 hover:underline"
//               >Generational Merch</a>{" "}for updates as we add more collections and physicals! If you&apos;re a founder and want to add your
//               collection to the builders, hit me up {" "}<a
//                 href="https://x.com/_jknft_"
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="text-blue-600 hover:underline"
//               >@_jknft_</a>{" "} on X and we&apos;ll talk.

//               <br />
//               <br />
//               Cheers <br />
//              -JK

//             </p>
//           </div>
//           {/* <p className="mt-4 text-neutral-600 max-w-2xl">
//             Create beautiful wallpapers and banners from your favorite collections.
//           </p>
//           <div className="mt-6 flex gap-3">
//             <Link href="/moonbirds/wallpaper" className="btn">
//               Try a Builder
//             </Link>
//             <a href="#collections" className="btn btn-ghost">
//               Browse Collections
//             </a>
//           </div> */}
//         </div>
//       </section>

//       {/* Welcome paragraph */}
//       <section className="border-b bg-white">
//         <div className="mx-auto max-w-6xl px-4 py-5">
//           <p className="text-neutral-700 leading-relaxed">
//             {/* Welcome to <strong>genmerch.xyz</strong> — a simple, fast way to build
//             custom wallpapers and banners using on-chain collections. Pick a background,
//             add glyphs or overlays, drop in your token ID, and download in one click. */}
//           </p>
//         </div>
//       </section>

//       {/* Collections grid */}
//       <section id="collections" className="bg-white">
//         <div className="mx-auto max-w-6xl px-4 py-12">
//           <h2 className="text-xl font-semibold mb-6">Collections</h2>

//           <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
//             {collections.map((c) => (
//               <div
//                 key={c.id}
//                 className="rounded-2xl overflow-hidden border bg-white shadow-sm flex flex-col"
//               >
//                 <div className="relative w-full aspect-[1/1]">
//                   <Image
//                     src={c.cover}
//                     alt={`${c.name} cover`}
//                     fill
//                     className="object-cover"
//                     sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
//                     priority={false}
//                   />
//                 </div>

//                 <div className="p-4 flex-1 flex flex-col">
//                   <h3 className="text-lg font-semibold">{c.name}</h3>
//                   {/* <p className="text-sm text-neutral-600 mt-1 flex-1">{c.blurb}</p> */}

//                   <div className="mt-4 grid grid-cols-2 gap-2">
//                     <Link href={`/${c.id}/wallpaper`} className="btn">
//                       Wallpaper
//                     </Link>
//                     <Link href={`/${c.id}/banner`} className="btn">
//                       Banner
//                     </Link>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>

//         </div>
//       </section>

//       {/* Footer (optional keep same) */}
//       <footer className="border-t mt-12">
//         <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-neutral-500">
//           © {new Date().getFullYear()} Generational Merch — not affiliated with
//           Moonbirds or Orange Cap Games.
//         </div>
//       </footer>
//     </main>
//   );
// }

// // // src/app/page.tsx
// // import Composer, { type ComposerConfig } from "@/components/Composer";
// // import traits from "@/data/traits.json";
// // import { redirect } from "next/navigation";

// // export default function Page() {
// //   redirect("/moonbirds/wallpaper");
// // }

