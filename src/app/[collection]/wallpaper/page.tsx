// src/app/[collection]/wallpaper/page.tsx
import { notFound } from "next/navigation";
import { loadCollection, isKnownCollection } from "@/lib/getCollection";
import Composer from "@/components/Composer";

type RouteParams = { collection: string };

export default async function Page({
  params,
}: {
  params: Promise<RouteParams>;   // <-- params is a Promise
}) {
  const { collection } = await params; // <-- await it

  if (!isKnownCollection(collection)) notFound();

  const { meta, config } = await loadCollection(collection);

  return (
    <main className="min-h-dvh text-neutral-900">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">{meta.name} Wallpaper Builder</h1>
        <Composer meta={meta} config={config} />
      </div>
      <footer className="border-t mt-12">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-neutral-500">
          © {new Date().getFullYear()} Generational Merch is not affiliated with Moonbirds or Orange Cap Games.
        </div>
      </footer>
    </main>
  );
}

// // src/app/[collection]/wallpaper/page.tsx
// import { notFound } from "next/navigation";
// import { loadCollection, isKnownCollection } from "@/lib/getCollection";
// import Composer from "@/components/Composer";

// type RouteParams = { collection: string };

// export default async function Page({ params }: { params: RouteParams }) {
//   const { collection } = params;

//   if (!isKnownCollection(collection)) notFound();

//   const { meta, config } = await loadCollection(collection);

//   return (
//     <main className="min-h-dvh text-neutral-900">
//       <div className="mx-auto max-w-6xl px-4 py-8">
//         <h1 className="text-2xl font-semibold mb-4">
//           {meta.name} Wallpaper Builder
//         </h1>
//         <Composer meta={meta} config={config} />
//       </div>

//       <footer className="border-t mt-12">
//         <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-neutral-500">
//           © {new Date().getFullYear()} Generational Merch is not affiliated with
//           Moonbirds or Orange Cap Games.
//         </div>
//       </footer>
//     </main>
//   );
// }

