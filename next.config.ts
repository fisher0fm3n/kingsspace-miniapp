import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This app lives in a subfolder of a larger repo; pin the tracing root so
  // Next doesn't get confused by the parent project's lockfile.
  outputFileTracingRoot: __dirname,
  // The app uses plain <img> for third-party CDN thumbnails on purpose; skip
  // the eslint pass at build time (no eslint plugin is configured here).
  eslint: { ignoreDuringBuilds: true },
  images: {
    // Remote media/thumbnails come from many CDNs; allow all hosts.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
