import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    return [
      { source: "/women", destination: "/category/women" },
      { source: "/men", destination: "/category/men" },
      { source: "/accessories", destination: "/category/accessories" },
      { source: "/shoes", destination: "/category/shoes" },
      { source: "/bags", destination: "/category/bags" },
      { source: "/jewelry", destination: "/category/jewelry" },
    ];
  },
};

export default nextConfig;
