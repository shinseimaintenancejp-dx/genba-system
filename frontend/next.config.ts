import type { NextConfig } from "next";

/**
 * Genba Management System — Next.js 15 Configuration.
 *
 * Key settings:
 * - output: "standalone" for Docker multi-stage production build (TEST§3.2)
 * - Noto Sans JP font optimization
 * - TypeScript strict mode
 * - Japanese locale
 */
const nextConfig: NextConfig = {
  // Standalone output for minimal Docker image (TEST§3.2)
  output: "standalone",

  // TypeScript — strict mode errors fail the build
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint — errors fail the build
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Disable Next.js telemetry
  // (also set via NEXT_TELEMETRY_DISABLED env var in Dockerfile)

  // i18n — Japanese locale (single locale system)
  // Note: Next.js 15 App Router handles locale differently
  // The entire system uses Japanese UI — no locale switching needed

  // Image optimization
  images: {
    // S3-compatible storage domains for presigned URLs
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "*.wasabisys.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Headers — additional security headers (complement Nginx headers)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ];
  },

  // Webpack configuration
  webpack: (config) => {
    // Suppress module not found warnings for optional dependencies
    config.resolve = config.resolve || {};
    return config;
  },

  // Experimental features for Next.js 15
  experimental: {
    // Turbopack is enabled via CLI flag (--turbopack in dev script)
    // Server Components optimizations
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
    ],
  },
};

export default nextConfig;
