import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers are handled by middleware.ts to avoid duplication

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 768, 1024, 1280, 1600],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Bundle analyzer (for production analysis)
  experimental: {
    optimizePackageImports: ['react-dropzone'],
  },

  // Compression
  compress: true,

  // PoweredByHeader removal
  poweredByHeader: false,
};

export default nextConfig;
