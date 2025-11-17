// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Merriweather } from "next/font/google";
import { Web3Provider } from "@/components/Web3Provider";

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
      <body
        className={`${merriweather.variable} font-merriweather min-h-screen bg-[#f7f7f7] text-neutral-900`}
      >
        <Web3Provider>
          <SiteHeader />
          <main className="mx-auto max-w-6xl px-4 md:px-6 pt-0 pb-6">{children}</main>
          <SiteFooter />
        </Web3Provider>
      </body>
    </html>
  );
}