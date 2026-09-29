import type { Metadata } from "next";
import CreditChecksClient from "./CreditChecksClient";

export const metadata: Metadata = {
  title: "Credit Checks",
  description: "Compose and save a Credit Check by token ID.",
};

export default function CreditChecksPage() {
  return (
    <section className="min-h-screen bg-white text-black">
      <CreditChecksClient />
    </section>
  );
}
