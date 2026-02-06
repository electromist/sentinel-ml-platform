import type { NextConfig } from "next";

// → NEXT.JS CONFIGURATION: React compiler enabled for optimal performance
const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  compress: true,

  experimental: {
    optimizePackageImports: ["@clerk/nextjs", "@aws-sdk/client-s3"],
  },
};

export default nextConfig;
