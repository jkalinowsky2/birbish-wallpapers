// app/gallery/page.tsx
import fs from "fs";
import path from "path";
import GalleryClient from "./GalleryClient";

const GALLERY_DIR = path.join(process.cwd(), "public", "gallery");
const ALLOWED = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

async function getImages(): Promise<string[]> {
  const files = await fs.promises.readdir(GALLERY_DIR).catch(() => []);
  return files
    .filter((f) => ALLOWED.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => `/gallery/${f}`);
}

export default async function GalleryPage() {
  const images = await getImages();

  return (
    <main className="min-h-dvh text-neutral-900">
      <section className="bg-[#f7f7f7]">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">Gallery</h1>
          <GalleryClient images={images} />
        </div>
      </section>
    </main>
  );
}