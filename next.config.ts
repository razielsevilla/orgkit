import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    return [
      {
        source: "/workspace/:id",
        destination: "/org/:id",
      },
      {
        source: "/org/:id/officers",
        destination: "/workspace/:id/officers",
      },
    ];
  },
};

export default nextConfig;
