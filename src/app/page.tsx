// src/app/page.tsx
import Composer, { type Config } from "@/components/Composer";
import traits from "@/data/traits.json";

export default function Page() {
  // Tell TS that the JSON matches Composer's Config shape
  const config = traits as unknown as Config;

  return (
    <main className="min-h-dvh bg-[#dddddd] text-neutral-900">
      {/* Header */}
      <header className="border-b bg-[#dddddd]">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Birbish Wallpapers</h1>
          <nav className="text-sm text-neutral-600">
            <a href="https://genmerch.webflow.io" className="hover:underline">
              Generational Merch
            </a>
          </nav>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <p className="text-neutral-600">
            Layer backgrounds, birds, and traits to create a birbish wallpaper.
          </p>
        </div>

        <Composer config={config} />
      </div>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-neutral-500">
          © {new Date().getFullYear()} Generational Merch is not affiliated with Moonbirds or Orange Cap Games.
        </div>
      </footer>
    </main>
  );
}

// import Composer, { type Config } from "@/components/Composer";
// import configJson from "@/data/traits.json"; // or wherever you placed it under src/

// export default function Page() {
//   const config = configJson as Config; // type-safe cast, not `any`
//   return (
//     <main className="max-w-6xl mx-auto p-6">
//       <h1 className="text-2xl font-semibold mb-4">Birbish Papers</h1>
//       <Composer config={config} />
//     </main>
//   );
// }


