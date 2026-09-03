import type { Metadata } from "next";
import GamesClient from "./GamesClient";

export const metadata: Metadata = {
  title: "Games | Generational Merch",
  description: "Mini games based on the Moonbirds IP.",
};

export default function GamesPage() {
  return (
    <main className="min-h-dvh text-neutral-900">
      <section className="w-screen relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] bg-neutral-50">
        <div className="bg-[#faf7f2]">
          <div className="mx-auto max-w-6xl px-4 py-3 md:px-6 md:py-6">
            <h1 className="text-2xl font-black tracking-tight md:text-4xl">
              Birb Games
            </h1>
            <p className="mt-3 hidden max-w-2xl text-sm leading-6 text-neutral-700 sm:block md:text-base">
              Mini games built to add another distraction to your life.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-3 py-3 md:px-6 md:py-6">
          <GamesClient />
        </div>
      </section>
    </main>
  );
}
