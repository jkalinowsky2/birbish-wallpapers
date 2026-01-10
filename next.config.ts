// console.log("🧩 Starting Next.js dev server...");

// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;


//WAS WORKING
// import type { NextConfig } from 'next'

// const nextConfig: NextConfig = {
//   images: {
//     remotePatterns: [
//       {
//         protocol: 'https',
//         hostname: 'pub-64564156afab49558e441af999f4c356.r2.dev',
//         pathname: '/**',
//       },
//       {
//         protocol: 'https',
//         hostname: 'pub-7608f9274bd54b35954a4c301e06a447.r2.dev',
//         pathname: '/**',
//       },
//       {
//         protocol: 'https',
//         hostname: 'pub-4c3e2129a77841fd8e20ee10a3d9ff99.r2.dev',
//         pathname: '/**',
//       },
//     ],
//   },
// }

// export default nextConfig

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-64564156afab49558e441af999f4c356.r2.dev",
        pathname: "/**",
      },
      { protocol: 'https', hostname: 'proof-nft-image.imgix.net' },
            {
        protocol: 'https',
        hostname: 'pub-7608f9274bd54b35954a4c301e06a447.r2.dev', //Glyders
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
