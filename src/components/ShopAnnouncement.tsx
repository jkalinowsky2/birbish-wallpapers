"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const STORAGE_KEY = "genmerch_shop_announcement_dismissed";

export function ShopAnnouncement() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setOpen(true);
  }, []);

  const handleClose = () => {
    setOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "true");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          ✕
        </button>

        {/* Your image */}
        <div className="mb-4 flex justify-center">
          <Image
            src="/assets/images/grandopening.png"
            alt="Sticker Shop Grand Opening"
            width={400}
            height={300}
            className="rounded-lg"
          />
        </div>

        <h2 className="mb-2 text-xl font-semibold text-gray-900">
          Sticker shop is now open 🎉
        </h2>

        <p className="mb-4 text-sm text-gray-600">
          GenMerch is live! Browse the new Moonbird stickers and grab yours
          before this first batch sells out.
        </p>

        <div className="flex gap-3">
          <a
            href="/shop"
            onClick={handleClose}
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
          >
            View stickers
          </a>

          <button
            onClick={handleClose}
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}