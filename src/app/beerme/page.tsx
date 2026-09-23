import type { Metadata } from "next";
import BeerMeGame from "./BeerMeGame";

export const metadata: Metadata = {
  title: "Beer Me | Generational Merch",
  description: "A Moonbirds projectile game inspired by classic artillery games.",
};

export default function BeerMePage() {
  return (
    <main className="min-h-dvh text-neutral-900">
      <section className="beerme-page w-screen relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw]">
        <h1 className="sr-only">Beer Me</h1>
        <div className="px-2 py-3 md:px-5 md:py-5">
          <BeerMeGame />
        </div>
      </section>
    </main>
  );
}
