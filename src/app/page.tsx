// // src/app/page.tsx
// import Composer from "@/components/Composer";
// import type { Config } from "@/components/Composer";
// import traits from "@/data/traits.json";
// import Link from "next/link";

// export default function Page() {
//   // Tell TS that the JSON matches Composer's Config shape
//   const config = traits as unknown as Config;



//   return (

//     <main className="min-h-dvh text-neutral-900">
//       {/* Header */}
//       {/* <header className="border-b bg-[#dddddd]">
//         <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
//           <h1 className="text-2xl font-semibold tracking-tight">Birbish Wallpapers</h1>
//           <nav className="text-sm text-neutral-600">
//             <Link href="/banner" className="btn btn-ghost">X Banner Builder</Link>
//             <a href="https://genmerch.webflow.io" className="hover:underline">
//               Generational Merch
//             </a>
//           </nav>
//         </div>
//       </header> */
//       }


//       {/* Content */}
//       <div className="mx-auto max-w-6xl px-4 py-8">
//         <div className="mb-6">
//           <p className="text-neutral-600">
//             Layer backgrounds, birds, and traits to create a birbish wallpaper.
//           </p>
//         </div>

//         <Composer config={config} />
//       </div>

//       {/* Footer */}
//       <footer className="border-t mt-12">
//         <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-neutral-500">
//           © {new Date().getFullYear()} Generational Merch is not affiliated with Moonbirds or Orange Cap Games.
//         </div>
//       </footer>
//     </main>
//   );
// }


// src/app/page.tsx
import Composer from "@/components/Composer";
import type { Config } from "@/components/Composer";
import traits from "@/data/traits.json";

export default function Page() {
  const config = traits as unknown as Config;

  return (
    <main className="p-4 md:p-6">
      <h1 className="text-lg font-semibold mb-4">Wallpaper Builder</h1>

      {/* optional short blurb, keep or remove */}
      {/* <p className="text-sm text-neutral-600 mb-4">
        Layer backgrounds, birds, and traits to create a birbish wallpaper.
      </p> */}

      <Composer config={config} />

      {/* Footer */}
       <footer className="border-t mt-12">
         <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-neutral-500">
           © {new Date().getFullYear()} Generational Merch is not affiliated with Moonbirds or Orange Cap Games        </div>
      </footer>
    </main>


  );
}



