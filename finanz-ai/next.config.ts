import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Isolate from the parent Peugeot lockfile/workspace
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
