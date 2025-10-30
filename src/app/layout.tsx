import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

import { Merriweather } from "next/font/google";


const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-merriweather",
});

export const metadata: Metadata = {
  title: "Generational Merch",
  description: "Wallpapers & X banners for your collection",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Global background + font */}
      <body
        className={`${merriweather.variable} font-merriweather min-h-screen bg-[#f7f7f7] text-neutral-900`}
      >
        <head>
          <link rel="stylesheet" href="https://use.typekit.net/rtw2rtw.css" />
        </head>
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 md:px-6 py-6">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
