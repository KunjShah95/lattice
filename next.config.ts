import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Favicon proxy: normalises third-party favicons to a consistent size
        // so a missing or oddly-shaped icon can't break the row rhythm.
        protocol: "https",
        hostname: "www.google.com",
        pathname: "/s2/favicons",
      },
    ],
  },
};

export default nextConfig;
