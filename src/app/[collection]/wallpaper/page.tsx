// src/app/[collection]/wallpaper/page.tsx
import { notFound } from "next/navigation";
import { loadCollection, isKnownCollection } from "@/lib/getCollection";
import Composer from "@/components/Composer";

type RouteParams = { collection: string };

export default async function Page({
  params,
}: {
  params: Promise<RouteParams>; // Next 15: params is a Promise
}) {
  const { collection } = await params;

  if (!isKnownCollection(collection)) notFound();

  const { meta, config } = await loadCollection(collection);

  // Derive the exact config prop type Composer expects (no explicit any)
  type ComposerConfigProp = Parameters<typeof Composer>[0]["config"];
  const composerConfig = config as ComposerConfigProp;

  return (
    <main className="min-h-dvh text-neutral-900">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">
          {meta.name} Wallpaper Builder
        </h1>
        <Composer meta={meta} config={composerConfig} />
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

// // src/app/[collection]/wallpaper/page.tsx
// import { notFound } from "next/navigation";
// // import Composer from "@/components/Composer";
// import Composer, { ComposerConfig } from "@/components/Composer";
// import { loadCollection, isKnownCollection } from "@/lib/getCollection";

// // If your project's Next types expect Promise-like params, type it like this:
// type ParamsPromise = Promise<{ collection: string }>;

// type Params = { collection: string };

// export default async function Page({ params }: { params: Params }) {
//   const { collection } = params;
//   if (!isKnownCollection(collection)) notFound();

//   const { meta, config } = await loadCollection(collection);
//   return (
//     <main className="min-h-dvh text-neutral-900">
//       <div className="mx-auto max-w-6xl px-4 py-8">
//         <h1 className="text-2xl font-semibold mb-4">{meta.name} Wallpaper Builder</h1>
//         <Composer meta={meta} config={config} />
//       </div>
//       <footer className="border-t mt-12">
//         <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-neutral-500">
//           © {new Date().getFullYear()} Generational Merch is not affiliated with Moonbirds or Orange Cap Games.
//         </div>
//       </footer>
//     </main>
//   );
// }
