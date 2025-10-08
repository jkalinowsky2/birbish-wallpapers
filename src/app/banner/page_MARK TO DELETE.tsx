import { loadCollection, isKnownCollection, type CollectionId } from "@/lib/getCollection";
import { loadBanner } from "@/lib/getBanner"; // <-- NEW
import BannerComposer from "@/components/BannerComposer";
import ComingSoon from "@/components/ComingSoon";

type PageProps = { params: { collection: string } };

export default async function Page({ params }: PageProps) {
  const id = params.collection as CollectionId;

  if (!isKnownCollection(id)) {
    return <div className="max-w-3xl mx-auto p-6">Unknown collection.</div>;
  }

  // Coming soon collections
  if (id === "glyders" /* || id === "gobs" */) {
    const { meta } = await loadCollection(id);
    return <ComingSoon label={`${meta.name} — Banners`} />;
  }

  const [{ meta, config }, banner] = await Promise.all([
    loadCollection(id),
    loadBanner(id), // <-- NEW
  ]);

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6">
      <h1 className="text-xl font-semibold mb-4">{meta.name} — Banners</h1>
      <BannerComposer meta={meta} config={config} banner={banner} /> {/* <-- pass banner */}
    </main>
  );
}