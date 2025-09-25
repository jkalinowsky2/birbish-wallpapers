import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Birbish Builders",
  description: "Wallpapers & X banners for your collection",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Global background lives on <body> */}
      <body className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 text-neutral-900">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 md:px-6 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}

// import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
// import "./globals.css";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// export const metadata: Metadata = {
//   title: "Birbish Wallpaper Builder",
//   description: "Created by JK. Create custom Moonbird wallpapers for your phone or tablet",
// };

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <html lang="en">
//       <body
//         className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-page`}
//       >
//         {children}
//       </body>
//     </html>
//   );
// }
