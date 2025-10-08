// src/app/[collection]/banner/page.tsx

import { loadCollection, isKnownCollection } from "@/lib/getCollection";
import { loadBanner } from "@/lib/getBanner";
import BannerComposer from "@/components/BannerComposer";

export default async function Page({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params; // 👈 async params
  const id = collection;

  if (!isKnownCollection(id)) {
    return <div className="max-w-3xl mx-auto p-6">Unknown collection.</div>;
  }

  // // If you still gate some collections:
  // if (id === "glyders_coming_soon" /* or whatever check you use */) {
  //   const { meta } = await loadCollection(id);
  //   return (
  //     <div className="max-w-3xl mx-auto p-6">
  //       <h1 className="text-xl font-semibold mb-2">{meta.name} — Banners</h1>
  //       <p>We’re finishing this builder. Check back shortly!</p>
  //     </div>
  //   );
  // }

  const [{ meta, config }, banner] = await Promise.all([
    loadCollection(id),
    loadBanner(id),
  ]);

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6">
      <h1 className="text-xl font-semibold mb-4">{meta.name} — Banners</h1>
      <BannerComposer meta={meta} config={config} banner={banner} />
    </main>
  );
}

// // src/app/[collection]/banner/page.tsx
// import { loadCollection, isKnownCollection, type CollectionId } from "@/lib/getCollection";
// import { loadBanner } from "@/lib/getBanner";
// import BannerComposer from "@/components/BannerComposer";
// import ComingSoon from "@/components/ComingSoon";

// type PageProps = { params: { collection: string } };

// export default async function Page({ params }: PageProps) {
//   const id = params.collection as CollectionId;

//   if (!isKnownCollection(id)) {
//     return <div className="max-w-3xl mx-auto p-6">Unknown collection.</div>;
//   }

//   // Coming soon collections
//   // if (id === "glyders" /* || id === "gobs" */) {
//   //   const { meta } = await loadCollection(id);
//   //   return <ComingSoon label={`${meta.name} — Banners`} />;
//   // }

//   const [{ meta, config }, banner] = await Promise.all([
//     loadCollection(id),
//     loadBanner(id),
//   ]);

//   return (
//     <main className="max-w-6xl mx-auto p-4 md:p-6">
//       <h1 className="text-xl font-semibold mb-4">{meta.name} — Banners</h1>
//       <BannerComposer meta={meta} config={config} banner={banner} />
//     </main>
//   );
// }