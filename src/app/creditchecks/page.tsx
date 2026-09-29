import type { Metadata } from "next";
import CreditChecksClient from "./CreditChecksClient";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const requestedToken = Number((await searchParams).token);
  const token = Number.isInteger(requestedToken) && requestedToken >= 1 && requestedToken <= 122153
    ? requestedToken
    : 1;
  const title = `Credit Check #${token}`;
  const description = `A Credit Check generated from Credit #${token}.`;
  const image = `https://www.genmerch.xyz/api/creditcheck/card?id=${token}`;

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 1200 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function CreditChecksPage() {
  return (
    <section className="min-h-screen bg-white text-black">
      <CreditChecksClient />
    </section>
  );
}
