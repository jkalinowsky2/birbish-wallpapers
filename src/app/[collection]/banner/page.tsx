// src/app/[collection]/banner/page.tsx
import BannerComposer from "@/components/BannerComposer";
import { isKnownCollection } from "@/lib/getCollection";
import { notFound } from "next/navigation";
import Link from "next/link";

type PageProps = { params: { collection: string } };

export default function Page({ params }: PageProps) {
    const id = params.collection;

    if (!isKnownCollection(id)) notFound();

    if (id === "glyders") {
        return (
            <main className="mx-auto max-w-6xl p-4 md:p-6">
                <h1 className="text-2xl font-semibold mb-3">Glyders Banner Builder</h1>
                <div className="rounded-2xl border bg-white shadow-sm p-6">
                    <p className="text-lg font-medium">Coming Soon</p>
                    <p className="text-sm text-neutral-600 mt-1">
                        We’re putting the finishing touches on the Glyders banner builder.
                    </p>
                    <div className="mt-4">
                        <Link href="/" className="underline text-neutral-700">
                            ← Back to home
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    // Default: moonbirds works today
    return (
        <main className="mx-auto max-w-6xl p-4 md:p-6">
            <h1 className="text-2xl font-semibold mb-3">Moonbirds Banner Builder</h1>
            <BannerComposer />
        </main>
    );
}