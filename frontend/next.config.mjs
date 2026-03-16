/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Fix dev server compilation hangs caused by lucide-react massive barrel file
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // Image optimization
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },

  // Rewrites for local development and path unification
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8068"}/api/:path*`,
      },
      {
        source: "/research/video_analysis/:path*",
        destination: "/archetypes/:path*",
      },
    ];
  },
};

export default nextConfig;
