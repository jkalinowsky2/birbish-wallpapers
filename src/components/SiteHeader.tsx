"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={[
        "px-3 py-2 rounded-lg text-sm font-medium transition",
        active
          ? "bg-neutral-900 text-white shadow-sm"
          : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-black/10 backdrop-blur bg-white/70">
      <div className="mx-auto max-w-6xl px-4 md:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src="/assets/gmlong.png"
            alt="Birbish Logo"
            width={120}  // adjust as needed
            height={32}  // adjust as needed
            className="h-8 w-auto"
            priority
          />
        </Link>

        <nav className="flex items-center gap-2">
          <NavLink href="/">Moonbirds</NavLink>
          <NavLink href="/glyders/wallpaper">Glyders</NavLink>
          <NavLink href="/banner">X Banner Builder</NavLink>
        </nav>
      </div>
    </header>
  );
}