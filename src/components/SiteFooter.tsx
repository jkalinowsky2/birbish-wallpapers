// src/components/SiteFooter.tsx
import Link from "next/link";
import Image from "next/image";

export default function SiteFooter() {
  return (
    <footer className="border-t mt-12 bg-[#f7f7f7]">
      <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500">
        <p className="mb-3 sm:mb-0 text-center sm:text-left">
          © {new Date().getFullYear()} Generational Merch is not affiliated with{" "}
          Moonbirds or Orange Cap Games.
        </p>

        {/* Social links stacked vertically */}
        <div className="flex flex-col items-center sm:items-end gap-2">
          <Link
            href="https://x.com/_jknft_"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-neutral-600 hover:text-black transition"
          >
            <Image
              src="/icons/x-logo.svg"
              alt="X logo"
              width={16}
              height={16}
              className="inline-block"
            />
            <span>@_jknft_</span>
          </Link>

          <Link
            href="https://x.com/_genmerch"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-neutral-600 hover:text-black transition"
          >
            <Image
              src="/icons/x-logo.svg"
              alt="X logo"
              width={16}
              height={16}
              className="inline-block"
            />
            <span>@_genmerch</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}