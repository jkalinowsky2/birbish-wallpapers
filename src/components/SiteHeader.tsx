"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Item = { label: string; href: string };

const WALLPAPER_ITEMS: Item[] = [
  { label: "Moonbirds", href: "/moonbirds/wallpaper" },
  { label: "Glyders", href: "/glyders/wallpaper" },
];

// src/components/SiteHeader.tsx (or wherever)
const BANNER_ITEMS = [
  { label: "Moonbirds", href: "/moonbirds/banner" },
  { label: "Glyders", href: "/glyders/banner" },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileOpenSection, setMobileOpenSection] = useState<"wall" | "ban" | null>(null);

  const linkClasses = (href: string) =>
    `block px-3 py-2 rounded-md text-sm ${pathname?.startsWith(href)
      ? "bg-neutral-900 text-white"
      : "text-neutral-700 hover:bg-neutral-100"
    }`;

  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 md:px-6 h-14 flex items-center justify-between">
        {/* LOGO LINK */}
        <Link href="/" className="flex items-center">
          <Image
            src="/assets/gmlong.png"
            alt="Birbish Logo"
            width={120} // adjust as needed
            height={32}
            className="h-8 w-auto"
            priority
          />
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center gap-2">
          <Dropdown label="Wallpapers" items={WALLPAPER_ITEMS} pathname={pathname} />
          <Dropdown label="Banners" items={BANNER_ITEMS} pathname={pathname} />
        </nav>

        {/* MOBILE TOGGLE */}
        <button
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-neutral-100"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation"
        >
          <span className="text-2xl">☰</span>
        </button>
      </div>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div className="md:hidden border-t">
          <div className="mx-auto max-w-6xl px-2 py-2">
            {/* Wallpapers section */}
            <button
              className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium"
              onClick={() => setMobileOpenSection((s) => (s === "wall" ? null : "wall"))}
            >
              <span>Wallpapers</span>
              <span className="text-neutral-500">{mobileOpenSection === "wall" ? "–" : "+"}</span>
            </button>
            {mobileOpenSection === "wall" && (
              <ul className="mb-2">
                {WALLPAPER_ITEMS.map((it) => (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={linkClasses(it.href)}
                      onClick={() => setMobileOpen(false)}
                    >
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {/* Banners section */}
            <button
              className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium"
              onClick={() => setMobileOpenSection((s) => (s === "ban" ? null : "ban"))}
            >
              <span>Banners</span>
              <span className="text-neutral-500">{mobileOpenSection === "ban" ? "–" : "+"}</span>
            </button>
            {mobileOpenSection === "ban" && (
              <ul className="mb-2">
                {BANNER_ITEMS.map((it) => (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={linkClasses(it.href)}
                      onClick={() => setMobileOpen(false)}
                    >
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

/** Hover dropdown for desktop */
function Dropdown({
  label,
  items,
  pathname,
}: {
  label: string;
  items: Item[];
  pathname?: string | null;
}) {
  return (
    <div className="relative group">
      <button className="px-3 py-2 text-sm rounded-md hover:bg-neutral-100">
        {label}
      </button>
      <div
        className="
          invisible opacity-0 translate-y-1
          group-hover:visible group-hover:opacity-100 group-hover:translate-y-0
          transition-all duration-150
          absolute left-0 mt-2 w-48 rounded-lg border bg-white shadow-lg
          z-40
        "
      >
        <ul className="py-1">
          {items.map((it) => {
            const active = pathname?.startsWith(it.href);
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={`block px-3 py-2 text-sm ${active
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-700 hover:bg-neutral-100"
                    }`}
                >
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
//OLD
// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import Image from "next/image";

// function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
//   const pathname = usePathname();
//   const active = pathname === href;
//   return (
//     <Link
//       href={href}
//       className={[
//         "px-3 py-2 rounded-lg text-sm font-medium transition",
//         active
//           ? "bg-neutral-900 text-white shadow-sm"
//           : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
//       ].join(" ")}
//     >
//       {children}
//     </Link>
//   );
// }

// export default function SiteHeader() {
//   return (
//     <header className="sticky top-0 z-30 w-full border-b border-black/10 backdrop-blur bg-white/70">
//       <div className="mx-auto max-w-6xl px-4 md:px-6 h-14 flex items-center justify-between">
//         <Link href="/" className="flex items-center">
//           <Image
//             src="/assets/gmlong.png"
//             alt="Birbish Logo"
//             width={120}  // adjust as needed
//             height={32}  // adjust as needed
//             className="h-8 w-auto"
//             priority
//           />
//         </Link>

//         <nav className="flex items-center gap-2">
//           <NavLink href="/">Moonbirds</NavLink>
//           <NavLink href="/glyders/wallpaper">Glyders</NavLink>
//           <NavLink href="/banner">X Banner Builder</NavLink>
//         </nav>
//       </div>
//     </header>
//   );
// }