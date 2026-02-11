// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Merriweather } from "next/font/google";
import { Web3Provider } from "@/components/Web3Provider";
import { UnderConstruction } from "@/components/BackSoonish";

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
  // expects NEXT_PUBLIC_SITE_DOWN="true"
  const siteDown = process.env.NEXT_PUBLIC_SITE_DOWN === "true";

  return (
    <html lang="en">
      <body
        className={`${merriweather.variable} font-merriweather min-h-screen bg-[#fafafa] text-neutral-900`}
      >
        <Web3Provider>
          {siteDown ? (
            // FULL BLEED – no width limits, no padding
            <main className="min-h-screen w-screen bg-black">
              <UnderConstruction />
            </main>
          ) : (
            <>
              <SiteHeader />
              <main className="mx-auto max-w-6xl px-4 md:px-6 pt-0 pb-6">
                {children}
              </main>
              <SiteFooter />
            </>
          )}
        </Web3Provider>
      </body>
    </html>
  );
}



// // src/app/layout.tsx
// import "./globals.css";
// import type { Metadata } from "next";
// import SiteHeader from "@/components/SiteHeader";
// import SiteFooter from "@/components/SiteFooter";
// import { Merriweather } from "next/font/google";
// import { Web3Provider } from "@/components/Web3Provider";
// import { UnderConstruction } from "@/components/BackSoonish"


// const merriweather = Merriweather({
//   subsets: ["latin"],
//   weight: ["300", "400", "700"],
//   variable: "--font-merriweather",
// });

// export const metadata: Metadata = {
//   title: "Generational Merch",
//   description: "Wallpapers & X banners for your collection",
// };

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en">
//       <body
//         className={`${merriweather.variable} font-merriweather min-h-screen bg-[#fafafa] text-neutral-900`}
//       >
//         <Web3Provider>
//           <SiteHeader />
//           <main className="mx-auto max-w-6xl px-4 md:px-6 pt-0 pb-6">{children}</main>
//           <SiteFooter />
//         </Web3Provider>
//       </body>
//     </html>
//   );
// }