"use client";

import Image from "next/image";
import { useState, useMemo, useCallback, useEffect } from "react";

export default function GalleryClient({ images }: { images: string[] }) {
  const hasImages = images && images.length > 0;
  const [selected, setSelected] = useState<number>(0);

  const current = useMemo(
    () => (hasImages ? images[selected] : null),
    [images, selected, hasImages]
  );

  const prev = useCallback(() => {
    setSelected((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const next = useCallback(() => {
    setSelected((i) => (i + 1) % images.length);
  }, [images.length]);

  const onThumbClick = useCallback((idx: number) => {
    setSelected(idx);
    if (window.innerWidth < 768) window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  if (!hasImages) {
    return (
      <p className="text-neutral-600">
        Drop some images into <code>/public/gallery</code> and refresh.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Featured image with overlay arrows */}
      <div className="relative w-full rounded-xl overflow-hidden border bg-white shadow-sm group">
        <div className="relative w-full aspect-[16/10] md:aspect-[16/9]">
          {current && (
            <Image
              src={current}
              alt="Selected"
              fill
              className="object-cover"
              sizes="(min-width:1024px) 1000px, 100vw"
              priority
            />
          )}
        </div>

        {/* Left arrow */}
        <button
          type="button"
          onClick={prev}
          aria-label="Previous image"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white shadow
                     flex items-center justify-center transition opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" className="text-neutral-800">
            <path fill="currentColor" d="M15.41 7.41L14 6l-6 6l6 6l1.41-1.41L10.83 12z" />
          </svg>
        </button>

        {/* Right arrow */}
        <button
          type="button"
          onClick={next}
          aria-label="Next image"
          className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white shadow
                     flex items-center justify-center transition opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" className="text-neutral-800">
            <path fill="currentColor" d="M8.59 16.59L10 18l6-6l-6-6l-1.41 1.41L13.17 12z" />
          </svg>
        </button>
      </div>

      {/* Thumbnails: smaller & denser */}
      <div className="grid gap-2 sm:gap-2 grid-cols-4 md:grid-cols-8 lg:grid-cols-10">
        {images.map((src, i) => {
          const isActive = i === selected;
          return (
            <button
              key={`${src}-${i}`}
              className={`group relative w-full aspect-square rounded-lg overflow-hidden border bg-white shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         ${isActive ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => onThumbClick(i)}
              aria-label={`Select image ${i + 1}`}
              title={`Image ${i + 1}`}
            >
              <Image
                src={src}
                alt={`Thumb ${i + 1}`}
                fill
                className="object-cover group-hover:opacity-90 transition"
                sizes="(min-width:1024px) 100px, (min-width:768px) 12vw, 22vw"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}