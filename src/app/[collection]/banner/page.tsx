// src/app/[collection]/banner/page.tsx
import BannerComposer from "@/components/BannerComposer";
import { isKnownCollection, type CollectionId } from "@/lib/getCollection";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;

  if (!isKnownCollection(collection)) {
    notFound();
  }

  if ((collection as CollectionId) === "moonbirds") {
    return <BannerComposer />;
  }

  // Glyders (and others): Coming soon
  return (
    <div className="mx-auto max-w-3xl p-8 text-center">
      <h1 className="text-2xl font-semibold mb-2 capitalize">{collection} Banners</h1>
      <p className="text-neutral-600">Coming soon.</p>
    </div>
  );
}