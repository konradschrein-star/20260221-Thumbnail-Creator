import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/core-linux-x64-gnu',
      'node_modules/@swc/core-linux-x64-musl',
      'node_modules/@esbuild/linux-x64',
      '**/.next/cache/**',
      '**/.git/**',
    ],
  },
  // Externalize native modules for serverless deployment (Next.js 15.5+)
  serverExternalPackages: ['argon2', 'sharp'],
};

export default nextConfig;
