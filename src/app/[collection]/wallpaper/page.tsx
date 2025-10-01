// src/app/[collection]/wallpaper/page.tsx
import { notFound } from "next/navigation";
import Composer from "@/components/Composer";
import { loadCollection, isKnownCollection } from "@/lib/getCollection";

// If your project's Next types expect Promise-like params, type it like this:
type ParamsPromise = Promise<{ collection: string }>;

export default async function Page({ params }: { params: ParamsPromise }) {
  const { collection } = await params; // <-- await the params

  if (!isKnownCollection(collection)) {
    notFound();
  }

  const { meta, config } = await loadCollection(collection);

  return (
    <main className="min-h-dvh text-neutral-900">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">
          {meta.name} Wallpaper Builder
        </h1>
        <Composer meta={meta} config={config as any} />
      </div>

      <footer className="border-t mt-12">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-neutral-500">
          © {new Date().getFullYear()} Generational Merch is not affiliated with
          Moonbirds or Orange Cap Games.
        </div>
      </footer>
    </main>
  );
}

// import { loadCollection, isKnownCollection } from "@/lib/getCollection";
// import Composer from "@/components/Composer";
// import type { CollectionConfig } from "@/types/collections";
// import { notFound } from "next/navigation";

// type Params = { collection: string };

// export default async function Page({ params }: { params: Params }) {
//   const { collection } = params;
//   if (!isKnownCollection(collection)) notFound();

//   const { meta, config } = await loadCollection(collection);

//   // Composer already accepts your existing Config shape
//   const cfg = config as unknown as CollectionConfig;

//   return (
//     <main className="min-h-dvh text-neutral-900">
//       <div className="mx-auto max-w-6xl px-4 py-8">
//         <h1 className="text-2xl font-semibold mb-4">
//           {meta.name} Wallpaper Builder
//         </h1>

//         {/* You can pass meta if you want feature gating inside Composer */}
//         <Composer meta={meta} config={cfg as any} />
//       </div>
//    {/* Footer */}
// <footer className="border-t mt-12">
// <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-neutral-500">
// © {new Date().getFullYear()} Generational Merch is not affiliated with Moonbirds or Orange Cap Games.
// </div>
// </footer>
//     </main>
//   );
// }