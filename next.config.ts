import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone output keeps the Docker runtime image small (no node_modules copy).
  output: 'standalone',
  // Native modules must not be bundled by the server compiler.
  serverExternalPackages: ['better-sqlite3', 'sharp'],
  // All images are either local files served by /api/files or URLs the user
  // entered themselves. We never let the optimizer fetch arbitrary remote hosts.
  images: { unoptimized: true },
  eslint: {
    // Linting runs as its own step (`pnpm lint`), not as part of the build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
